/* Импорт мест из Google Maps — два способа ввода (киллер-фича, см. docs/10-backlog.md D).

   POST /api/import/link       { url }   → { found, places:[{name,lat,lng,gmaps}] }
   POST /api/import/screenshot { image } → { found, places:[{name,lat,lng,gmaps}], engine }

   Ссылка (бесплатно, без ключей):
   - короткую (maps.app.goo.gl / goo.gl) разворачиваем по редиректу;
   - из URL одиночного места достаём название (/maps/place/Имя) и коорд. (@lat,lng);
   - из подборки (placelists) — best-effort парсинг названий из HTML.

   Скриншот: Claude-зрение (Haiku, тот же ANTHROPIC_API_KEY) извлекает названия →
   запасной движок OCR.space (бесплатный, флаг IMPORT_OCR_ENGINE=ocrspace + OCR_SPACE_KEY).
   Если ничего не вышло — { found:false } (на клиенте подскажем ввести вручную). */
import { Router } from 'express';
import { initDataAuth } from '../middleware/initData.js';

const router = Router();

const LLM_KEY = process.env.ANTHROPIC_API_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'claude-haiku-4-5-20251001';
const OCR_KEY = process.env.OCR_SPACE_KEY || '';
const IMPORT_ENGINE = process.env.IMPORT_OCR_ENGINE || 'claude'; // 'claude' | 'ocrspace'

const mapsSearch = (q) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);

/** Развернуть короткую ссылку до финального URL. Полную — вернуть как есть. */
async function expand(url) {
  if (!/(maps\.app\.goo\.gl|goo\.gl\/maps|\/url\?)/.test(url)) return url;
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
    return r.url || url;
  } catch {
    return url;
  }
}

/** Достать координаты из полного URL Google Maps. */
function coordsOf(url) {
  const m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  return m ? { lat: parseFloat(m[1]), lng: parseFloat(m[2]) } : { lat: null, lng: null };
}

/** Одиночное место: /maps/place/<Имя>/@lat,lng → [{name,lat,lng,gmaps}]. */
function parsePlace(url) {
  const pm = url.match(/\/maps\/place\/([^/@?]+)/);
  if (!pm) return [];
  const name = decodeURIComponent(pm[1].replace(/\+/g, ' ')).trim();
  if (!name) return [];
  const { lat, lng } = coordsOf(url);
  return [{ name, lat, lng, gmaps: mapsSearch(name) }];
}

/** Подборка: вытащить названия из HTML страницы списка (best-effort). */
async function parseList(url) {
  let html = '';
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ru,en' } });
    html = await r.text();
  } catch {
    return [];
  }
  // На страницах подборок названия мест встречаются в встроенных данных как
  // экранированные строки; берём пары "Имя" рядом с координатами !3d..!4d.
  const out = [];
  const seen = new Set();
  const re = /\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\][^"]*"([^"]{2,80}?)"|"([^"]{2,80}?)"[^]{0,200}?null,null,(-?\d+\.\d+),(-?\d+\.\d+)/g;
  let m;
  while ((m = re.exec(html)) && out.length < 60) {
    const name = (m[3] || m[4] || '').trim();
    const lat = parseFloat(m[1] || m[5]);
    const lng = parseFloat(m[2] || m[6]);
    if (!name || /^https?:|^\/|@|\\u/.test(name)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, lat: isFinite(lat) ? lat : null, lng: isFinite(lng) ? lng : null, gmaps: mapsSearch(name) });
  }
  return out;
}

router.post('/import/link', initDataAuth, async (req, res) => {
  const raw = String((req.body && req.body.url) || '').trim();
  if (!/^https?:\/\//.test(raw) || !/google\.[^/]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/.test(raw)) {
    return res.json({ found: false, reason: 'not_maps_url' });
  }
  try {
    const url = await expand(raw);
    let places = parsePlace(url);
    if (!places.length && /placelists|\/maps\/.*list/i.test(url)) places = await parseList(url);
    return res.json({ found: places.length > 0, places });
  } catch (e) {
    console.error('import/link failed:', e.message);
    return res.json({ found: false });
  }
});

