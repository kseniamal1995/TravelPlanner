/* Тост с undo (см. docs/05-architecture.md «Undo»). */
import { store, save } from '../store.js';
import { render } from '../render.js';
import { tg } from '../services/telegram.js';

let toastTimer = null;

/** Показать тост на 5 секунд; при undo=true добавляет кнопку «Отменить». */
export function showToast(msg, undo) {
  const el = document.getElementById('toast');
  el.innerHTML = '<span>' + msg + '</span>' + (undo ? '<button onclick="undoLast()">Отменить</button>' : '');
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 5000);
}

/** Откатить состояние к последнему снапшоту. */
export function undoLast() {
  if (!store.undoSnap) return;
  store.S = JSON.parse(store.undoSnap);
  store.undoSnap = null;
  tg.haptic('medium');
  save();
  render();
  document.getElementById('toast').classList.remove('on');
}
