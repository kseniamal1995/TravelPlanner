/* Роут генерации маршрута (слой C). Защищён валидацией initData.
   POST /api/generate { city, tripStart, days, hotel, pace, interests, mustSee, fixedEvents }
   → { city: City, mock?: true }  (City — docs/03-data-model.md, готов для store). */
import { Router } from 'express';
import { initDataAuth } from '../middleware/initData.js';
import { generateTrip } from '../services/llm.js';

const router = Router();

router.post('/generate', initDataAuth, async (req, res) => {
  const b = req.body || {};
  const city = String(b.city || '').trim();
  if (!city) return res.status(400).json({ error: 'city is required' });

  const input = {
    city,
    tripStart: typeof b.tripStart === 'string' ? b.tripStart : '',
    days: parseInt(b.days, 10) || 3,
    hotel: typeof b.hotel === 'string' ? b.hotel : '',
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
