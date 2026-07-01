/* Строка «Прибытие и заселение» — кликабельная подложка, открывает модалку (sheets/arrival.js).
   Единственная точка для отеля + времён прилёта/заселения. Показывается в день прилёта.
   Подзаголовок: название отеля (если есть) либо приглашение его добавить. */
import { ic } from '../icons.js';
import { esc } from '../lib/format.js';

export function arrivalRow(c) {
  // Отель не указан → компактная карточка-приглашение (Figma 38-2241).
  if (!(c.hotel && c.hotel.name)) {
    return `<button class="setcard hotelprompt" onclick="openArrival()">`
      + `<span class="setcard-ic">${ic('building', 20)}</span>`
      + `<span class="setcard-tt"><span class="setcard-t1">Добавить отель и время прибытия</span></span>`
      + `<span class="setcard-chev">${ic('chev', 20)}</span></button>`;
  }
  // Отель есть → строка «Прибытие и заселение» с 3D-иконкой.
  const sub = esc(c.hotel.name) + (c.checkin ? ` · заезд ${c.checkin}` : '');
  const chip = c.arrival ? `<span class="inforow-chip">${ic('landing', 13)} ${c.arrival}</span>` : '';
  return `<button class="inforow" onclick="openArrival()"><span class="inforow-ic"><img src="/emoji/arrival.png" alt=""></span><span class="inforow-tt"><span class="inforow-t1">Прибытие и заселение</span><span class="inforow-t2">${sub}</span></span>${chip}<span class="inforow-chev">${ic('chev', 18)}</span></button>`;
}

/* Строка «Отъезд» — тот же паттерн, для дня отъезда (последний день). */
export function departureRow(c) {
  if (!(c.departure || c.orlyOut)) return '';
  const chip = c.departure ? `<span class="inforow-chip">${ic('plane', 13)} ${c.departure}</span>` : '';
  return `<button class="inforow" onclick="openDeparture()"><span class="inforow-ic"><img src="/emoji/departure.png" alt=""></span><span class="inforow-tt"><span class="inforow-t1">Отъезд</span></span>${chip}<span class="inforow-chev">${ic('chev', 18)}</span></button>`;
}
