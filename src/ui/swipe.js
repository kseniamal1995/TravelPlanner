/* Свайп влево по карточке напоминания → удаление (iOS-стиль).
   Pointer events; вертикальный скролл не перехватываем (touch-action: pan-y у .rswipe).
   Порог удаления — сдвиг левее THRESHOLD; иначе карточка возвращается на место. */
import { store, save, snapshot } from '../store.js';
import { render } from '../render.js';
import { showToast } from './toast.js';
import { tg } from '../services/telegram.js';

const THRESHOLD = 90;
let s = null;          // активный свайп
let suppress = false;  // подавить click после свайпа

function down(e) {
  suppress = false;
  if (e.button !== undefined && e.button !== 0) return;
  const card = e.target.closest('.rcard');
  if (!card) return;
  if (e.target.closest('input, a, button, label')) return; // не мешаем контролам
  s = { card, id: card.dataset.rid, cid: card.dataset.cid, x0: e.clientX, y0: e.clientY, dx: 0, active: false };
}

function move(e) {
  if (!s) return;
  const dx = e.clientX - s.x0;
  const dy = e.clientY - s.y0;
  if (!s.active) {
    if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < 8) { if (Math.abs(dy) > 10) s = null; return; }
    s.active = true;
    s.card.classList.add('swiping');
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
  }
  s = null;
}

function remove(sw) {
  const c = store.S.cities[sw.cid];
  if (!c) { render(); return; }
  snapshot();
  c.reminders = (c.reminders || []).filter((r) => r.id !== sw.id);
  tg.haptic('warning');
  save();
  render();
  showToast('Напоминание удалено', 1);
}

export function registerSwipe() {
  document.addEventListener('pointerdown', down);
  document.addEventListener('pointermove', move, { passive: false });
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
  // гасим click, прилетающий после свайпа (чтобы карточка не раскрылась)
  document.addEventListener('click', (e) => {
    if (suppress) { suppress = false; e.stopPropagation(); e.preventDefault(); }
  }, true);
}
