/* Главная: список поездок + стопка фото-превью. */
import { ic } from '../icons.js';
import { esc, dayLabel, plural } from '../lib/format.js';
import { store, placeCount, cityImgCache, cityImgQueue } from '../store.js';
import { anyDot } from '../lib/reminders.js';
import { emptyHtml } from '../components/empty.js';

export function homeHtml() {
  const S = store.S;
  let cards = '';
  let ci = 0;
  for (const id in S.cities) {
    const c = S.cities[id];
    const n = (c.days || []).length;
    const range = c.tripStart ? `${dayLabel(c.tripStart, 0).d} – ${dayLabel(c.tripStart, n - 1).d}` : '';
    const pc = placeCount(c);
    const cimg = cityImgCache[id];
    if (cimg === undefined) cityImgQueue.push(c);
    const thumb = `<div class="thumb citythumb" data-cityimg="${id}">${cimg ? `<img src="${cimg}" alt="">` : ic('landmark', 18)}</div>`;
    cards += `<div class="tswipe" style="--d:${Math.min(ci++, 8) * 40}ms"><div class="tdel">${ic('trash', 18)}</div><div class="tripcard" data-cid="${id}" onclick="openTrip2('${id}')">${thumb}<div class="tcbody"><h3>${esc(c.name)}</h3><div class="meta">${range}${range ? ' · ' : ''}${n} ${plural(n, ['день', 'дня', 'дней'])}${pc ? ' · ' + pc + ' ' + plural(pc, ['место', 'места', 'мест']) : ''}</div></div><div class="go">${ic('chev', 20)}</div></div></div>`;
  }
  // плашка-заглушка генерируемой поездки
  let pending = '';
  if (store.pendingTrip) {
    const p = store.pendingTrip;
    pending = p.error
      ? `<div class="tripcard pending err"><div><h3>${esc(p.city)}</h3><div class="meta">Не удалось собрать маршрут</div></div><button class="btn acc" onclick="retryPending()">Повторить</button></div>`
      : `<div class="tripcard pending"><div><h3>${esc(p.city)}</h3><div class="meta">Собираю маршрут по дням…</div></div><div class="genspin"></div></div>`;
  }
  if (!cards && !pending) cards = emptyHtml('route', 'Пока нет поездок', 'Создай первую — соберём маршрут по дням');
  return `<div class="home"><div class="homehdr"><h1>Маршруты</h1><button class="iconbtn${anyDot(S) ? ' hasdot' : ''}" onclick="goRem('all')" title="Напоминания" aria-label="Напоминания">${ic('bell', 18)}</button></div>
    ${pending}${cards}
    <button class="bigbtn acc" onclick="generateTrip()">${ic('plus', 16)} Новая поездка</button></div>`;
}
