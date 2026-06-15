/* Валидация Telegram initData (см. docs/06-telegram-migration.md §1.5).
 *
 * Проверяет HMAC-подпись initData и возраст auth_date, затем кладёт в req.userId
 * идентификатор Telegram-пользователя.
 *
 * DEV-режим: если BOT_TOKEN не задан, подпись НЕ проверяется и все запросы
 * относятся к DEV_USER_ID. Удобно для локальной разработки, НЕ для прода. */
import crypto from 'node:crypto';

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const DEV_USER_ID = process.env.DEV_USER_ID || 'dev';
const MAX_AGE = parseInt(process.env.INITDATA_MAX_AGE || '86400', 10);
// Белый список Telegram user id (через запятую). Если задан — доступ только этим
// пользователям (защита от чужих запросов к платному AI). Пусто = без ограничения.
const ALLOWED = (process.env.ALLOWED_USER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);

/** Проверить подпись и вернуть распарсенные поля или null. */
function verify(initData) {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  // Сравнение постоянного времени.
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const authDate = parseInt(params.get('auth_date') || '0', 10);
  if (!authDate || (Date.now() / 1000 - authDate) > MAX_AGE) return null;

  return params;
}

export function initDataAuth(req, res, next) {
  // DEV-режим без токена бота.
  if (!BOT_TOKEN) {
    req.userId = DEV_USER_ID;
    return next();
  }

  const initData = req.get('X-Telegram-Init-Data') || '';
  const params = verify(initData);
  if (!params) return res.status(401).json({ error: 'invalid initData' });

  try {
    const user = JSON.parse(params.get('user') || '{}');
    if (!user.id) return res.status(401).json({ error: 'no user' });
    // Белый список: пускаем только разрешённых пользователей (если список задан).
    if (ALLOWED.length && !ALLOWED.includes(String(user.id))) {
      return res.status(403).json({ error: 'access restricted' });
    }
    req.userId = 'tg:' + user.id;
  } catch {
    return res.status(401).json({ error: 'bad user payload' });
  }
  next();
}
