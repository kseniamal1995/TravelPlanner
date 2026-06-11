/* Кэш справочных данных A/B (SQLite via better-sqlite3) — общий для всех пользователей.
 *
 * Слой A — факты о месте (рейтинг, описание, координаты, часы): таблица place.
 * Слой B — профиль города (районы/кластеры/подсказки): таблица city_profile.
 *
 * Цель — генерировать дорогие справочные данные один раз на город/место и
 * переиспользовать (экономия токенов LLM и вызовов внешних API). Персональный
 * маршрут (слой C) НЕ кэшируется — он уникален на пользователя.
 * См. docs/06-telegram-migration.md §2. */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH || './data/planner.sqlite';
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS city_profile (
    city_key   TEXT PRIMARY KEY,   -- нормализованное имя города
    profile    TEXT NOT NULL,      -- JSON слоя B
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS place (
    place_key  TEXT PRIMARY KEY,   -- city_key '::' нормализованное имя места
    city_key   TEXT NOT NULL,
    name       TEXT NOT NULL,
    data       TEXT NOT NULL,      -- JSON слоя A (факты о месте)
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_place_city ON place(city_key);
`);

/** Нормализация ключа: нижний регистр, схлопнутые пробелы. */
export function keyOf(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

const selProfile = db.prepare('SELECT profile, updated_at FROM city_profile WHERE city_key = ?');
const upProfile = db.prepare(`
  INSERT INTO city_profile (city_key, profile, updated_at) VALUES (@city_key, @profile, @updated_at)
  ON CONFLICT(city_key) DO UPDATE SET profile = @profile, updated_at = @updated_at
`);

/** Профиль города (слой B) или null. maxAgeMs — опционально считать устаревшие отсутствующими. */
export function getCityProfile(city, maxAgeMs) {
  const row = selProfile.get(keyOf(city));
  if (!row) return null;
  if (maxAgeMs && Date.now() - row.updated_at > maxAgeMs) return null;
  try { return JSON.parse(row.profile); } catch { return null; }
}

export function setCityProfile(city, profile) {
  upProfile.run({ city_key: keyOf(city), profile: JSON.stringify(profile), updated_at: Date.now() });
}

const selPlace = db.prepare('SELECT data, updated_at FROM place WHERE place_key = ?');
const upPlace = db.prepare(`
  INSERT INTO place (place_key, city_key, name, data, updated_at)
  VALUES (@place_key, @city_key, @name, @data, @updated_at)
  ON CONFLICT(place_key) DO UPDATE SET data = @data, updated_at = @updated_at
`);
const selPlacesByCity = db.prepare('SELECT name, data FROM place WHERE city_key = ?');

/** Факты о месте (слой A) или null. */
export function getPlace(city, name, maxAgeMs) {
  const row = selPlace.get(keyOf(city) + '::' + keyOf(name));
  if (!row) return null;
  if (maxAgeMs && Date.now() - row.updated_at > maxAgeMs) return null;
  try { return JSON.parse(row.data); } catch { return null; }
}

export function setPlace(city, name, data) {
  upPlace.run({
    place_key: keyOf(city) + '::' + keyOf(name),
    city_key: keyOf(city), name: String(name || ''),
    data: JSON.stringify(data), updated_at: Date.now(),
  });
}

/** Все известные места города (для подмешивания в промпт генерации). */
export function getPlacesByCity(city) {
  return selPlacesByCity.all(keyOf(city)).map((r) => {
    try { return { name: r.name, ...JSON.parse(r.data) }; } catch { return { name: r.name }; }
  });
}
