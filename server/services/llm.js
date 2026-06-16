/* Генерация маршрута (слой C) через Claude + кэш справочных данных (A/B).
 *
 * Без ANTHROPIC_API_KEY работает MOCK — детерминированный каркас поездки, чтобы
 * можно было собирать и тестировать UI-флоу без ключа и без расходов.
 *
 * Реальный путь: Sonnet, системный промпт с правилами «человеческого» маршрута
 * (docs/01-product.md) помечен cache_control → повторные запросы по тому же
 * городу дешевле. См. docs/06-telegram-migration.md §2. */
import { getCityProfile, setCityProfile, getPlacesByCity, setPlace } from '../cache.js';

const API_KEY = process.env.ANTHROPIC_API_KEY || '';
// По умолчанию Haiku — быстрее (важно: долгий запрос рвётся в мобильном WebView Telegram).
const MODEL = process.env.LLM_MODEL || 'claude-haiku-4-5-20251001';
const PROFILE_TTL = 1000 * 60 * 60 * 24 * 30; // профиль города живёт 30 дней

/** Правила «человеческого» маршрута — стабильный префикс (кэшируется). */
const RULES = `Ты планируешь пешие маршруты путешествий «как составил бы человек».
Правила:
- Кластеризация: один день = одна пешеходная зона, минимум переездов.
- Якорь дня: главное по таймслоту/билету (музей, концерт) — остальное лёгкое вокруг; два тяжёлых музея подряд нельзя.
- Часы и день недели: учитывай закрытия (музеи пн/вт), воскресенья, последний вход, таймслоты.
- Кривая усталости: число точек и километров под темп ходьбы (low/med/high).
- Тайминг впечатлений: рынки утром, закат/подсветка вечером, обед по пути.
- Маленькие радости: утренний круассан, перерыв в саду.
- Контекст прилёта/отъезда: день прилёта начинается с логистики, день отъезда лёгкий.
- Части дня (sect): если день меняет характер (днём гуляем — вечером концерт), размечай разделителем с инструкцией перехода.
- Дефолты почти без правок.

ЯЗЫК: весь отображаемый текст — на русском (name, desc, theme, visit, sect.t/sect.note, ticket.price/lead, warnH, warnS). Поле rname — официальное название на местном/английском языке для геокодирования (напр. name «Лувр», rname «Louvre Museum, Paris»).
РЕЙТИНГ: поле rating — по 5-балльной шкале Google, десятичный разделитель ЗАПЯТАЯ (напр. «4,6»). Если не уверен в значении — оставь пустым ''. Никогда не используй 10-балльную шкалу.
НАЗВАНИЯ: name — короткое имя места (напр. «Лувр», «Сад Тюильри»), без префиксов вроде «Завтрак: …». Тип активности передавай через desc, а не в name.
КРАТКОСТЬ (ВАЖНО для скорости ответа): desc — одно короткое предложение (до ~12 слов). Не больше 6 точек в день. Не повторяй одно и то же в разных полях. Заполняй ticket/warnH/warnS/sect только когда это реально важно, иначе опускай.
БИЛЕТЫ: объект ticket добавляй ТОЛЬКО местам с платным входом или брони (музеи, башни, дворцы, забронированные события). Для парков, набережных, смотровых, еды, прогулок и любых бесплатных мест ticket НЕ добавляй.
ССЫЛКИ: URL клади ТОЛЬКО в ticket.url. Никогда не вставляй ссылки (http…) в desc, warnH, warnS, ticket.lead и другие текстовые поля.
ПЕРЕГОН: leg.t — время в пути до следующей точки в формате «N мин» (например «8 мин»), m — способ (walk/metro/bus/car). Без единиц не пиши.
КАТЕГОРИЯ: cat — строго одно из: sight (достопримечательность, площадь, храм), view (смотровая/вид), museum (музей, галерея, дворец-музей), park (парк, сад, набережная), food (еда, кафе, ресторан, бар), shop (шопинг, рынок), transport (логистика, вокзал, аэропорт). Выбирай ближайшую по смыслу; НЕ используй 'other'.`;

/** Простой uid для серверных id (вне Workflow-песочницы Date/Math доступны). */
let _n = 0;
function uid() { return (Date.now().toString(36) + (_n++).toString(36) + Math.floor(Math.random() * 1e6).toString(36)); }

