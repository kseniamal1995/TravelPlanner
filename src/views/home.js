/* Главная: список поездок + стопка фото-превью. */
import { ic } from '../icons.js';
import { esc, dayLabel, plural } from '../lib/format.js';
import { store, placeCount, imgCache, imgQueue } from '../store.js';
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
    const pp = c.places.filter((p) => p.wiki).slice(0, 4);
    pp.forEach((p) => { if (imgCache[p.id] === undefined) imgQueue.push(p); });
    const stack = pp.length
      ? '<div class="pstack">' + pp.map((p) => `<span class="pthumb" data-img="${p.id}">${imgCache[p.id] ? `<img src="${imgCache[p.id]}" alt="">` : ic('pin', 12)}</span>`).join('') + '</div>'
      : '';
    cards += `<div class="tripcard" style="--d:${Math.min(ci++, 8) * 40}ms" onclick="openTrip2('${id}')"><div><h3>${esc(c.name)}</h3><div class="meta">${range}${range ? ' · ' : ''}${n} ${plural(n, ['день', 'дня', 'дней'])}${pc ? ' · ' + pc + ' ' + plural(pc, ['место', 'места', 'мест']) : ''}</div>${stack}</div><div class="go">${ic('chev', 20)}</div></div>`;
  }
  if (!cards) cards = emptyHtml('route', 'Пока нет поездок', 'Создай первую — соберём маршрут по дням');
  return `<div class="home"><div class="homehdr"><div><div class="kicker">личный планер</div><h1>Маршруты</h1></div><button class="iconbtn${anyDot(S) ? ' hasdot' : ''}" onclick="goRem('all')" title="Напоминания" aria-label="Напоминания">${ic('bell', 18)}</button></div>
    ${cards}
    <button class="bigbtn acc" onclick="generateTrip()">${ic('plus', 16)} Новая поездка</button></div>`;
}
