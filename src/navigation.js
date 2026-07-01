/* Переходы между экранами + добавление/удаление дня. Эти функции вешаются на window
   (inline-обработчики в сгенерированном HTML) — см. main.js. */
import { store, city, save, snapshot } from './store.js';
import { render } from './render.js';
import { plural, uid } from './lib/format.js';
import { showToast } from './ui/toast.js';
import { tg } from './services/telegram.js';
import { api } from './services/api.js';
import { openOv, closeOv } from './ui/sheet.js';
import { collectDates, collectFlight, collectHotel, collectPace, collectInterests, collectMustSee, collectEvents } from './sheets/tripFields.js';

export function goHome() {
  store.view = 'home';
  store.S.activeCity = null;
  store.animPending = true;
  save();
  render();
}

export function openTrip2(id) {
  store.S.activeCity = id;
  store.view = 'plan';
  store.animPending = true;
  save();
  render();
}

/** Открыть напоминания. scope: 'all' (с главной) | 'trip' (со страницы поездки).
 *  Одна поездка → её таб (без табов). Несколько → 'all' или таб текущей поездки. */
export function goRem(scope) {
  const ids = Object.keys(store.S.cities || {});
  if (ids.length <= 1) store.remTab = ids[0] || 'all';
  else store.remTab = (scope === 'trip' && store.S.activeCity) ? store.S.activeCity : 'all';
  store.view = 'reminders';
  store.animPending = true;
  render();
}

/** Открыть настройки поездки (кнопка-настройки в шапке плана). */
export function openSettings() {
  store.settingsSub = null;
  store.view = 'settings';
  store.animPending = true;
  render();
}

/** Открыть подстраницу настроек: 'dates' | 'hotel' | 'flight' | 'route'. */
export function openSettingsSub(name) {
  store.settingsSub = name;
  store.animPending = true;
  render();
}

/** «Назад» в настройках: из подстраницы → список, из списка → план. */
export function settingsBack() {
  if (store.settingsSub) {
    store.settingsSub = null;
  } else {
    store.view = 'plan';
  }
  store.animPending = true;
  render();
}

/** Число дней (включительно) из ISO-дат. */
function daysInRange(start, end) {
  if (!start || !end) return null;
  const a = new Date(start + 'T00:00:00');
  const b = new Date(end + 'T00:00:00');
  const d = Math.round((b - a) / 86400000) + 1;
  return d >= 1 ? d : 1;
}

/** Привести число дней города к n: добавить пустые дни в конец или убрать
 *  лишние (их места → «На потом»). Возвращает число перенесённых мест. */
function syncDays(c, n) {
  let moved = 0;
  const cur = (c.days || []).length;
  if (n > cur) {
    for (let i = cur; i < n; i++) c.days.push({ id: 'd' + uid(), mode: 'walking', first: null, theme: '' });
  } else if (n < cur) {
    const removed = c.days.slice(n);
    const ids = new Set(removed.map((d) => d.id));
    c.places.filter((p) => ids.has(p.bucket)).forEach((p) => { p.bucket = 'later'; moved++; });
    c.days = c.days.slice(0, n);
    if (ids.has(c.activeTab)) c.activeTab = c.days[c.days.length - 1].id;
  }
  return moved;
}

/** Сохранить подстраницу настроек: записать поля в город, синхронизировать дни,
 *  пометить поездку изменённой (dirty) для кнопки «Перегенерировать», вернуться к списку. */
