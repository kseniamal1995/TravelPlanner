/* Шит «Новая поездка»: город, первый день, число дней, отель. Создаёт пустые дни.
   Отель потом редактируется в модалке «Прибытие и заселение». */
import { uid } from '../lib/format.js';
import { store, save } from '../store.js';
import { render } from '../render.js';
import { resetOv, openOv, closeOv } from '../ui/sheet.js';

export function newTrip() {
  resetOv();
  document.getElementById('ovTitle').textContent = 'Новая поездка';
  document.getElementById('ovBody').innerHTML = `<label>Город</label><input id="f_city" placeholder="напр. Лиссабон"><div class="two"><div><label>Первый день</label><input id="f_start" type="date"></div><div><label>Дней</label><input id="f_days" type="number" value="3" min="1"></div></div><label>Отель</label><input id="f_hotel" placeholder="Название отеля (можно позже)">`;
  document.getElementById('ovSave').onclick = () => {
    const nm = document.getElementById('f_city').value.trim();
    if (!nm) { closeOv(); return; }
    const id = 'c' + uid();
    const nd = Math.max(1, parseInt(document.getElementById('f_days').value) || 1);
    const days = [];
    for (let i = 0; i < nd; i++) days.push({ id: 'd' + uid(), mode: 'walking', first: null });
    const hn = document.getElementById('f_hotel').value.trim();
    store.S.cities[id] = {
      id, name: nm, tripStart: document.getElementById('f_start').value || '',
      hotel: hn ? { name: hn, gmaps: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(hn + ' ' + nm) } : null,
      arrivalDay: days[0].id, reminders: [], days, activeTab: days[0].id, places: [],
    };
    store.S.activeCity = id;
    store.view = 'plan';
    save();
    closeOv();
    render();
  };
  openOv();
}