/** Разобрать data-URL или сырой base64 → { mime, data }. */
function splitDataUrl(s) {
  const m = String(s || '').match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (m) return { mime: m[1], data: m[2] };
  return { mime: 'image/png', data: String(s || '') };
}

/** Вытащить JSON-массив из ответа модели (может быть в прозе/код-фенсе) → [{name, city}]. */
function parseItems(text) {
  const m = String(text || '').match(/\[[\s\S]*\]/);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[0]);
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => {
      if (typeof x === 'string') return { name: x.trim(), city: '' };
      return { name: String(x.name || '').trim(), city: String(x.city || '').trim() };
    }).filter((x) => x.name);
  } catch {
    return [];
  }
}

/** Claude-зрение: извлечь места со скриншота Google Maps → [{name, city}]. */
async function itemsFromClaude(mime, data) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': LLM_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mime, data } },
          { type: 'text', text: 'Это скриншот из Google Maps (список сохранённых мест или карточка места). Извлеки места. Верни СТРОГО JSON-массив объектов {"name","city"}: name — название места; city — город или местность, если видно на экране или известно, иначе "". Без рейтингов, адресов, расстояний и подписей интерфейса. Если мест нет — верни []. Пример: [{"name":"Колизей","city":"Рим"},{"name":"Trastevere","city":"Рим"}]' },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error('claude ' + res.status);
  const j = await res.json();
  const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  return parseItems(text);
}

/** OCR.space (бесплатный запасной): сырой текст → строки-кандидаты ({name, city:''}). */
async function itemsFromOcrSpace(mime, data) {
  const body = new URLSearchParams();
  body.set('apikey', OCR_KEY);
  body.set('base64Image', `data:${mime};base64,${data}`);
  body.set('language', 'eng');
  body.set('scale', 'true');
  const res = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body });
  if (!res.ok) throw new Error('ocrspace ' + res.status);
  const j = await res.json();
  const text = (j.ParsedResults || []).map((r) => r.ParsedText || '').join('\n');
  return text.split('\n').map((s) => s.trim())
    .filter((s) => s.length > 2 && !/^[\d.,\s]+$/.test(s) && !/\b(км|km|min|мин|reviews|отзыв)\b/i.test(s))
    .slice(0, 60).map((name) => ({ name, city: '' }));
}

router.post('/import/screenshot', initDataAuth, async (req, res) => {
  const raw = (req.body && req.body.image) || '';
  if (!raw) return res.json({ found: false, reason: 'no_image' });
  const { mime, data } = splitDataUrl(raw);
  // Движок: явный флаг ocrspace (если есть ключ) → иначе Claude → иначе ocrspace.
  const engine = (IMPORT_ENGINE === 'ocrspace' && OCR_KEY) ? 'ocrspace' : (LLM_KEY ? 'claude' : (OCR_KEY ? 'ocrspace' : null));
  if (!engine) return res.json({ found: false, reason: 'no_engine' });
  try {
    let items = [];
    if (engine === 'claude') {
      try { items = await itemsFromClaude(mime, data); }
      catch (e) { if (OCR_KEY) items = await itemsFromOcrSpace(mime, data); else throw e; }
    } else {
      items = await itemsFromOcrSpace(mime, data);
    }
    const seen = new Set();
    const places = [];
    for (const it of items) {
      const key = it.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const q = it.city ? `${it.name} ${it.city}` : it.name;
      places.push({ name: it.name, city: it.city || '', lat: null, lng: null, gmaps: mapsSearch(q) });
    }
    return res.json({ found: places.length > 0, places, engine });
  } catch (e) {
    console.error('import/screenshot failed:', e.message);
    return res.json({ found: false });
  }
});

export default router;
