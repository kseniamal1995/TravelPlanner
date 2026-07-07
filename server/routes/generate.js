/* Роут генерации маршрута (слой C). Защищён валидацией initData.
   Генерация занимает ~30–70с — держать один HTTP-запрос так долго нельзя:
   мобильный Telegram-WebView / сеть рвут долгое соединение. Поэтому — ФОНОВАЯ
   задача: POST /generate стартует работу и сразу отдаёт { jobId }, клиент
   опрашивает GET /generate/status короткими запросами.
   POST /generate { city, tripStart, days, hotel, pace, interests, mustSee, fixedEvents }
   → 202 { jobId }
   GET  /generate/status?jobId=… → { status:'running' } | { status:'done', city, mock } | { status:'error', detail } */
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { initDataAuth } from '../middleware/initData.js';
import { generateTrip, generateDay } from '../services/llm.js';

const router = Router();

// Фоновые задачи генерации в памяти (1 реплика на Railway — этого достаточно).
// jobId → { userId, status:'running'|'done'|'error', city?, mock?, error?, ts }
const jobs = new Map();
const JOB_TTL = 1000 * 60 * 15; // задача живёт 15 минут

function sweepJobs() {
  const now = Date.now();
  for (const [id, j] of jobs) if (now - j.ts > JOB_TTL) jobs.delete(id);
}

// Догенерировать один день к существующей поездке (короткая операция — синхронно).
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

router.post('/generate', initDataAuth, (req, res) => {
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

  sweepJobs();
  const jobId = randomUUID();
  jobs.set(jobId, { userId: req.userId, status: 'running', ts: Date.now() });
  res.status(202).json({ jobId }); // отвечаем сразу — генерация идёт в фоне

  const t0 = Date.now();
  generateTrip(input).then((out) => {
    const placeN = (out.city && out.city.places && out.city.places.length) || 0;
    console.log(`generate ok: "${city}" days=${input.days} places=${placeN} took=${Date.now() - t0}ms mock=${!!out.mock}`);
    jobs.set(jobId, { userId: req.userId, status: 'done', city: out.city, mock: out.mock, ts: Date.now() });
  }).catch((e) => {
    console.error(`generate failed: "${city}" took=${Date.now() - t0}ms — ${e.message}`);
    jobs.set(jobId, { userId: req.userId, status: 'error', error: e.message, ts: Date.now() });
  });
});

router.get('/generate/status', initDataAuth, (req, res) => {
  const jobId = String(req.query.jobId || '');
  const job = jobs.get(jobId);
  if (!job) return res.status(404).json({ error: 'job not found' });
  if (job.userId !== req.userId) return res.status(403).json({ error: 'forbidden' });
  if (job.status === 'running') return res.json({ status: 'running' });
  if (job.status === 'error') { jobs.delete(jobId); return res.json({ status: 'error', detail: job.error }); }
  jobs.delete(jobId); // готовый результат забирают один раз
  res.json({ status: 'done', city: job.city, mock: job.mock });
});

export default router;
