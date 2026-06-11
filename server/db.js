/* Хранилище состояния на пользователя (SQLite via better-sqlite3).
   Один блоб JSON на user_id. Заменяется на Postgres без смены интерфейса. */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH || './data/planner.sqlite';
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS state (
    user_id    TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

const selectStmt = db.prepare('SELECT value FROM state WHERE user_id = ?');
const upsertStmt = db.prepare(`
  INSERT INTO state (user_id, value, updated_at) VALUES (@user_id, @value, @updated_at)
  ON CONFLICT(user_id) DO UPDATE SET value = @value, updated_at = @updated_at
`);

/** Получить состояние пользователя (строка JSON) или null. */
export function getState(userId) {
  const row = selectStmt.get(userId);
  return row ? row.value : null;
}

/** Сохранить состояние пользователя. */
export function setState(userId, value) {
  upsertStmt.run({ user_id: userId, value, updated_at: Date.now() });
}
