/* Синхронизация нативного «хрома» Telegram (BackButton / MainButton) с состоянием UI.
 * Вне Telegram все вызовы tg.* — no-op, так что модуль безопасен в обычном браузере.
 *
 * Логика:
 *  - На обычных экранах (не home) BackButton = «назад к поездкам» (window.goHome).
 *  - Когда открыт шит #ov, BackButton = «Отмена/Назад» (#ovCancel), а MainButton
 *    зеркалит главную кнопку шита #ovSave (текст, прогресс, доступность) через
 *    MutationObserver — это покрывает и многошаговую форму генерации. */
import { tg } from '../services/telegram.js';

let mbCleanup = null;   // отписка MainButton
let bbCleanup = null;   // отписка BackButton
let ovObserver = null;  // наблюдатель за #ovSave

function setMainButton(text, onClick) {
  if (mbCleanup) { mbCleanup(); mbCleanup = null; }
  if (text) mbCleanup = tg.mainButton(text, onClick);
}
function setBackButton(onClick) {
  if (bbCleanup) { bbCleanup(); bbCleanup = null; }
  if (onClick) bbCleanup = tg.backButton(onClick);
}

function sheetOpen() {
  const ov = document.getElementById('ov');
  return !!(ov && ov.classList.contains('on'));
}

/** Вызывается в конце render(): управляет BackButton для навигации верхнего уровня. */
export function syncNav() {
  if (!tg.available || sheetOpen()) return; // при открытом шите хром ведёт onSheetOpen
  const offHome = !!document.querySelector('.back'); // кнопка .back рендерится только вне home
  setMainButton(null);
  setBackButton(offHome ? () => window.goHome && window.goHome() : null);
}

/** Вызывается при открытии шита: зеркалит #ovSave в MainButton, #ovCancel — в BackButton. */
export function onSheetOpen() {
  if (!tg.available) return;
  const sv = document.getElementById('ovSave');
  const cancel = document.getElementById('ovCancel');
  if (!sv) return;

  const sync = () => {
    const hidden = sv.style.display === 'none';
    setMainButton(hidden ? null : (sv.textContent || 'Готово'), () => sv.click());
    if (!hidden) { tg.mainButtonProgress(!!sv.disabled); tg.mainButtonEnabled(!sv.disabled); }
  };
  sync();
  setBackButton(() => { if (cancel) cancel.click(); });

  ovObserver = new MutationObserver(sync);
  ovObserver.observe(sv, { attributes: true, attributeFilter: ['style', 'disabled'], childList: true, characterData: true, subtree: true });
}

/** Вызывается при закрытии шита: снимает наблюдатель и восстанавливает навигацию. */
export function onSheetClose() {
  if (!tg.available) return;
  if (ovObserver) { ovObserver.disconnect(); ovObserver = null; }
  tg.mainButtonProgress(false);
  setMainButton(null);
  syncNav();
}
