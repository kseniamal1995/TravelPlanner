/* Общий bottom-sheet #ov: каждый «открыватель» наполняет ovBody и переназначает
   ovSave.onclick (см. docs/05-architecture.md). */
import { onSheetOpen, onSheetClose } from './tgChrome.js';

/** Вернуть кнопки шита к дефолтному виду (Отмена / Сохранить). */
export function resetOv() {
  const cancel = document.getElementById('ovCancel');
  cancel.style.display = '';
  cancel.textContent = 'Отмена';
  const sv = document.getElementById('ovSave');
  sv.style.display = '';
  sv.textContent = 'Сохранить';
}

/** Открыть шит. */
export function openOv() {
  document.getElementById('ov').classList.add('on');
  onSheetOpen();
}

/** Закрыть шит. */
export function closeOv() {
  document.getElementById('ov').classList.remove('on');
  onSheetClose();
}
