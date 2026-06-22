/* Поиск рейса по номеру и дате → аэропорт + время (для автозаполнения «Перелёта»).
   Источник: AeroDataBox (RapidAPI), бесплатный тариф. Ключ — env FLIGHT_API_KEY.
   Без ключа / если рейс не найден → { found:false } (на клиенте — ручной ввод).
   GET /api/flight?no=SU2611&date=YYYY-MM-DD → { found, depAirport, depTime, arrAirport, arrTime, airline } */
import { Router } from 'express';
import { initDataAuth } from '../middleware/initData.js';

const router = Router();
const KEY = process.env.FLIGHT_API_KEY || '';
const HOST = process.env.FLIGHT_API_HOST || 'aerodatabox.p.rapidapi.com';

/** Вытащить HH:MM из строки времени (форматы AeroDataBox разнятся). */
function hhmm(s) {
  if (!s) return '';
  const m = String(s).match(/(\d{1,2}:\d{2})/);
  return m ? m[1].padStart(5, '0') : '';
}
/** Аэропорт: предпочитаем IATA, иначе имя. */
function airport(a) {
  if (!a) return '';
  return a.iata || a.icao || a.name || a.municipalityName || '';
}

router.get('/flight', initDataAuth, async (req, res) => {
  const no = String(req.query.no || '').trim().replace(/\s+/g, '').toUpperCase();
  const date = String(req.query.date || '').trim(); // YYYY-MM-DD
  if (!no || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.json({ found: false });
  if (!KEY) return res.json({ found: false, reason: 'no_api_key' });
  try {
    const url = `https://${HOST}/flights/number/${encodeURIComponent(no)}/${encodeURIComponent(date)}?withAircraftImage=false&withLocation=false`;
    const r = await fetch(url, { headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': HOST } });
    if (!r.ok) return res.json({ found: false });
    const data = await r.json();
    const f = Array.isArray(data) ? data[0] : (data && Array.isArray(data.flights) ? data.flights[0] : null);
    if (!f) return res.json({ found: false });
    const dep = f.departure || {}, arr = f.arrival || {};
    res.json({
      found: true,
      depAirport: airport(dep.airport),
      depTime: hhmm(dep.scheduledTime?.local || dep.scheduledTimeLocal || dep.revisedTime?.local),
      arrAirport: airport(arr.airport),
      arrTime: hhmm(arr.scheduledTime?.local || arr.scheduledTimeLocal || arr.revisedTime?.local),
      airline: (f.airline && f.airline.name) || '',
    });
  } catch (e) {
    console.error('flight lookup failed:', e.message);
    res.json({ found: false });
  }
});

export default router;
