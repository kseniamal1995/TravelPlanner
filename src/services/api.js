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

  /** Запустить фоновую генерацию маршрута. Возвращает { jobId }.
   *  Генерация идёт на сервере ~30–70с; держать один длинный запрос нельзя
   *  (мобильный WebView рвёт соединение) — поэтому старт + опрос статуса. */
  async generateStart(input) {
    const r = await fetch(`${BASE}/generate`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(input),
    });
    if (!r.ok) {
      let detail = '';
      try { detail = (await r.json()).detail || ''; } catch { /* ignore */ }
      throw new Error('Не удалось запустить генерацию (' + r.status + ')' + (detail ? ': ' + detail : ''));
    }
    return r.json();
  },

  /** Опросить статус фоновой генерации. Возвращает { status, city?, mock?, detail? }. */
  async generateStatus(jobId) {
    const r = await fetch(`${BASE}/generate/status?jobId=` + encodeURIComponent(jobId), { headers: headers() });
    if (!r.ok) throw new Error('status ' + r.status);
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

  /** Импорт мест из Google Maps по ссылке. Возвращает { found, places:[{name,lat,lng,gmaps}] }. */
  async importLink(url) {
    const r = await fetch(`${BASE}/import/link`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ url }),
    });
    if (!r.ok) return { found: false, places: [] };
    return r.json();
  },

  /** Импорт мест из скриншота Google Maps. image — data-URL. Возвращает { found, places, engine }. */
  async importScreenshot(image) {
    const r = await fetch(`${BASE}/import/screenshot`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ image }),
    });
    if (!r.ok) return { found: false, places: [] };
    return r.json();
  },

  /** Поделиться маршрутом: сохранить снимок, получить { token, link }. */
  async shareTrip(city) {
    const r = await fetch(`${BASE}/share`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ city }),
    });
    if (!r.ok) throw new Error('share → ' + r.status);
    return r.json();
  },

  /** Получить общий маршрут по токену. Возвращает { found, city }. */
  async getShared(token) {
    const r = await fetch(`${BASE}/shared/` + encodeURIComponent(token), { headers: headers() });
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
