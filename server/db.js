/* Хранилище состояния на пользователя. Один блоб JSON на user_id.
   Бэкенд (Postgres/SQLite) выбирается в datastore.js. */
import { ds } from './datastore.js';

/** Получить состояние пользователя (строка JSON) или null. */
export async function getState(userId) {
  const row = await ds.get('SELECT value FROM state WHERE user_id = ?', [userId]);
  return row ? row.value : null;
}

/** Сохранить состояние пользователя. */
export async function setState(userId, value) {
  await ds.run(
    `INSERT INTO state (user_id, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [userId, value, Date.now()],
  );
}
