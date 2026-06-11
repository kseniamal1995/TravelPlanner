/* Строка «Прибытие и заселение» — кликабельная подложка, открывает модалку (sheets/arrival.js).
   Показывается в день прилёта всегда: это единственная точка редактирования отеля
   и времён прилёта/вылета/заселения (настроек поездки больше нет). */
import { ic } from '../icons.js';

export function arrivalRow(c) {
  const chip = c.arrival ? `<span class="inforow-chip">${ic('landing', 13)} ${c.arrival}</span>` : '';
  return `<button class="inforow" onclick="openArrival()"><span class="inforow-ic"><img src="/emoji/arrival.png" alt=""></span><span class="inforow-tt">Прибытие и заселение</span>${chip}<span class="inforow-chev">${ic('chev', 18)}</span></button>`;
}

/* Строка «Отъезд» — тот же паттерн, для дня отъезда (последний день). */
export function departureRow(c) {
  if (!(c.departure || c.orlyOut)) return '';
  const chip = c.departure ? `<span class="inforow-chip">${ic('plane', 13)} ${c.departure}</span>` : '';
  return `<button class="inforow" onclick="openDeparture()"><span class="inforow-ic"><img src="/emoji/departure.png" alt=""></span><span class="inforow-tt">Отъезд</span>${chip}<span class="inforow-chev">${ic('chev', 18)}</span></button>`;
}
