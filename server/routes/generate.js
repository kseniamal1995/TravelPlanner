/* Роут генерации маршрута (слой C). Защищён валидацией initData.
   POST /api/generate { city, tripStart, days, hotel, pace, interests, mustSee, fixedEvents }
   → { city: City, mock?: true }  (City — docs/03-data-model.md, готов для store). */
import { Router } from 'express';
import { initDataAuth } from '../middleware/initData.js';
import { generateTrip, generateDay } from '../services/llm.js';

const router = Router();

// Догенерировать один день к существующей поездке.
router.post('/generate-day', initDataAuth, async (req, res) => {
  const b = req.body || {};
  const city = String(b.city || '').trim();
  if (!city) return res.status(400).json({ error: 'city is required' });
  const input = {
    city,
    dayIndex: parseInt(b.dayIndex, 10) || 0,
    pace: ['low', 'med', 'high'].includes(b.pace) ? b.pace : 'med',
    interests: Array.isArray(b.interests) ? b.interests.map(String) : [],
    existing: Array.isArray(b.existing) ? b.existing.map(String) : [],
  };
  try {
    res.json(await generateDay(input));
  } catch (e) {
    console.error('generate-day failed:', e.message);
    res.status(502).json({ error: 'generation failed', detail: e.message });
  }
});

router.post('/generate', initDataAuth, async (req, res) => {
  const b = req.body || {};
  const city = String(b.city || '').trim();
  if (!city) return res.status(400).json({ error: 'city is required' });

  const str = (x) => (typeof x === 'string' ? x : '');
  const input = {
    city,
    tripStart: str(b.tripStart),
    days: parseInt(b.days, 10) || 3,
    hotel: str(b.hotel),
    arrival: str(b.arrival),
    departure: str(b.departure),
    arrivalFlight: str(b.arrivalFlight),
    departureFlight: str(b.departureFlight),
    arrivalAirport: str(b.arrivalAirport),
    departureAirport: str(b.departureAirport),
    checkin: str(b.checkin),
    checkout: str(b.checkout),
    pace: ['low', 'med', 'high'].includes(b.pace) ? b.pace : 'med',
    interests: Array.isArray(b.interests) ? b.interests.map(String) : [],
    mustSee: Array.isArray(b.mustSee) ? b.mustSee.map(String) : [],
    fixedEvents: Array.isArray(b.fixedEvents) ? b.fixedEvents : [],
  };

  try {
    const out = await generateTrip(input);
    res.json(out);
  } catch (e) {
    console.error('generate failed:', e.message);
    res.status(502).json({ error: 'generation failed', detail: e.message });
  }
});

export default router;
