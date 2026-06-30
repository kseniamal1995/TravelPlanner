/* Шаринг маршрута (MVP — поделиться копией). См. docs/10-backlog.md D.
   shareTrip(cityId)        — создать снимок на сервере и открыть шеринг Telegram.
   openSharedPreview(token) — превью общего маршрута из deep-link → импорт копии. */
import { uid, esc, plural } from '../lib/format.js';
import { store, city, save } from '../store.js';
import { render } from '../render.js';
import { resetOv, openOv, closeOv } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';
import { api } from '../services/api.js';
import { tg } from '../services/telegram.js';

/** Поделиться текущей (или указанной) поездкой. */
export async function shareTrip(cityId) {
  const c = cityId ? store.S.cities[cityId] : city();
  if (!c) return;
  showToast('Готовлю ссылку…');
  try {
    const { link } = await api.shareTrip(c);
    if (!link) { showToast('Бот ещё не настроен для ссылок'); return; }
    const how = tg.share(link, `Мой маршрут: ${c.name}`);
    if (how === 'copy') showToast('Ссылка скопирована');
    else if (how === 'none') showToast('Не удалось поделиться');
  } catch {
    showToast('Не удалось создать ссылку');
  }
}

/** Превью общего маршрута по токену → добавить копию к себе. */
export async function openSharedPreview(token) {
  let res = null;
  try { res = await api.getShared(token); } catch { /* сеть */ }
  if (!res || !res.found || !res.city) return; // токен не найден / истёк — молча
  const c = res.city;
  const days = Array.isArray(c.days) ? c.days.length : 0;
  const places = Array.isArray(c.places) ? c.places.length : 0;
  const sub = `${days ? days + ' ' + plural(days, ['день', 'дня', 'дней']) + ' · ' : ''}${places} ${plural(places, ['место', 'места', 'мест'])}`;

  resetOv();
  document.getElementById('ovTitle').textContent = 'Маршрут от друга';
  document.getElementById('ovBody').innerHTML =
    `<div class="arrblock"><div class="arrhdr">${esc(c.name)}</div><div class="arrbody">${sub}</div></div>`
    + `<div class="hint">Добавить этот маршрут к себе? Появится копия — можно редактировать как свою.</div>`;
  const sv = document.getElementById('ovSave');
  sv.textContent = 'Добавить к себе';
  sv.onclick = () => {
    const id = uid();
    const copy = { ...c, id, sharedFrom: token, activeTab: (c.days && c.days[0] && c.days[0].id) || null };
    store.S.cities[id] = copy;
    store.S.activeCity = id;
    save();
    closeOv();
    store.view = 'plan';
    store.animPending = true;
    render();
    showToast('Маршрут добавлен');
  };
  openOv();
}
