/* Делегированные обработчики на document (см. docs/05-architecture.md «События»). */
import { store, city, save, snapshot, openCards, openRems } from './store.js';
import { render } from './render.js';
import { esc } from './lib/format.js';
import { showToast } from './ui/toast.js';
import { tg } from './services/telegram.js';

function onClick(e) {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act, id = t.dataset.id;

  // раскрытие карточки места (guard на интерактивные элементы)
  if (act === 'card') {
    if (e.target.closest('a,button,input,select,textarea,label')) return;
    openCards.has(id) ? openCards.delete(id) : openCards.add(id);
    t.classList.toggle('open');
    tg.haptic('light');
    return;
  }
  // раскрытие напоминания
  if (act === 'remtoggle') {
    if (e.target.closest('a,input,label')) return;
    openRems.has(id) ? openRems.delete(id) : openRems.add(id);
    t.closest('.rcard').classList.toggle('open');
    return;
  }
  // раскрытие подробностей стартового перегона
  if (act === 'legmore') {
    t.classList.toggle('open');
    return;
  }
  // редактор места
  if (act === 'toggle') {
    const eb = t.closest('.stop').querySelector('.editbody');
    if (eb) eb.classList.toggle('on');
    return;
  }
  // чекбокс напоминания
  if (act === 'rem') {
    const cid = t.dataset.cid || store.S.activeCity;
    const r = (store.S.cities[cid].reminders || []).find((x) => x.id === id);
    if (r) { r.done = t.checked; save(); render(); }
    return;
  }

  const c = city();
  const p = c.places.find((x) => x.id === id);
  if (!p) return;
  if (act === 'buy') { p.bought = !p.bought; if (p.bought) p.skipTk = false; tg.haptic(p.bought ? 'success' : 'light'); save(); render(); }
  // «Не покупать билет» / «Нужен билет» — тоггл осознанного отказа от билета
  else if (act === 'skiptk') { p.skipTk = !p.skipTk; if (p.skipTk) p.bought = false; tg.haptic('light'); save(); render(); }
  /* Чек «посещено» отключён (фидбек итерации 6):
  else if (act === 'visit') { p.done = !p.done; save(); render(); } */
  else if (act === 'del') {
    snapshot();
    const nm = p.name;
    c.places = c.places.filter((x) => x.id !== id);
    openCards.delete(id);
    tg.haptic('warning');
    save();
    render();
    showToast('«' + esc(nm) + '» — удалено', 1);
  }
}

function onChange(e) {
  const t = e.target.closest('[data-act="move"]');
  if (!t) return;
  const c = city();
  const p = c.places.find((x) => x.id === t.dataset.id);
  p.bucket = t.value;
  p.order = Math.max(0, ...c.places.filter((x) => x.bucket === t.value).map((x) => x.order + 1), 0);
  save();
  render();
}

function onInput(e) {
  const t = e.target.closest('[data-act="note"]');
  if (!t) return;
  const c = city();
  c.places.find((x) => x.id === t.dataset.id).userNote = t.value;
  save();
}

export function registerEvents() {
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
}
