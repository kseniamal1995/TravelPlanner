/* Кэш справочных данных A/B — общий для всех пользователей.
 *   Слой A — факты о месте: таблица place.
 *   Слой B — профиль города: таблица city_profile.
 * Бэкенд (Postgres/SQLite) выбирается в datastore.js. Персональный маршрут (C)
 * не кэшируется. См. docs/06-telegram-migration.md §2. */
import { ds } from './datastore.js';

/** Нормализация ключа: нижний регистр, схлопнутые пробелы. */
export function keyOf(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Профиль города (слой B) или null. maxAgeMs — опционально считать устаревшие отсутствующими. */
export async function getCityProfile(city, maxAgeMs) {
  const row = await ds.get('SELECT profile, updated_at FROM city_profile WHERE city_key = ?', [keyOf(city)]);
  if (!row) return null;
  if (maxAgeMs && Date.now() - Number(row.updated_at) > maxAgeMs) return null;
  try { return JSON.parse(row.profile); } catch { return null; }
}

export async function setCityProfile(city, profile) {
  // Кэш — оптимизация: ошибка записи не должна ронять генерацию маршрута.
  try {
    await ds.run(
      `INSERT INTO city_profile (city_key, profile, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(city_key) DO UPDATE SET profile = excluded.profile, updated_at = excluded.updated_at`,
      [keyOf(city), JSON.stringify(profile), Date.now()],
    );
  } catch (e) { console.warn('setCityProfile failed (ignored):', e.message); }
}

/** Факты о месте (слой A) или null. */
export async function getPlace(city, name, maxAgeMs) {
  const row = await ds.get('SELECT data, updated_at FROM place WHERE place_key = ?', [keyOf(city) + '::' + keyOf(name)]);
  if (!row) return null;
  if (maxAgeMs && Date.now() - Number(row.updated_at) > maxAgeMs) return null;
  try { return JSON.parse(row.data); } catch { return null; }
}

export async function setPlace(city, name, data) {
  // Кэш — оптимизация: ошибка записи не должна ронять генерацию маршрута.
  try {
    await ds.run(
      `INSERT INTO place (place_key, city_key, name, data, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(place_key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      [keyOf(city) + '::' + keyOf(name), keyOf(city), String(name || ''), JSON.stringify(data), Date.now()],
    );
  } catch (e) { console.warn('setPlace failed (ignored):', e.message); }
}

/** Картинка города (URL) из кэша. undefined = не кэшировано; '' = кэшировано без картинки. */
export async function getCityImage(city) {
  const row = await ds.get('SELECT url FROM city_image WHERE city_key = ?', [keyOf(city)]);
  return row ? row.url : undefined;
}

export async function setCityImage(city, url) {
  await ds.run(
    `INSERT INTO city_image (city_key, url, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(city_key) DO UPDATE SET url = excluded.url, updated_at = excluded.updated_at`,
    [keyOf(city), url || '', Date.now()],
  );
}

/** Все известные места города (для подмешивания в промпт генерации). */
export async function getPlacesByCity(city) {
  const rows = await ds.all('SELECT name, data FROM place WHERE city_key = ?', [keyOf(city)]);
  return rows.map((r) => {
    try { return { name: r.name, ...JSON.parse(r.data) }; } catch { return { name: r.name }; }
  });
}
