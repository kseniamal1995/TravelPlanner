/* Логика «горящих» напоминаний — для точки-индикатора на кнопке и табах.
   Напоминание «горит», если оно не выполнено и его крайняя дата уже прошла
   или наступит в ближайшие SOON_DAYS дней. Без даты — не горит. */
import { daysUntil } from './format.js';

export const SOON_DAYS = 7;

/** «Горит» ли конкретное напоминание. */
export function remActive(r) {
  if (!r || r.done) return false;
  const du = daysUntil(r.due);
  return du !== null && du <= SOON_DAYS; // du < 0 — просрочено, тоже считается
}

/** Есть ли у поездки горящие напоминания. */
export function cityDot(c) {
  return !!c && (c.reminders || []).some(remActive);
}

/** Есть ли горящие напоминания хоть в одной поездке. */
export function anyDot(S) {
  return Object.values((S && S.cities) || {}).some(cityDot);
}
