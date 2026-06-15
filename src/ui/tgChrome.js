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

/** Вызывается в конце render(): нативная кнопка «назад» Telegram для навигации
 *  верхнего уровня (вне home). MainButton не используем — у шитов свои кнопки. */
export function syncNav() {
  if (!tg.available || sheetOpen()) return;
  const offHome = !!document.querySelector('.back'); // .back рендерится только вне home
  setMainButton(null);
  setBackButton(offHome ? () => window.goHome && window.goHome() : null);
}

/** При открытии шита прячем нативный хром Telegram — используем кнопки шита (Назад/Далее). */
export function onSheetOpen() {
  if (!tg.available) return;
  setMainButton(null);
  setBackButton(null);
}

/** При закрытии шита восстанавливаем навигацию верхнего уровня. */
export function onSheetClose() {
  if (!tg.available) return;
  if (ovObserver) { ovObserver.disconnect(); ovObserver = null; }
  syncNav();
}
