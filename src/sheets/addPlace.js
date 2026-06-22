/* Шит «Добавить место»: название, ссылка, куда (день/идеи) + раздел
   «Взять из идей и „На потом“» (чек-лист отложенных мест — бывший функционал шита дня). */
import { uid, dayLabel, esc, plural } from '../lib/format.js';
import { g } from '../lib/maps.js';
import { IDEAS } from '../config.js';
import { store, city, save } from '../store.js';
import { render } from '../render.js';
import { resetOv, openOv, closeOv } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';
import { openImport } from './importPlaces.js';
import { ic } from '../icons.js';

export function openAdd() {
  resetOv();
  const c = city();
  const tabs = [...(c.days || []).map((d, i) => ({ id: d.id, d: dayLabel(c.tripStart, i).d })), ...IDEAS.map((x) => ({ id: x.id, d: x.t }))];
  const cur = store.view === 'ideas' ? store.ideasTab : c.activeTab;
  const opts = tabs.map((t) => `<option value="${t.id}" ${t.id === cur ? 'selected' : ''}>${t.d}</option>`).join('');
  document.getElementById('ovTitle').textContent = 'Добавить место';

  let body = `<button type="button" class="btn impfind" id="f_import">${ic('pin', 15)} Импорт из Google Maps</button>`
    + `<div class="orsep"><span>или вручную</span></div>`
    + `<label>Название</label><input id="f_name" placeholder="напр. Centre Pompidou"><label>Ссылка</label><input id="f_link" placeholder="вставь ссылку"><label>Куда</label><select id="f_bucket">${opts}</select>`;
  // отложенные места из идей — можно забрать чек-листом
  const stash = c.places.filter((p) => ['shop', 'food', 'later'].includes(p.bucket) && p.bucket !== cur)
    .sort((a, b) => a.bucket.localeCompare(b.bucket) || a.order - b.order);
  if (stash.length) {
    body += `<label>Или взять из идей и «На потом»</label><div class="picklist">`
      + stash.map((p) => `<label class="pick"><input type="checkbox" value="${p.id}"><span>${esc(p.name)}</span></label>`).join('')
      + `</div>`;
  }
  document.getElementById('ovBody').innerHTML = body;
  document.getElementById('f_import').onclick = () => openImport();

  document.getElementById('ovSave').onclick = () => {
    const name = document.getElementById('f_name').value.trim();
    const b = document.getElementById('f_bucket').value;
    const picked = [...document.querySelectorAll('#ovBody .pick input:checked')];
    if (!name && !picked.length) { closeOv(); return; }

    const nextOrder = () => Math.max(0, ...c.places.filter((x) => x.bucket === b).map((x) => x.order + 1), 0);
    picked.forEach((bx) => {
      const p = c.places.find((x) => x.id === bx.value);
      if (p) { p.bucket = b; p.order = nextOrder(); }
    });
    let np = null;
    if (name) {
      np = {
        id: uid(), bucket: b, name, rating: '', desc: '',
        gmaps: document.getElementById('f_link').value.trim() || g(name),
        rname: name + ', Paris', bought: false, userNote: '',
        order: nextOrder(),
      };
      c.places.push(np);
    }
    save();
    closeOv();
    if (IDEAS.find((x) => x.id === b)) { store.view = 'ideas'; store.ideasTab = b; }
    else { store.view = 'plan'; c.activeTab = b; }
    store.animPending = true;
    if (np) store.flashId = np.id;
    render();
    store.flashId = null;
    if (picked.length) showToast(`Добавлено из идей: ${picked.length} ${plural(picked.length, ['место', 'места', 'мест'])}`);
  };
  openOv();
}
