/* Адаптер хранилища с единым интерфейсом { get(key), set(key, value) }.
 *
 * Слои (см. docs/03-data-model.md, docs/06-telegram-migration.md §4):
 *   1) бэкенд REST (источник истины в проде) — api.js;
 *   2) localStorage (офлайн-кэш и работа без сервера);
 *   3) память (последний фолбэк для сред без localStorage).
 *
 * Запись идёт во все доступные слои; чтение предпочитает бэкенд, затем кэш. */
import { api } from './api.js';

const mem = {};

function lsGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* приватный режим / квота */ }
}

export const storage = {
  async get(key) {
    try {
      const v = await api.getState();
      if (v != null) { mem[key] = v; lsSet(key, v); return v; }
    } catch { /* сервер недоступен — идём в кэш */ }
    const ls = lsGet(key);
    if (ls != null) { mem[key] = ls; return ls; }
    return mem[key] ?? null;
  },

  async set(key, value) {
    mem[key] = value;
    lsSet(key, value);
    try { await api.setState(value); } catch { /* офлайн: останется в localStorage */ }
  },
};
