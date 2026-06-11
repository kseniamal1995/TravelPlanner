/* Перетаскивание карточек мест: ручка = превью (фото/иконка слева).
   Pointer events; на таче работает за счёт touch-action:none у .thumb (cards.css).
   Тап по превью без движения остаётся обычным тапом (раскрытие карточки). */
import { city, save } from '../store.js';
import { render } from '../render.js';

let d = null;          // активное перетаскивание
let suppress = false;  // подавить click, прилетающий после драга

function down(e) {
  // новый жест: подавление клика касается только клика, идущего сразу за драгом
  suppress = false;
  if (e.button !== undefined && e.button !== 0) return;
  const th = e.target.closest('.stop .thumb');
  if (!th) return;
  const card = th.closest('.stop');
  d = { card, id: card.dataset.id, y0: e.clientY, active: false, items: [], ind: null, after: undefined };
}

function start() {
  d.active = true;
  d.card.classList.add('dragging');
  document.body.classList.add('noselect');
  // снимок позиций остальных карточек экрана (все они — один bucket)
  d.items = [...document.querySelectorAll('.stop')]
    .filter((el) => el !== d.card)
    .map((el) => { const r = el.getBoundingClientRect(); return { el, id: el.dataset.id, mid: r.top + r.height / 2 }; });
  d.ind = document.createElement('div');
  d.ind.className = 'dropline';
}

function move(e) {
  if (!d) return;
  const dy = e.clientY - d.y0;
  if (!d.active) { if (Math.abs(dy) < 7) return; start(); }
  if (e.cancelable) e.preventDefault();
  d.card.style.transform = `translateY(${dy}px)`;
  let after = null;
  for (const it of d.items) if (it.mid < e.clientY) after = it;
  if (after) after.el.after(d.ind);
  else if (d.items.length) d.items[0].el.before(d.ind);
  d.after = after;
}

function up() {
  if (!d) return;
  if (d.active) {
    suppress = true;
    const c = city();
    const p = c.places.find((x) => x.id === d.id);
    if (p) {
      const grp = c.places.filter((x) => x.bucket === p.bucket && x.id !== p.id).sort((a, b) => a.order - b.order);
      let idx = d.after ? grp.findIndex((x) => x.id === d.after.id) + 1 : 0;
      if (idx < 0) idx = grp.length;
      grp.splice(idx, 0, p);
      grp.forEach((x, i) => { x.order = i; });
      save();
    }
    cleanup();
    render();
  }
  d = null;
}

function cancel() {
  if (d && d.active) {
    d.card.classList.remove('dragging');
    d.card.style.transform = '';
    cleanup();
  }
  d = null;
}

function cleanup() {
  if (d.ind) d.ind.remove();
  document.body.classList.remove('noselect');
}

export function registerDrag() {
  document.addEventListener('pointerdown', down);
  document.addEventListener('pointermove', move, { passive: false });
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', cancel);
  // фото в превью — <img>: гасим нативный drag картинки, иначе он перехватывает pointer-события
  document.addEventListener('dragstart', (e) => { if (e.target.closest && e.target.closest('.stop .thumb')) e.preventDefault(); });
  // после завершённого драга браузер шлёт click — гасим его, чтобы карточка не раскрылась
  document.addEventListener('click', (e) => {
    if (suppress) { suppress = false; e.stopPropagation(); e.preventDefault(); }
  }, true);
}
