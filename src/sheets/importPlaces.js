/* Импорт мест из Google Maps — киллер-фича (docs/10-backlog.md D).
   Два способа: ссылка (бесплатно) и скриншот (Claude-зрение). «В городе поездки» →
   анкор (pri:must), «далеко» → идея (pri:opt). Кладём в «Идеи → На потом» (bucket 'later').

   Ядро — переиспользуемая ПАНЕЛЬ (mountImportPanel): рендерит вкладки/ввод/результаты
   в любой контейнер и держит состояние. Используется и как отдельный шит (готовая
   поездка), и как инлайн-шаг формы новой поездки — функционал везде одинаковый. */
import { uid, esc, plural } from '../lib/format.js';
import { g } from '../lib/maps.js';
import { ic } from '../icons.js';
import { store, city, save } from '../store.js';
import { render } from '../render.js';
import { resetOv, openOv, closeOv } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';
import { api } from '../services/api.js';

/** Свежее состояние панели импорта (живёт у вызывающего, переживает перерисовки).
 *  По умолчанию вкладка «Скриншот» (основной способ); urls — список ссылок-точек. */
export function newImportState() {
  return { tab: 'shot', loading: false, error: '', urls: [''], places: [], sel: new Set() };
}

/** Близко = координаты есть (ссылка на конкретное место) или город совпал с городом поездки. */
function isNear(p, cityName) {
  if (p.lat != null) return true;
  if (!p.city) return true;
  const a = p.city.toLowerCase(), b = (cityName || '').toLowerCase();
  return !!b && (a.includes(b) || b.includes(a));
}

/** Выбранные места с флагом near (единая классификация для всех точек входа). */
export function selectedPlaces(ps, cityName) {
  return [...ps.sel].map((i) => ps.places[i]).filter(Boolean).map((p) => ({ ...p, near: isNear(p, cityName) }));
}

/** Построить место поездки из импортированного (единый формат для всех точек входа). */
export function placeFromImport(p, cityName, order = 0) {
  return {
    id: uid(), bucket: 'later', name: p.name, rating: '', desc: '',
    gmaps: p.gmaps || g(p.name),
    rname: p.city ? `${p.name}, ${p.city}` : `${p.name}, ${cityName}`,
    pri: p.near ? 'must' : 'opt',
    bought: false, userNote: '', order,
  };
}

/** HTML панели: вкладки + ввод (ссылка/скриншот) + результаты с чек-листом. */
function panelHtml(ps, cityName) {
  const seg = `<div class="modeseg"><button type="button" id="imp_shot" class="${ps.tab === 'shot' ? 'on' : ''}">Скриншот</button>`
    + `<button type="button" id="imp_link" class="${ps.tab === 'link' ? 'on' : ''}">Ссылка</button></div>`;

  let input;
  if (ps.tab === 'shot') {
    input = `<div class="hint" style="margin:0 0 10px">Загрузите скриншот списка мест в Google Maps — мы автоматически его распознаем.</div>`
      + `<button type="button" class="btn impfind" id="imp_pick">${ic('plus', 16)} Выбрать изображения</button>`
      + `<input id="imp_file" type="file" accept="image/*" multiple hidden>`;
  } else {
    const urls = ps.urls && ps.urls.length ? ps.urls : [''];
    input = `<label>Ссылки на места <span class="opt">по одной на точку</span></label>`
      + urls.map((u, i) => `<input class="imp_url" data-i="${i}" placeholder="ссылка на место в Google Maps" value="${esc(u)}"${i > 0 ? ' style="margin-top:8px"' : ''}>`).join('')
      + `<button type="button" class="btn impadd" id="imp_more">${ic('plus', 15)} Добавить ещё</button>`
      + `<button type="button" class="btn acc impfind" id="imp_find">Найти места</button>`;
  }

  let result = '';
  if (ps.loading) result = `<div class="genwait"><div class="genspin"></div><div class="hint">Распознаю места…</div></div>`;
  else if (ps.error) result = `<div class="ffinfo err" style="margin-top:14px">${esc(ps.error)}</div>`;
  else if (ps.places.length) {
    result = `<label>Нашли мест: ${ps.places.length} <span class="opt">отметь нужные</span></label><div class="picklist">`
      + ps.places.map((p, i) => `<label class="pick improw"><input type="checkbox" data-i="${i}" ${ps.sel.has(i) ? 'checked' : ''}>`
        + `<span class="impname">${esc(p.name)}${p.city ? ` <span class="opt">${esc(p.city)}</span>` : ''}</span></label>`).join('')
      + `</div>`;
  }
  return seg + input + result;
}

/** Смонтировать панель импорта в host. ps — состояние; getCityName() — город для
 *  классификации; onChange() — после каждой перерисовки/изменения выбора (для футера хоста). */
