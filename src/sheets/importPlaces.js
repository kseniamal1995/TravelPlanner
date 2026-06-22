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

/** Свежее состояние панели импорта (живёт у вызывающего, переживает перерисовки). */
export function newImportState() {
  return { tab: 'link', loading: false, error: '', url: '', places: [], sel: new Set() };
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
  const seg = `<div class="modeseg"><button type="button" id="imp_link" class="${ps.tab === 'link' ? 'on' : ''}">Ссылка</button>`
    + `<button type="button" id="imp_shot" class="${ps.tab === 'shot' ? 'on' : ''}">Скриншот</button></div>`;

  let input;
  if (ps.tab === 'link') {
    input = `<label>Ссылка Google Maps <span class="opt">точка или список</span></label>`
      + `<input id="imp_url" placeholder="вставь ссылку" value="${esc(ps.url || '')}">`
      + `<button type="button" class="btn acc impfind" id="imp_find">Найти места</button>`;
  } else {
    input = `<label>Скриншот подборки или места</label>`
      + `<button type="button" class="btn impfind" id="imp_pick">${ic('plus', 16)} Выбрать изображение</button>`
      + `<input id="imp_file" type="file" accept="image/*" hidden>`;
  }

  let result = '';
  if (ps.loading) result = `<div class="genwait"><div class="genspin"></div><div class="hint">Распознаю места…</div></div>`;
  else if (ps.error) result = `<div class="ffinfo err" style="margin-top:14px">${esc(ps.error)}</div>`;
  else if (ps.places.length) {
    result = `<label>Нашли мест: ${ps.places.length} <span class="opt">отметь нужные</span></label><div class="picklist">`
      + ps.places.map((p, i) => {
        const far = !isNear(p, cityName);
        const badge = far ? `<span class="impbadge far">${ic('pin', 11)} далеко → в идеи</span>` : `<span class="impbadge near">★ в городе</span>`;
        return `<label class="pick improw"><input type="checkbox" data-i="${i}" ${ps.sel.has(i) ? 'checked' : ''}>`
          + `<span class="impname">${esc(p.name)}${p.city ? ` <span class="opt">${esc(p.city)}</span>` : ''}</span>${badge}</label>`;
      }).join('')
      + `</div>`;
  }
  return seg + input + result;
}

/** Смонтировать панель импорта в host. ps — состояние; getCityName() — город для
 *  классификации; onChange() — после каждой перерисовки/изменения выбора (для футера хоста). */
export function mountImportPanel(host, ps, getCityName, onChange) {
  const redraw = () => { host.innerHTML = panelHtml(ps, getCityName()); wire(); if (onChange) onChange(); };

  function wire() {
    const link = host.querySelector('#imp_link');
    if (link) link.onclick = () => { if (ps.tab !== 'link') { ps.tab = 'link'; redraw(); } };
    const shot = host.querySelector('#imp_shot');
    if (shot) shot.onclick = () => { if (ps.tab !== 'shot') { ps.tab = 'shot'; redraw(); } };

    const find = host.querySelector('#imp_find');
    if (find) find.onclick = runLink;

    const pick = host.querySelector('#imp_pick');
    const file = host.querySelector('#imp_file');
    if (pick && file) {
      pick.onclick = () => file.click();
      file.onchange = () => { if (file.files && file.files[0]) runShot(file.files[0]); };
    }

    host.querySelectorAll('.improw input').forEach((cb) => {
      cb.onchange = () => { const i = +cb.dataset.i; if (cb.checked) ps.sel.add(i); else ps.sel.delete(i); if (onChange) onChange(); };
    });
  }

  function setLoading() { ps.loading = true; ps.error = ''; ps.places = []; ps.sel = new Set(); redraw(); }
  function fail() { ps.loading = false; ps.error = 'Что-то пошло не так. Попробуй ещё раз.'; redraw(); }
  function showResult(r, emptyMsg) {
    ps.loading = false;
    const places = (r && r.places) || [];
    if (!places.length) { ps.error = emptyMsg; ps.places = []; redraw(); return; }
    ps.places = places;
    ps.sel = new Set(places.map((_, i) => i)); // по умолчанию выбраны все
    ps.error = '';
    redraw();
  }
  async function runLink() {
    const url = (host.querySelector('#imp_url').value || '').trim();
    ps.url = url;
    if (!url) return;
    setLoading();
    try { showResult(await api.importLink(url), 'Не распознали ссылку — проверь, что это ссылка Google Maps на место или список.'); }
    catch { fail(); }
  }
  async function runShot(file) {
    setLoading();
    try {
      const dataUrl = await downscale(await readFile(file));
      showResult(await api.importScreenshot(dataUrl), 'Не нашли места на скриншоте — попробуй другой кадр со списком мест.');
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