/** Превратить вывод генерации (контент) в полноценный City (docs/03-data-model.md).
 *  cache=false (мок) — НЕ писать факты в общий кэш, чтобы не засорять его. */
async function buildCity(input, gen, cache = true) {
  const id = 'c' + uid();
  const days = [];
  const places = [];

  for (const d of (gen.days || [])) {
    const dayId = 'd' + uid();
    days.push({ id: dayId, mode: 'walking', first: null, theme: d.theme || '' });
    let j = 0;
    for (const p of (d.places || [])) places.push(await normalizePlace(p, dayId, j++, input.city, cache));
  }

  // Идеи (шопинг/еда/на потом) — bucket задаёт сам генератор.
  let k = 0;
  for (const p of (gen.ideas || [])) {
    const bucket = ['shop', 'food', 'later'].includes(p.bucket) ? p.bucket : 'later';
    places.push(await normalizePlace(p, bucket, k++, input.city, cache));
  }

  const hotelName = (input.hotel || '').trim();
  return {
    id,
    name: input.city,
    tripStart: input.tripStart || '',
    arrival: input.arrival || '',
    departure: input.departure || '',
    checkin: input.checkin || '',
    checkout: input.checkout || '',
    arrivalDay: days[0] ? days[0].id : null,
    hotel: hotelName
      ? { name: hotelName, gmaps: gmaps(hotelName + ' ' + input.city) }
      : null,
    reminders: (gen.reminders || []).map((r) => ({
      id: 'r' + uid(), text: r.text || '', due: r.due || '', url: r.url || undefined, done: false,
    })),
    days,
    activeTab: days[0] ? days[0].id : null,
    places,
  };
}

function gmaps(q) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
}

/** Нормализовать перегон: время к виду «N мин», если модель вернула голое число. */
function normLeg(leg) {
  if (!leg || typeof leg !== 'object') return undefined;
  let t = leg.t;
  if (t != null) {
    t = String(t).trim();
    if (/^\d+([.,]\d+)?$/.test(t)) t += ' мин'; // голое число → минуты
    leg = { ...leg, t };
  }
  return leg;
}

/** Привести место к схеме Place + закэшировать факты (слой A), если cache=true. */
async function normalizePlace(p, bucket, order, city, cache = true) {
  const name = p.name || 'Место';
  const rname = p.rname || (name + ', ' + city);
  const place = {
    id: 'p' + uid(), bucket,
    name, rating: p.rating || '',
    cat: p.cat || 'other',
    pri: p.pri || undefined,
    rname,
    wiki: p.wiki || undefined,
    desc: p.desc || '',
    gmaps: gmaps(rname),
    visit: p.visit || '',
    leg: normLeg(p.leg),
    ticket: p.ticket || undefined,
    warnH: p.warnH || undefined,
    warnS: p.warnS || undefined,
    sect: p.sect || undefined,
    bought: false, skipTk: false, userNote: '', done: false, order,
  };
  // Кэшируем факты о месте (без пользовательских полей).
  if (cache) {
    await setPlace(city, name, {
      rating: place.rating, cat: place.cat, rname, wiki: place.wiki,
      desc: place.desc, visit: place.visit, ticket: place.ticket,
      warnH: place.warnH, warnS: place.warnS,
    });
  }
  return place;
}

/** Главная точка входа: вернуть { city } по входным данным онбординга. */
export async function generateTrip(input) {
  if (!API_KEY) return { city: await buildCity(input, mockGen(input), false), mock: true };

  const known = await getPlacesByCity(input.city);
  const profile = await getCityProfile(input.city, PROFILE_TTL);
  const gen = await callClaude(input, profile, known);
  // Сохраняем профиль города (слой B), если модель его вернула.
  if (gen.cityProfile) await setCityProfile(input.city, gen.cityProfile);
  return { city: await buildCity(input, gen), mock: false };
}

/** Догенерировать ОДИН дополнительный день к существующей поездке.
 *  input: { city, dayIndex, pace, interests, existing: [имена уже добавленных мест] }
 *  Возвращает { theme, places: [Place] } (bucket пустой — его проставит клиент). */
