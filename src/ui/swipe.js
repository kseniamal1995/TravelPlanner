/* Свайп влево → удаление (iOS-стиль) для трёх типов карточек:
   .rcard (напоминание), .stop (место), .tripcard (маршрут целиком).
   Pointer events; вертикальный скролл не перехватываем (touch-action: pan-y у обёртки).
   Порог удаления — сдвиг левее THRESHOLD; иначе карточка возвращается на место. */
import { store, save, snapshot, openCards } from '../store.js';
import { render } from '../render.js';
import { esc } from '../lib/format.js';
import { showToast } from './toast.js';
import { tg } from '../services/telegram.js';

const THRESHOLD = 90;
let s = null;          // активный свайп
let suppress = false;  // подавить click после свайпа

function down(e) {
  suppress = false;
  if (e.button !== undefined && e.button !== 0) return;
  if (e.target.closest('input, a, button, label, select')) return;

  let card = null, type = null, id = null, cid = null;

  const rcard = e.target.closest('.rcard');
  if (rcard) { card = rcard; type = 'rem'; id = rcard.dataset.rid; cid = rcard.dataset.cid; }

  if (!card) {
    const stop = e.target.closest('.stop');
    if (stop && !e.target.closest('.thumb')) {
      card = stop; type = 'place'; id = stop.dataset.id; cid = stop.dataset.cid;
    }
  }

  if (!card) {
    const tc = e.target.closest('.tripcard');
    if (tc && !tc.classList.contains('pending')) {
      card = tc; type = 'trip'; cid = tc.dataset.cid;
    }
  }

  if (!card) return;
  s = { card, type, id, cid, x0: e.clientX, y0: e.clientY, dx: 0, active: false };
}

function move(e) {
  if (!s) return;
  const dx = e.clientX - s.x0;
  const dy = e.clientY - s.y0;
  if (!s.active) {
    if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < 8) { if (Math.abs(dy) > 10) s = null; return; }
    s.active = true;
    s.card.classList.add('swiping');
    s.card.parentElement.classList.add('swiping'); // обёртка — показать красную зону
  }
  if (e.cancelable) e.preventDefault();
  s.dx = Math.min(0, dx); // только влево
  s.card.style.transform = `translateX(${s.dx}px)`;
  s.card.classList.toggle('willdel', s.dx < -THRESHOLD);
}

function up() {
  if (!s) return;
  if (s.active) {
    suppress = true;
    if (s.dx < -THRESHOLD) { remove(s); s = null; return; }
    s.card.style.transform = '';
    s.card.classList.remove('swiping', 'willdel');
    s.card.parentElement.classList.remove('swiping');
  }
  s = null;
}

function remove(sw) {
  if (sw.type === 'rem') removeRem(sw);
  else if (sw.type === 'place') removePlc(sw);
  else if (sw.type === 'trip') removeTrip(sw);
}

function removeRem(sw) {
  const c = store.S.cities[sw.cid];
  if (!c) { render(); return; }
  snapshot();
  c.reminders = (c.reminders || []).filter((r) => r.id !== sw.id);
  tg.haptic('warning');
  save();
  render();
  showToast('Напоминание удалено', 1);
}

function removePlc(sw) {
  const c = store.S.cities[sw.cid];
  if (!c) { render(); return; }
  const p = (c.places || []).find((x) => x.id === sw.id);
  if (!p) { render(); return; }
  snapshot();
  c.places = c.places.filter((x) => x.id !== sw.id);
  openCards.delete(sw.id);
  tg.haptic('warning');
  save();
  render();
  showToast('«' + esc(p.name) + '» — удалено', 1);
}

function removeTrip(sw) {
  const c = store.S.cities[sw.cid];
  if (!c) { render(); return; }
  snapshot();
  const nm = c.name;
  delete store.S.cities[sw.cid];
  if (store.S.activeCity === sw.cid) store.S.activeCity = Object.keys(store.S.cities)[0] || null;
  tg.haptic('warning');
  save();
  store.view = 'home';
  render();
  showToast('«' + esc(nm) + '» удалено', 1);
}

export function registerSwipe() {
  document.addEventListener('pointerdown', down);
  document.addEventListener('pointermove', move, { passive: false });
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
  // гасим click, прилетающий после свайпа (чтобы карточка не раскрылась/не открылась)
  document.addEventListener('click', (e) => {
    if (suppress) { suppress = false; e.stopPropagation(); e.preventDefault(); }
  }, true);
}
