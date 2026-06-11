/* Модалка «Прибытие и заселение»: аккуратные блоки.
   Перелёт (прилёт + вылет) · Дорога до отеля (открыто) · Заселение (отель + время). */
import { ic, EXT } from '../icons.js';
import { esc } from '../lib/format.js';
import { city, save } from '../store.js';
import { render } from '../render.js';
import { resetOv, openOv, closeOv } from '../ui/sheet.js';

export function openArrival() {
  const c = city();
  resetOv();
  document.getElementById('ovTitle').textContent = 'Прибытие и заселение';

  let body = '';
  // Перелёт — прилёт + вылет вместе
  body += `<div class="arrblock"><div class="arrhdr"><img src="/emoji/arrival.png" alt=""> Перелёт</div>
    <div class="two arrtwo"><div><label>Прилёт</label><input id="a_arr" type="time" value="${c.arrival || ''}"></div><div><label>Вылет</label><input id="a_dep" type="time" value="${c.departure || ''}"></div></div></div>`;

  // Дорога до отеля — показываем открыто
  if (c.orly) {
    body += `<div class="arrblock"><div class="arrhdr"><img src="/emoji/transport.png" alt=""> Дорога до отеля</div><div class="arrbody">${c.orly}</div></div>`;
  }

  // Заселение — отель (редактируется здесь; настроек поездки больше нет) + время
  body += `<div class="arrblock"><div class="arrhdr"><img src="/emoji/hotel.png" alt=""> Заселение</div>`;
  body += `<label>Отель</label><input id="a_hotel" value="${esc((c.hotel && c.hotel.name) || '')}" placeholder="Название отеля">`;
  if (c.hotel) {
    body += `<div class="arrbody">Оставь сумки — багаж примут на ресепшене раньше заселения.</div>`;
  }
  body += `<label>Заселение с</label><input id="a_ci" type="time" value="${c.checkin || ''}">`;
  if (c.hotel && c.hotel.gmaps) {
    body += `<div style="margin-top:10px"><a class="alink" href="${c.hotel.gmaps}" target="_blank" rel="noopener">${ic('pin', 13)} Google Maps ${EXT}</a></div>`;
  }
  body += `</div>`;

  document.getElementById('ovBody').innerHTML = body;
  document.getElementById('ovSave').onclick = () => {
    c.arrival = document.getElementById('a_arr').value;
    c.departure = document.getElementById('a_dep').value;
    c.checkin = document.getElementById('a_ci').value;
    const hn = document.getElementById('a_hotel').value.trim();
    if (hn) {
      if (c.hotel) c.hotel.name = hn;
      else c.hotel = { name: hn, gmaps: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(hn + ' ' + c.name) };
    }
    save();
    closeOv();
    render();
  };
  openOv();
}