export async function generateDay(input) {
  if (!API_KEY) {
    const places = [
      await normalizePlace({ name: `${input.city}: новое место`, cat: 'sight', desc: '[MOCK] Подключи ключ.' }, '', 0, input.city, false),
    ];
    return { theme: 'Новый день', places, mock: true };
  }
  const gen = await callClaudeDay(input);
  const places = [];
  let j = 0;
  for (const p of (gen.places || []).slice(0, 7)) places.push(await normalizePlace(p, '', j++, input.city));
  return { theme: gen.theme || '', places, mock: false };
}

async function callClaudeDay(input) {
  const profile = await getCityProfile(input.city, PROFILE_TTL);
  const payload = {
    task: 'Составь ОДИН дополнительный день поездки по правилам выше. Верни СТРОГО JSON { theme, places:[…] } (как один элемент days[]). Не повторяй уже выбранные места.',
    input: { city: input.city, dayIndex: input.dayIndex, pace: input.pace, interests: input.interests },
    avoidPlaces: (input.existing || []).slice(0, 80),
    cachedCityProfile: profile || null,
    outputSchemaHint: { theme: 'тема дня', places: '[ { name, cat, rating, rname, wiki, desc, visit, leg:{m,t}, ticket:{price,lead,url}, warnH, warnS, sect } ]' },
  };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 3000,
      system: [
        { type: 'text', text: RULES, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: 'Отвечай только валидным JSON-объектом без markdown-обёртки.' },
      ],
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    }),
  });
  if (!res.ok) throw new Error('Anthropic ' + res.status + ': ' + (await res.text()).slice(0, 300));
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  return parseJson(text);
}

/** Вызов Claude Messages API. Возвращает распарсенный объект генерации. */
async function callClaude(input, profile, known) {
  const userPayload = {
    task: 'Составь маршрут поездки по правилам выше. Верни СТРОГО JSON.',
    input,
    cachedCityProfile: profile || null,
    knownPlaces: known.slice(0, 60),
    outputSchemaHint: {
      cityProfile: '{ districts:[], tips:[] } — обнови/создай профиль города',
      days: '[ { theme, places:[ { name, cat, rating, rname, wiki, desc, visit, leg:{m,t}, ticket:{price,lead,url}, warnH, warnS, pri, sect:{ic,t,note} } ] } ]',
      ideas: '[ { bucket:"shop"|"food"|"later", name, cat, desc, rname } ]',
      reminders: '[ { text, due:"YYYY-MM-DD", url } ]',
    },
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system: [
        { type: 'text', text: RULES, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: 'Отвечай только валидным JSON-объектом без markdown-обёртки.' },
      ],
      messages: [{ role: 'user', content: JSON.stringify(userPayload) }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('Anthropic ' + res.status + ': ' + t.slice(0, 300));
  }
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  return parseJson(text);
}

/** Достать JSON из ответа (на случай markdown-обёртки). */
function parseJson(text) {
  try { return JSON.parse(text); } catch { /* попробуем вырезать */ }
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(text.slice(a, b + 1));
  throw new Error('LLM вернул не-JSON');
}

/** MOCK: детерминированный каркас без вызова API (для разработки без ключа). */
function mockGen(input) {
  const n = Math.max(1, parseInt(input.days, 10) || 3);
  const interests = (input.interests || []).join(', ') || 'прогулки';
  const days = [];
  for (let i = 0; i < n; i++) {
    days.push({
      theme: i === 0 ? 'Прибытие · знакомство' : `День ${i + 1} · ${interests}`,
      places: [
        { name: `${input.city}: точка ${i + 1}.1`, cat: 'sight', rating: '4,6', desc: '[MOCK] Подключи ANTHROPIC_API_KEY для реальной генерации.', visit: '~1 ч', leg: { m: 'walk', t: '10 мин' } },
        { name: `${input.city}: точка ${i + 1}.2`, cat: 'food', rating: '4,4', desc: '[MOCK] Обед по пути.', visit: '~45 мин' },
      ],
    });
  }
  return {
    days,
    ideas: [{ bucket: 'food', name: 'Локальное кафе', cat: 'food', desc: '[MOCK] Идея на потом.' }],
    reminders: [{ text: 'Проверить часы работы музеев', due: '', url: '' }],
  };
}
