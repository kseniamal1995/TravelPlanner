/* Настройки поездки: список разделов + подстраницы.
   Открывается кнопкой-настройками в шапке плана. Шапка = город + «назад».
   Подстраницы (даты/отель/перелёт/маршрут) переиспользуют поля формы онбординга. */
import { ic } from '../icons.js';
import { esc, dayLabel, plural } from '../lib/format.js';
import { store, city } from '../store.js';
import { datesField, flightFields, hotelFields, paceField, interestsField, mustSeeField, eventsField, bindChips } from '../sheets/tripFields.js';

/** Пост-рендер биндинг для настроек (тоггл чипсов интересов). */
export function bindSettings(app) {
  if (store.view === 'settings' && store.settingsSub === 'route') bindChips(app);
}

const PACE_LABEL = { low: 'Спокойный', med: 'Средний', high: 'Активный' };

/** Дата последнего дня (ISO yyyy-mm-dd) из tripStart + числа дней.
 *  Форматируем из локальных компонентов (toISOString сдвигает по часовому поясу). */
function endDate(c) {
  if (!c.tripStart) return '';
  const n = (c.days || []).length || 1;
  const d = new Date(c.tripStart + 'T00:00:00');
  d.setDate(d.getDate() + n - 1);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Значения города → объект для рендера полей формы. */
export function cityToForm(c) {
  const g = c.genInput || {};
  return {
    city: c.name || '',
    tripStart: c.tripStart || '',
    end: endDate(c),
    hotel: (c.hotel && c.hotel.name) || '',
    checkin: c.checkin || '', checkout: c.checkout || '',
    arrival: c.arrival || '', departure: c.departure || '',
    arrivalAirport: c.arrivalAirport || g.arrivalAirport || '',
    departureAirport: c.departureAirport || g.departureAirport || '',
    pace: g.pace || 'med',
    interests: g.interests || [],
    mustSee: (g.mustSee || []).join('\n'),
    fixedEvents: (g.fixedEvents || []).join('\n'),
  };
}

/** Заголовок страницы настроек: h1 + необязательная подпись + «назад». */
function head(title, sub, backLabel) {
  return `<div class="pbar"><button class="back" onclick="settingsBack()">${ic('chevl', 15)} ${backLabel}</button>`
    + `<div class="ptitle"><div class="phdr-left"><h1>${esc(title)}</h1>${sub ? `<span class="phsub">${esc(sub)}</span>` : ''}</div></div></div>`;
}

/** Одна карточка-строка раздела (стиль Figma 38-2241). */
function setcard(icon, title, sub, filled, action) {
  const subHtml = sub ? `<span class="setcard-sub${filled ? '' : ' dim'}">${esc(sub)}</span>` : '';
  return `<button class="setcard" onclick="openSettingsSub('${action}')">`
    + `<span class="setcard-ic">${ic(icon, 20)}</span>`
    + `<span class="setcard-tt"><span class="setcard-t1">${esc(title)}</span>${subHtml}</span>`
    + `<span class="setcard-chev">${ic('chev', 20)}</span></button>`;
}

export function settingsHtml() {
  const c = city();
  if (store.settingsSub) return subpage(c, store.settingsSub);

  const g = c.genInput || {};
  const n = (c.days || []).length;
  const datesSub = c.tripStart
    ? `${dayLabel(c.tripStart, 0).d} – ${dayLabel(c.tripStart, n - 1).d} · ${n} ${plural(n, ['день', 'дня', 'дней'])}`
    : 'Укажите даты поездки';
  const hotelSub = (c.hotel && c.hotel.name) ? c.hotel.name : 'Добавить отель и время заезда';
  const flightBits = [c.arrival && `прилёт ${c.arrival}`, c.departure && `вылет ${c.departure}`].filter(Boolean);
  const flightSub = flightBits.length ? flightBits.join(' · ') : 'Добавить времена и аэропорты';
  const paceLabel = PACE_LABEL[g.pace] || '';
  const routeBits = [paceLabel, (g.interests || []).length && `${g.interests.length} ${plural(g.interests.length, ['интерес', 'интереса', 'интересов'])}`].filter(Boolean);
  const routeSub = routeBits.length ? routeBits.join(' · ') : 'Темп, мероприятия, свои места';

  let t = head('Настройки поездки', '', 'План');
  t += `<div class="setlist">`
    + setcard('calendar', 'Даты поездки', datesSub, !!c.tripStart, 'dates')
    + setcard('building', 'Проживание', hotelSub, !!(c.hotel && c.hotel.name), 'hotel')
    + setcard('plane', 'Перелёт', flightSub, flightBits.length > 0, 'flight')
    + setcard('sliders', 'Маршрут', routeSub, routeBits.length > 0, 'route')
    + `</div>`;

  // Кнопка перегенерации: активна, когда настройки изменены (dirty).
  const dis = c.dirty ? '' : ' disabled';
  const hint = c.dirty ? 'Настройки изменены — обновите маршрут' : 'Измените настройки, чтобы обновить маршрут';
  t += `<div class="setsave regen"><div class="regen-hint">${hint}</div>`
    + `<button class="bigbtn acc" onclick="openRegenerate()"${dis}>${ic('refresh', 16)} Перегенерировать поездку</button></div>`;
  return t;
}

/* Подстраница раздела: шапка + поля (переиспользуемые) + sticky «Сохранить». */
const SUB_TITLE = { dates: 'Даты поездки', hotel: 'Проживание', flight: 'Перелёт', route: 'Маршрут' };
function subpage(c, sub) {
  const v = cityToForm(c);
  let fields = '';
  if (sub === 'dates') {
    fields = datesField(v)
      + `<div class="hint">Меняя даты, вы добавляете или убираете дни. Места убранных дней уедут в «На потом».</div>`;
  } else if (sub === 'hotel') {
    fields = hotelFields(v);
  } else if (sub === 'flight') {
    fields = flightFields(v);
  } else if (sub === 'route') {
    fields = paceField(v) + interestsField(v) + mustSeeField(v) + eventsField(v);
  }

  let t = head(c.name, SUB_TITLE[sub] || 'Настройки', 'Настройки');
  t += `<div class="setbody"><div class="modal setform">${fields}</div></div>`;
  t += `<div class="setsave"><button class="bigbtn acc" onclick="saveSettingsSub()">Сохранить</button></div>`;
  return t;
}
