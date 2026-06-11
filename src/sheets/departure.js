/* Модалка «Отъезд» — информационная: время вылета + дорога в аэропорт.
   Время вылета редактируется в модалке прибытия (блок «Перелёт»), здесь — только показ. */
import { city } from '../store.js';
import { resetOv, openOv } from '../ui/sheet.js';

export function openDeparture() {
  const c = city();
  resetOv();
  // Информационная модалка: прячем «Сохранить», «Отмена» → «Закрыть».
  document.getElementById('ovSave').style.display = 'none';
  document.getElementById('ovCancel').textContent = 'Закрыть';
  document.getElementById('ovTitle').textContent = 'Отъезд';

  let body = `<div class="arrblock"><div class="arrhdr"><img src="/emoji/departure.png" alt=""> Вылет</div><div class="arrbody">`;
  if (c.departure) body += `<b>${c.departure}</b> — вылет. `;
  body += `${c.departureNote || ''}</div></div>`;
  if (c.orlyOut) {
    body += `<div class="arrblock"><div class="arrhdr"><img src="/emoji/transport.png" alt=""> Дорога в аэропорт</div><div class="arrbody">${c.orlyOut}</div></div>`;
  }
  document.getElementById('ovBody').innerHTML = body;
  openOv();
}
