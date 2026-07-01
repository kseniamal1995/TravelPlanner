/* Переиспользуемые поля формы поездки: рендер + сбор из DOM.
   Используются и в онбординге (sheets/generateTrip.js), и в настройках
   поездки (views/settings.js). Один и тот же набор id → общий collect. */
import { ic } from '../icons.js';
import { DAY_THEMES } from '../config.js';
import { tg } from '../services/telegram.js';

export const PACE = [['low', 'Спокойный'], ['med', 'Средний'], ['high', 'Активный']];
const OPT = '<span class="opt">необязательно</span>';

export function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── Рендер групп полей (v — объект значений) ── */

export function cityField(v) {
  return `<label>Город</label><input id="g_city" placeholder="напр. Лиссабон" value="${esc(v.city)}">`;
}

export function datesField(v) {
  return `<div class="two"><div><label>Первый день</label><input id="g_start" type="date" value="${esc(v.tripStart)}"></div>`
    + `<div><label>Последний день</label><input id="g_end" type="date" min="${esc(v.tripStart)}" value="${esc(v.end)}"></div></div>`;
}

export function flightFields(v) {
  const arr = `<div class="two"><div><label>Время прилёта ${OPT}</label><input id="g_arr" type="time" value="${esc(v.arrival)}"></div>`
    + `<div><label>Аэропорт</label><input id="g_arrair" placeholder="напр. FCO" value="${esc(v.arrivalAirport)}"></div></div>`;
  const dep = `<div class="two"><div><label>Время вылета ${OPT}</label><input id="g_dep" type="time" value="${esc(v.departure)}"></div>`
    + `<div><label>Аэропорт</label><input id="g_depair" placeholder="напр. FCO" value="${esc(v.departureAirport)}"></div></div>`;
  return `<div class="fsec"><div class="fsec-h"><img src="/emoji/arrival.png" alt=""> Прилёт</div>${arr}</div>`
    + `<div class="fsec"><div class="fsec-h"><img src="/emoji/departure.png" alt=""> Вылет</div>${dep}</div>`;
}

export function hotelFields(v) {
  return `<label>Отель или район ${OPT}</label><input id="g_hotel" placeholder="можно указать позже" value="${esc(v.hotel)}">`
    + `<div class="two"><div><label>Время заезда ${OPT}</label><input id="g_ci" type="time" value="${esc(v.checkin)}"></div>`
    + `<div><label>Время выезда ${OPT}</label><input id="g_co" type="time" value="${esc(v.checkout)}"></div></div>`;
}

export function paceField(v) {
  return `<label>Темп прогулок</label><div class="picklist nodiv">`
    + PACE.map(([val, t]) => `<label class="pick"><input type="radio" name="g_pace" value="${val}" ${v.pace === val ? 'checked' : ''}><span>${t}</span></label>`).join('')
    + `</div>`;
}

export function interestsField(v) {
  return `<label>Интересы</label><div class="chips">`
    + DAY_THEMES.map(([, t, icon]) => `<button type="button" class="chip${(v.interests || []).includes(t) ? ' on' : ''}" data-v="${esc(t)}">${ic(icon, 15)} ${t}</button>`).join('')
    + `</div>`;
}

export function mustSeeField(v) {
  return `<label>Обязательно увидеть</label>`
    + `<textarea id="g_must" rows="3" placeholder="Например:&#10;Колизей&#10;Ватикан">${esc(v.mustSee)}</textarea>`;
}

export function eventsField(v) {
  return `<label>Забронированные мероприятия</label>`
    + `<textarea id="g_events" rows="4" placeholder="Необязательно">${esc(v.fixedEvents)}</textarea>`
    + `<div class="hint">Мероприятия с купленными билетами — учтём при составлении поездки.</div>`;
}

/** Навесить тоггл на чипсы интересов внутри root. */
export function bindChips(root) {
  root.querySelectorAll('.chip').forEach((ch) => {
    ch.onclick = () => { ch.classList.toggle('on'); tg.haptic('light'); };
  });
}

/* ── Сбор значений из DOM в объект t (мутирует t) ── */

const val = (id) => { const el = document.getElementById(id); return el ? el.value : undefined; };

export function collectCity(t) { const x = val('g_city'); if (x !== undefined) t.city = x.trim(); }
export function collectDates(t) { const s = val('g_start'); if (s !== undefined) t.tripStart = s; const e = val('g_end'); if (e !== undefined) t.end = e; }
export function collectFlight(t) {
  const a = val('g_arr'); if (a !== undefined) t.arrival = a;
  const d = val('g_dep'); if (d !== undefined) t.departure = d;
  const aa = val('g_arrair'); if (aa !== undefined) t.arrivalAirport = aa.trim();
  const da = val('g_depair'); if (da !== undefined) t.departureAirport = da.trim();
}
export function collectHotel(t) {
  const h = val('g_hotel'); if (h !== undefined) t.hotel = h.trim();
  const ci = val('g_ci'); if (ci !== undefined) t.checkin = ci;
  const co = val('g_co'); if (co !== undefined) t.checkout = co;
}
export function collectPace(t, root = document) { const c = root.querySelector('input[name="g_pace"]:checked'); if (c) t.pace = c.value; }
export function collectInterests(t, root = document) { t.interests = [...root.querySelectorAll('.chip.on')].map((x) => x.dataset.v); }
export function collectMustSee(t) { const x = val('g_must'); if (x !== undefined) t.mustSee = x; }
export function collectEvents(t) { const x = val('g_events'); if (x !== undefined) t.fixedEvents = x; }
