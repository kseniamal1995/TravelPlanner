/* Переходы между экранами + добавление/удаление дня. Эти функции вешаются на window
   (inline-обработчики в сгенерированном HTML) — см. main.js. */
import { store, city, save, snapshot } from './store.js';
import { render } from './render.js';
import { plural, uid } from './lib/format.js';
import { showToast } from './ui/toast.js';
import { tg } from './services/telegram.js';

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

export function goRem(scope) {
  store.remScope = scope;
  store.view = 'reminders';
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
  if (v === 'reminders') store.remScope = 'trip';
  store.view = v;
  store.animPending = true;
  render();
}

/** Добавить день (таб «+»): пустой день в конец, сразу открывается. */
export function addDay() {
  const c = city();
  snapshot();
  c.days.push({ id: 'd' + uid(), mode: 'walking', first: null });
  c.activeTab = c.days[c.days.length - 1].id;
  store.animPending = true;
  save();
  render();
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
