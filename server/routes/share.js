/* Шаринг маршрута другому юзеру в Telegram (MVP — поделиться копией).
   POST /api/share { city }   → { token, link }  — сохранить снимок поездки, вернуть deep-link.
   GET  /api/shared/:token     → { found, city }   — снимок для импорта получателю.

   Снимок очищается от личного (напоминания, заметки, флаги). Отель остаётся.
   Ссылка бессрочная. Получатель должен иметь доступ к Mini App (ALLOWED_USER_IDS).
   См. docs/10-backlog.md D (раздел «Шаринг маршрута»). */
import { Router } from 'express';
import crypto from 'crypto';
import { ds } from '../datastore.js';
import { initDataAuth } from '../middleware/initData.js';

const router = Router();
const BOT = process.env.BOT_USERNAME || '';
const APP = process.env.APP_NAME || '';

/** Личные поля места — не уезжают в общий снимок. */
const PERSONAL_PLACE = ['userNote', 'bought', 'skipTk', 'done'];
/** Личные/служебные поля города — не уезжают. */
const DROP_CITY = ['reminders', 'arrival', 'departure', 'arrivalDay', 'checkin', 'checkout', 'id', 'activeTab', 'sharedFrom', 'mode'];

/** Снимок для шаринга: маршрут + отель, без личного. */
function sanitizeForShare(city) {
  const c = city && typeof city === 'object' ? city : {};
  const out = { ...c };
  DROP_CITY.forEach((k) => delete out[k]);
  out.hotel = c.hotel ? { name: c.hotel.name || '', gmaps: c.hotel.gmaps || '' } : null;
  out.places = Array.isArray(c.places) ? c.places.map((p) => {
    const q = { ...p };
    PERSONAL_PLACE.forEach((k) => delete q[k]);
    return q;
  }) : [];
  return out;
}

router.post('/share', initDataAuth, async (req, res) => {
  const city = req.body && req.body.city;
  if (!city || typeof city !== 'object' || !city.name) return res.status(400).json({ error: 'city is required' });
  try {
    const token = crypto.randomBytes(7).toString('base64url'); // ~10 url-safe символов
    const payload = JSON.stringify(sanitizeForShare(city));
    await ds.run(
      'INSERT INTO shared_trip (token, owner_id, payload, created_at) VALUES (?, ?, ?, ?)',
      [token, String(req.userId || ''), payload, Date.now()],
    );
    const link = (BOT && APP) ? `https://t.me/${BOT}/${APP}?startapp=${token}` : '';
    res.json({ token, link });
  } catch (e) {
    console.error('share failed:', e.message);
    res.status(500).json({ error: 'share failed' });
  }
});

router.get('/shared/:token', initDataAuth, async (req, res) => {
  const token = String(req.params.token || '');
  if (!token) return res.json({ found: false });
  try {
    const row = await ds.get('SELECT payload FROM shared_trip WHERE token = ?', [token]);
    if (!row) return res.json({ found: false });
    res.json({ found: true, city: JSON.parse(row.payload) });
  } catch (e) {
    console.error('shared read failed:', e.message);
    res.json({ found: false });
  }
});

export default router;