export function mountImportPanel(host, ps, getCityName, onChange) {
  const redraw = () => { host.innerHTML = panelHtml(ps, getCityName()); wire(); if (onChange) onChange(); };

  // Считать значения видимых инпутов-ссылок обратно в ps.urls (перед перерисовкой/поиском).
  function syncUrls() {
    const inputs = [...host.querySelectorAll('.imp_url')];
    if (inputs.length) ps.urls = inputs.map((x) => x.value);
  }

  function wire() {
    const shot = host.querySelector('#imp_shot');
    if (shot) shot.onclick = () => { if (ps.tab !== 'shot') { syncUrls(); ps.tab = 'shot'; redraw(); } };
    const link = host.querySelector('#imp_link');
    if (link) link.onclick = () => { if (ps.tab !== 'link') { ps.tab = 'link'; redraw(); } };

    const more = host.querySelector('#imp_more');
    if (more) more.onclick = () => { syncUrls(); ps.urls.push(''); redraw(); };

    const find = host.querySelector('#imp_find');
    if (find) find.onclick = runLink;

    const pick = host.querySelector('#imp_pick');
    const file = host.querySelector('#imp_file');
    if (pick && file) {
      pick.onclick = () => file.click();
      file.onchange = () => { if (file.files && file.files.length) runShots(file.files); };
    }

    host.querySelectorAll('.improw input').forEach((cb) => {
      cb.onchange = () => { const i = +cb.dataset.i; if (cb.checked) ps.sel.add(i); else ps.sel.delete(i); if (onChange) onChange(); };
    });
  }

  function setLoading() { ps.loading = true; ps.error = ''; ps.places = []; ps.sel = new Set(); redraw(); }
  function fail() { ps.loading = false; ps.error = 'Что-то пошло не так. Попробуй ещё раз.'; redraw(); }
  /** Показать агрегированный список мест (с дедупом по названию). */
  function showPlaces(places, emptyMsg) {
    ps.loading = false;
    const seen = new Set();
    const dedup = [];
    for (const p of places) { const k = (p.name || '').toLowerCase(); if (!p.name || seen.has(k)) continue; seen.add(k); dedup.push(p); }
    if (!dedup.length) { ps.error = emptyMsg; ps.places = []; redraw(); return; }
    ps.places = dedup;
    ps.sel = new Set(dedup.map((_, i) => i)); // по умолчанию выбраны все
    ps.error = '';
    redraw();
  }
  async function runLink() {
    syncUrls();
    const urls = ps.urls.map((u) => u.trim()).filter(Boolean);
    if (!urls.length) return;
    setLoading();
    try {
      const all = [];
      for (const u of urls) { const r = await api.importLink(u); if (r && r.places) all.push(...r.places); }
      showPlaces(all, 'Не распознали ссылки — вставь ссылки Google Maps на конкретные места (не на список).');
    } catch { fail(); }
  }
  async function runShots(files) {
    setLoading();
    try {
      const all = [];
      for (const f of files) {
        const dataUrl = await downscale(await readFile(f));
        const r = await api.importScreenshot(dataUrl);
        if (r && r.places) all.push(...r.places);
      }
      showPlaces(all, 'Не нашли места на скриншотах — попробуй другой кадр со списком мест.');
    } catch { fail(); }
  }

  redraw();
}

/** Отдельный шит «Импорт» (для готовой поездки или как самостоятельная точка входа).
 *  opts.cityName / opts.onCommit(chosen) / opts.onClose() — см. ниже. */
export function openImport(opts = {}) {
  resetOv();
  const ps = newImportState();
  const cityName = () => (opts.cityName != null ? opts.cityName : safeCityName());
  document.getElementById('ovTitle').textContent = 'Импорт из Google Maps';
  mountImportPanel(document.getElementById('ovBody'), ps, cityName, footer);
  openOv();

  function footer() {
    const sv = document.getElementById('ovSave');
    const n = ps.sel.size;
    sv.style.display = ps.places.length ? '' : 'none';
    sv.disabled = n === 0;
    sv.textContent = n ? `Добавить ${n} ${plural(n, ['место', 'места', 'мест'])}` : 'Добавить';
    sv.onclick = commit;
    const cancel = document.getElementById('ovCancel');
    cancel.onclick = () => { closeOv(); if (opts.onClose) opts.onClose(); };
  }

  function commit() {
    const chosen = selectedPlaces(ps, cityName());
    if (!chosen.length) return;
    if (opts.onCommit) { opts.onCommit(chosen); closeOv(); if (opts.onClose) opts.onClose(); return; }
    const c = city();
    let order = Math.max(0, ...c.places.filter((x) => x.bucket === 'later').map((x) => x.order + 1), 0);
    chosen.forEach((p) => c.places.push(placeFromImport(p, c.name, order++)));
    save();
    closeOv();
    store.view = 'ideas';
    store.ideasTab = 'later';
    store.animPending = true;
    render();
    showToast(`Добавлено: ${chosen.length} ${plural(chosen.length, ['место', 'места', 'мест'])}`);
  }
}

function safeCityName() { try { return city().name || ''; } catch { return ''; } }

/** Файл → data-URL. */
function readFile(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

/** Ужать картинку до 1600px по длинной стороне (меньше трафик и токенов). */
function downscale(src, max = 1600, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      const scale = Math.min(1, max / Math.max(w, h));
      w = Math.round(w * scale); h = Math.round(h * scale);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      try { resolve(cv.toDataURL('image/jpeg', quality)); } catch { resolve(src); }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}