export function saveSettingsSub() {
  const c = city();
  const sub = store.settingsSub;
  snapshot();
  c.genInput = c.genInput || {};
  let toast = '';

  if (sub === 'dates') {
    const t = {};
    collectDates(t); // t.tripStart, t.end
    if (t.tripStart) c.tripStart = t.tripStart;
    const n = daysInRange(c.tripStart, t.end);
    if (n) {
      const moved = syncDays(c, n);
      toast = moved ? `${moved} ${plural(moved, ['место', 'места', 'мест'])} в «На потом»` : '';
    }
  } else if (sub === 'hotel') {
    const t = {};
    collectHotel(t);
    if (t.hotel) {
      if (c.hotel) c.hotel.name = t.hotel;
      else c.hotel = { name: t.hotel, gmaps: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(t.hotel + ' ' + c.name) };
    } else { c.hotel = null; }
    c.checkin = t.checkin || ''; c.checkout = t.checkout || '';
  } else if (sub === 'flight') {
    const t = {};
    collectFlight(t);
    c.arrival = t.arrival || ''; c.departure = t.departure || '';
    c.arrivalAirport = t.arrivalAirport || ''; c.departureAirport = t.departureAirport || '';
    c.genInput.arrivalAirport = c.arrivalAirport; c.genInput.departureAirport = c.departureAirport;
  } else if (sub === 'route') {
    const t = {};
    collectPace(t); collectInterests(t); collectMustSee(t); collectEvents(t);
    if (t.pace) c.genInput.pace = t.pace;
    c.genInput.interests = t.interests || [];
    c.genInput.mustSee = String(t.mustSee || '').split('\n').map((x) => x.trim()).filter(Boolean);
    c.genInput.fixedEvents = String(t.fixedEvents || '').split('\n').map((x) => x.trim()).filter(Boolean);
  }

  c.dirty = true; // настройки изменены → показать/активировать «Перегенерировать»
  store.settingsSub = null;
  store.animPending = true;
  save();
  render();
  tg.haptic('success');
  showToast('Сохранено' + (toast ? ' · ' + toast : ''), 1);
}

/** Скрыть онбординг-подсказку в «Идеях» (после первой генерации). */
export function dismissIdeasHint() {
  store.S.ideasHint = false;
  save();
  render();
}

/** Переключить таб напоминаний (клик по табу). */
export function setRemTab(id) {
  if (store.remTab === id) return;
  store.remTab = id;
  store.animPending = true;
  render();
}

export function setTab(id) {
  const c = city();
  if (c.activeTab === id) return;
  c.activeTab = id;
  store.animPending = true;
  save();
  render();
}

export function setIdeas(id) {
  store.ideasTab = id;
  render();
}

export function goView(v) {
  if (store.view === v) return;
  // Нижняя навигация доступна внутри поездки → открываем таб текущей поездки.
  if (v === 'reminders') store.remTab = store.S.activeCity || 'all';
  store.view = v;
  store.animPending = true;
  render();
}

/** Добавить день (таб «+»): создаём день и догенерируем для него места через AI. */
export async function addDay() {
  const c = city();
  snapshot();
  const dayId = 'd' + uid();
  c.days.push({ id: dayId, mode: 'walking', first: null, theme: '' });
  c.activeTab = dayId;
  store.animPending = true;
  save();
  render();

  // Спиннер генерации в шите (закрытие заблокировано флагом store.generating).
  document.getElementById('ovTitle').textContent = 'Новый день';
  document.getElementById('ovBody').innerHTML = `<div class="genwait"><div class="genspin"></div><div class="hint">Подбираю места на новый день…</div></div>`;
  const cancel = document.getElementById('ovCancel');
  const sv = document.getElementById('ovSave');
  cancel.style.display = 'none';
  sv.style.display = 'none';
  store.generating = true;
  openOv();

  try {
    const interests = ((c.days.find((d) => d.theme) || {}).theme || '').split(/[·,]/).map((s) => s.trim()).filter(Boolean);
    const existing = c.places.map((p) => p.name);
    const { theme, places } = await api.generateDay({ city: c.name, dayIndex: c.days.length - 1, pace: 'med', interests, existing });
    store.generating = false;
    const day = c.days.find((d) => d.id === dayId);
    if (day && theme) day.theme = theme;
    let order = 0;
    (places || []).forEach((p) => { p.id = 'p' + uid(); p.bucket = dayId; p.order = order++; c.places.push(p); });
    save();
    closeOv();
    store.animPending = true;
    render();
    tg.haptic('success');
  } catch {
    store.generating = false;
    closeOv();
    showToast('Не удалось сгенерировать день — добавь места вручную', 0);
  } finally {
    cancel.style.display = '';
    sv.style.display = '';
  }
}

export function delDay(id) {
  const c = city();
  if (c.days.length <= 1) return;
  snapshot();
  const moved = c.places.filter((p) => p.bucket === id).length;
  c.places.filter((p) => p.bucket === id).forEach((p) => { p.bucket = 'later'; });
  c.days = c.days.filter((d) => d.id !== id);
  if (c.activeTab === id) c.activeTab = c.days[0].id;
  tg.haptic('warning');
  save();
  render();
  showToast('День удалён' + (moved ? ` · ${moved} ${plural(moved, ['место', 'места', 'мест'])} в «На потом»` : ''), 1);
}
