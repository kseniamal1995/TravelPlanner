/* Роуты состояния пользователя. Защищены валидацией initData. */
import { Router } from 'express';
import { getState, setState } from '../db.js';
import { initDataAuth } from '../middleware/initData.js';

const router = Router();

router.get('/state', initDataAuth, (req, res) => {
  res.json({ value: getState(req.userId) });
});

router.put('/state', initDataAuth, (req, res) => {
  const { value } = req.body || {};
  if (typeof value !== 'string') return res.status(400).json({ error: 'value must be a JSON string' });
  setState(req.userId, value);
  res.json({ ok: true });
});

export default router;
