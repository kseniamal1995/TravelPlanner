/* Единый слой данных с двумя бэкендами:
 *   - Postgres  — если задан DATABASE_URL (прод на Railway);
 *   - SQLite    — иначе (локальная разработка, файл по DB_PATH).
 *
 * Интерфейс асинхронный (ds.run/get/all) и общий для обоих. SQL пишем с
 * плейсхолдерами `?`; для Postgres они конвертируются в $1,$2,... Upsert через
 * `ON CONFLICT ... DO UPDATE SET col = excluded.col` поддерживают оба движка.
 * См. docs/06-telegram-migration.md §4. */

const URL = process.env.DATABASE_URL || '';
export const isPg = !!URL;

// Тип для меток времени: Date.now() (~1.7e12) не влезает в 32-битный PG INTEGER → BIGINT.
const TS = isPg ? 'BIGINT' : 'INTEGER';

let _run, _get, _all, _exec;

if (isPg) {
  const { default: pg } = await import('pg');
  // Внутреннее соединение Railway (*.railway.internal) идёт без SSL; внешний URL — с SSL.
  const needSsl = !/railway\.internal|localhost|127\.0\.0\.1/.test(URL);
  const pool = new pg.Pool({ connectionString: URL, ssl: needSsl ? { rejectUnauthorized: false } : false });
  const toPg = (sql) => { let i = 0; return sql.replace(/\?/g, () => '$' + (++i)); };
  _exec = async (sql) => { await pool.query(sql); };
  _run = async (sql, params = []) => { await pool.query(toPg(sql), params); };
  _get = async (sql, params = []) => (await pool.query(toPg(sql), params)).rows[0] || null;
  _all = async (sql, params = []) => (await pool.query(toPg(sql), params)).rows;
} else {
  const { default: Database } = await import('better-sqlite3');
  const { mkdirSync } = await import('node:fs');
  const { dirname } = await import('node:path');
  const DB_PATH = process.env.DB_PATH || './data/planner.sqlite';
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  _exec = async (sql) => { db.exec(sql); };
  _run = async (sql, params = []) => { db.prepare(sql).run(...params); };
  _get = async (sql, params = []) => db.prepare(sql).get(...params) || null;
  _all = async (sql, params = []) => db.prepare(sql).all(...params);
}

export const ds = { run: _run, get: _get, all: _all, exec: _exec };

/** Создать таблицы (идемпотентно). Вызывать один раз при старте. */
export async function initSchema() {
  await ds.exec(`
    CREATE TABLE IF NOT EXISTS state (
      user_id    TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at ${TS} NOT NULL
    );
    CREATE TABLE IF NOT EXISTS city_profile (
      city_key   TEXT PRIMARY KEY,
      profile    TEXT NOT NULL,
      updated_at ${TS} NOT NULL
    );
    CREATE TABLE IF NOT EXISTS place (
      place_key  TEXT PRIMARY KEY,
      city_key   TEXT NOT NULL,
      name       TEXT NOT NULL,
      data       TEXT NOT NULL,
      updated_at ${TS} NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_place_city ON place(city_key);
    CREATE TABLE IF NOT EXISTS city_image (
      city_key   TEXT PRIMARY KEY,
      url        TEXT NOT NULL,
      updated_at ${TS} NOT NULL
    );
  `);
}
