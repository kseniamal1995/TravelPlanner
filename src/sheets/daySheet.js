/* Шит «Настроить день» — единый онбординг дня (темы + взять из идей + удалить день). */
import { TRASH } from '../icons.js';
import { esc, dayLabel, plural } from '../lib/format.js';
import { DAY_THEMES } from '../config.js';
import { store, city, save } from '../store.js';
import { render } from '../render.js';
import { resetOv, openOv, closeOv } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';
import { delDay } from '../navigation.js';

export function openDaySheet(dayId) {
  const c = city();
  const i = c.days.findIndex((d) => d.id === dayId);
  if (i < 0) return;
  resetOv();
  const day = c.days[i];
  const lab = dayLabel(c.tripStart, i);
  document.getElementById('ovTitle').textContent = lab.d + (lab.s ? ', ' + lab.s : '');

  const rest = c.places.filter((p) => ['later', 'shop', 'food'].includes(p.bucket));
  const cur = new Set((day.theme || '').split(' · ').filter(Boolean));
  let body = `<label>Что хочешь делать в этот день?</label><div class="chips">`
    + DAY_THEMES.map(([k, t]) => `<button type="button" class="chip${cur.has(t) ? ' on' : ''}" data-th="${k}">${t}</button>`).join('')
    + `</div>`;
  if (rest.length) body += `<label>Взять из идей и «На потом»</label><div class="picklist">`
    + rest.map((p) => `<label class="pick"><input type="checkbox" value="${p.id}"><span>${esc(p.name)}</span></label>`).join('')
    + `</div>`;
  const cnt = c.places.filter((p) => p.bucket === dayId).length;
  const only = c.days.length <= 1;
  body += `<button class="sheetbtn danger" id="shDel" ${only ? 'disabled' : ''} style="margin-top:16px">${TRASH} Удалить день${cnt ? ` · ${cnt} ${plural(cnt, ['место', 'места', 'мест'])} в «На потом»` : ''}</button>`;

  const ob = document.getElementById('ovBody');
  ob.innerHTML = body;
  ob.querySelectorAll('.chip').forEach((b) => { b.onclick = () => b.classList.toggle('on'); });
  if (!only) document.getElementById('shDel').onclick = () => { closeOv(); delDay(dayId); };

  document.getElementById('ovSave').onclick = () => {
    day.theme = [...ob.querySelectorAll('.chip.on')]
      .map((b) => (DAY_THEMES.find((x) => x[0] === b.dataset.th) || [])[1])
      .filter(Boolean).join(' · ');
    const picked = [...ob.querySelectorAll('.pick input:checked')];
    picked.forEach((bx) => {
      const p = c.places.find((x) => x.id === bx.value);
      if (p) { p.bucket = dayId; p.order = Math.max(0, ...c.places.filter((x) => x.bucket === dayId).map((x) => x.order + 1), 0); }
    });
    store.animPending = true;
    save();
    closeOv();
    render();
    if (picked.length) showToast(`Добавлено: ${picked.length} ${plural(picked.length, ['место', 'места', 'мест'])}`);
  };
  openOv();
}
