/* REST-клиент к бэкенду фазы 1. Состояние хранится одним блобом на пользователя
   (пользователь определяется по подписи Telegram initData на сервере). */
import { tgInitData } from './telegram.js';

const BASE = '/api';

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': tgInitData(),
  };
}

export const api = {
  /** Получить состояние пользователя. Возвращает строку JSON или null. */
  async getState() {
    const r = await fetch(`${BASE}/state`, { headers: headers() });
    if (!r.ok) throw new Error('GET /state → ' + r.status);
    const j = await r.json();
    return j.value ?? null;
  },

  /** Сохранить состояние пользователя (value — строка JSON). */
  async setState(value) {
    const r = await fetch(`${BASE}/state`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ value }),
    });
    if (!r.ok) throw new Error('PUT /state → ' + r.status);
  },

  /** Сгенерировать маршрут (слой C). input — данные онбординга. Возвращает { city, mock? }. */
  async generate(input) {
    const r = await fetch(`${BASE}/generate`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(input),
    });
    if (!r.ok) {
      let detail = '';
      try { detail = (await r.json()).detail || ''; } catch { /* ignore */ }
      throw new Error('Генерация не удалась (' + r.status + ')' + (detail ? ': ' + detail : ''));
    }
    return r.json();
  },

  /** Догенерировать один день к поездке. Возвращает { theme, places, mock? }. */
  async generateDay(input) {
    const r = await fetch(`${BASE}/generate-day`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(input),
    });
    if (!r.ok) throw new Error('Не удалось сгенерировать день (' + r.status + ')');
    return r.json();
  },

  /** Поиск рейса по номеру и дате (YYYY-MM-DD). Возвращает { found, depAirport, depTime, arrAirport, arrTime }. */
  async flight(no, date) {
    const r = await fetch(`${BASE}/flight?no=` + encodeURIComponent(no) + '&date=' + encodeURIComponent(date), { headers: headers() });
    if (!r.ok) return { found: false };
    return r.json();
  },

  /** Картинка города (кэшируется на сервере). Возвращает URL или ''. */
  async cityImage(city) {
    const r = await fetch(`${BASE}/city-image?city=` + encodeURIComponent(city), { headers: headers() });
    if (!r.ok) return '';
    return (await r.json()).url || '';
  },
};
