/* Погода через Open-Meteo, без ключей (см. docs/05-architecture.md).
   Горизонт прогноза ~16 дней; для более дальних дат слот скрыт. */
import { wxCache } from '../store.js';
import { ic } from '../icons.js';

function wxIcon(code) {
  return code <= 1 ? 'sun' : code <= 48 ? 'cloud' : 'rain';
}

/** Пропатчить узлы [data-wxd="YYYY-MM-DD"] значениями из кэша. */
export function applyWx(c) {
  const by = wxCache[c.name];
  if (!by || by === 'loading') return;
  document.querySelectorAll('[data-wxd]').forEach((n) => {
    const w = by[n.dataset.wxd];
    if (w && w.t != null) n.innerHTML = ic(wxIcon(w.c), 13) + ' ' + w.t + '°';
  });
}

/** Загрузить прогноз для дат поездки один раз и закэшировать по имени города. */
export async function ensureWeather(c) {
  if (!c.tripStart || wxCache[c.name] !== undefined) return;
  wxCache[c.name] = 'loading';
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(c.tripStart + 'T00:00:00');
    const end = new Date(start); end.setDate(end.getDate() + Math.max(0, (c.days || []).length - 1));
    const horizon = new Date(today); horizon.setDate(horizon.getDate() + 15);
    if (start > horizon || end < today) { wxCache[c.name] = null; return; }
    const sd = (start < today ? today : start).toISOString().slice(0, 10);
    const ed = (end > horizon ? horizon : end).toISOString().slice(0, 10);

    const g0 = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(c.name) + '&count=1&language=ru')).json();
    const loc = g0.results && g0.results[0];
    if (!loc) { wxCache[c.name] = null; return; }

    const f = await (await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + loc.latitude + '&longitude=' + loc.longitude + '&daily=weather_code,temperature_2m_max&timezone=auto&start_date=' + sd + '&end_date=' + ed)).json();
    const by = {};
    ((f.daily && f.daily.time) || []).forEach((d, i) => {
      by[d] = { t: Math.round(f.daily.temperature_2m_max[i]), c: f.daily.weather_code[i] };
    });
    wxCache[c.name] = by;
    applyWx(c);
  } catch {
    wxCache[c.name] = null;
  }
}
