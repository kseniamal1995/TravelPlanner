/* Форматирование дат, чисел, склонения, экранирование. */
import { MON, DOW } from '../config.js';

export const uid = () => 'p' + Math.random().toString(36).slice(2, 8);

/** Экранирование для вставки в HTML (& и <). Seed-тексты доверенные и рендерятся как есть. */
export const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Метка дня по индексу от tripStart: { d:'2 июля', s:'Чт' }. */
export function dayLabel(start, i) {
  if (!start) return { d: 'День ' + (i + 1), s: '' };
  const dt = new Date(start + 'T00:00:00');
  dt.setDate(dt.getDate() + i);
  return { d: dt.getDate() + ' ' + MON[dt.getMonth()], s: DOW[dt.getDay()] };
}

/** Короткая дата '2 июля'. */
export function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.getDate() + ' ' + MON[dt.getMonth()];
}

/** Сколько дней до даты (может быть отрицательным). */
export function daysUntil(d) {
  if (!d) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((new Date(d + 'T00:00:00') - t) / 86400000);
}

/** Склонение: plural(n, ['день','дня','дней']). */
export function plural(n, f) {
  const a = n % 10, b = n % 100;
  return f[(b >= 11 && b <= 14) ? 2 : a === 1 ? 0 : (a >= 2 && a <= 4) ? 1 : 2];
}

/** Разобрать строку времени ('~3 ч', '8 мин') в минуты. */
export function parseMin(s) {
  if (!s) return 0;
  s = ('' + s).replace(',', '.');
  let total = 0;
  const h = s.match(/([\d.]+)\s*ч/);
  if (h) total += parseFloat(h[1]) * 60;
  const m = s.match(/([\d.]+)\s*мин/);
  if (m) total += parseFloat(m[1]);
  return total;
}
