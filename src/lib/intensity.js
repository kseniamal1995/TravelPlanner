/* Насыщенность дня (см. docs/03-data-model.md «Производные данные»). */
import { parseMin } from './format.js';

/**
 * score = пешие_минуты + минуты_осмотра×0.6 + точек×8, делится на коэффициент темпа.
 * Уровни: <150 easy · <290 med · иначе hard. Места с nort не считаются.
 * @returns {{level, icon, label, km, stops}}
 */
export function intensity(c, dayId) {
  const stops = c.places.filter((p) => p.bucket === dayId && !p.nort);
  let walkMin = 0, visitMin = 0;
  stops.forEach((p) => {
    visitMin += parseMin(p.visit);
    if (p.leg && p.leg.m === 'walk') walkMin += parseMin(p.leg.t);
  });
  const day = (c.days || []).find((d) => d.id === dayId);
  if (day && day.first && day.first.m === 'walk') walkMin += parseMin(day.first.t);

  const n = stops.length;
  const km = Math.round(walkMin / 60 * 4.5 * 10) / 10;
  let score = walkMin + visitMin * 0.6 + n * 8;
  const mult = c.walk === 'high' ? 1.3 : c.walk === 'low' ? 0.8 : 1;
  score = score / mult;
  const level = score < 150 ? 'easy' : score < 290 ? 'med' : 'hard';
  const L = { easy: ['🟢', 'Лёгкий день'], med: ['🟠', 'Средний день'], hard: ['🔴', 'Насыщенный день'] };
  return { level, icon: L[level][0], label: L[level][1], km, stops: n };
}
