/* Google Maps deep-links.
   ⚠️ g() захардкоживает 'Paris' (ограничение прототипа, см. docs/05-architecture.md §1).
   В проде — геокодинг Places при добавлении места. */

/** Ссылка на поиск места в Google Maps. */
export const g = (n) =>
  'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(n + ' Paris');

/** Ссылка на пеший маршрут дня: origin/destination + waypoints по rname (без nort). */
export function routeUrl(c, dayId) {
  const stops = c.places.filter((p) => p.bucket === dayId && !p.nort).sort((a, b) => a.order - b.order);
  if (stops.length < 2) return null;
  const mode = (c.days.find((d) => d.id === dayId) || {}).mode || 'walking';
  const nm = stops.map((s) => s.rname || (s.name + ', Paris'));
  const wp = nm.slice(1, -1).map(encodeURIComponent).join('%7C');
  let u = 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(nm[0]) +
    '&destination=' + encodeURIComponent(nm[nm.length - 1]) + '&travelmode=' + mode;
  if (wp) u += '&waypoints=' + wp;
  return u;
}
