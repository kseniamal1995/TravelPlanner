/* Настройки поездки (⚙): степпер дней + отель. */
import { uid, plural } from '../lib/format.js';
import { store, city, save, snapshot } from '../store.js';
import { render } from '../render.js';
import { resetOv, openOv, closeOv } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';
import { openDaySheet } from './daySheet.js';

export function openTrip() {
  resetOv();
  const c = city();
  document.getElementById('ovTitle').textContent = 'Настройки поездки';
  document.getElementById('ovBody').innerHTML = `<label>Дней</label><div class="stepper"><button id="dminus" type="button">−</button><b id="dcount">${(c.days || []).length}</b><button id="dplus" type="button">+</button></div>
    <label>Отель</label><input id="t_hotel" value="${(c.hotel && c.hotel.name) || ''}" placeholder="Название отеля">`;

  let count = (c.days || []).length;
  const refresh = () => { document.getElementById('dcount').textContent = count; };
  document.getElementById('dplus').onclick = () => { count++; refresh(); };
  document.getElementById('dminus').onclick = () => { if (count > 1) count--; refresh(); };

  document.getElementById('ovSave').onclick = () => {
    snapshot();
    const hn = document.getElementById('t_hotel').value.trim();
    if (hn) {
      if (c.hotel) c.hotel.name = hn;
      else c.hotel = { name: hn, gmaps: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(hn + ' ' + c.name) };
    }
    const cur = c.days.length;
    let moved = 0;
    if (count > cur) {
      for (let i = cur; i < count; i++) c.days.push({ id: 'd' + uid(), mode: 'walking', first: null });
    } else if (count < cur) {
      const removed = c.days.slice(count);
      c.days = c.days.slice(0, count);
      removed.forEach((d) => { c.places.filter((p) => p.bucket === d.id).forEach((p) => { p.bucket = 'later'; moved++; }); });
      if (!c.days.find((d) => d.id === c.activeTab)) c.activeTab = c.days[0].id;
    }
    save();
    closeOv();
    render();
    if (count < cur) {
      showToast(`${cur - count} ${plural(cur - count, ['день удалён', 'дня удалено', 'дней удалено'])}` + (moved ? ` · ${moved} ${plural(moved, ['место', 'места', 'мест'])} в «На потом»` : ''), 1);
    } else if (count > cur) {
      c.activeTab = c.days[cur].id;
      store.animPending = true;
      render();
      openDaySheet(c.activeTab);
    }
  };
  openOv();
}
