/* Роуты состояния пользователя. Защищены валидацией initData. */
import { Router } from 'express';
import { getState, setState } from '../db.js';
import { initDataAuth } from '../middleware/initData.js';

const router = Router();

router.get('/state', initDataAuth, async (req, res) => {
  try {
    res.json({ value: await getState(req.userId) });
  } catch (e) {
    console.error('GET /state failed:', e.message);
    res.status(500).json({ error: 'state read failed' });
  }
});

router.put('/state', initDataAuth, async (req, res) => {
  const { value } = req.body || {};
  if (typeof value !== 'string') return res.status(400).json({ error: 'value must be a JSON string' });
  try {
    await setState(req.userId, value);
    res.json({ ok: true });
  } catch (e) {
    console.error('PUT /state failed:', e.message);
    res.status(500).json({ error: 'state write failed' });
  }
});

export default router;
