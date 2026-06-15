/* Переходы между экранами + добавление/удаление дня. Эти функции вешаются на window
   (inline-обработчики в сгенерированном HTML) — см. main.js. */
import { store, city, save, snapshot } from './store.js';
import { render } from './render.js';
import { plural, uid } from './lib/format.js';
import { showToast } from './ui/toast.js';
import { tg } from './services/telegram.js';
import { api } from './services/api.js';
import { openOv, closeOv } from './ui/sheet.js';

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
