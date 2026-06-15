/* Шит «Новое напоминание»: текст + крайняя дата. Добавляет в указанную поездку
   (cid из таба напоминаний) либо в активную. */
import { uid } from '../lib/format.js';
import { store, save } from '../store.js';
import { render } from '../render.js';
import { resetOv, openOv, closeOv } from '../ui/sheet.js';

export function openRem(cid) {
  const cityId = (cid && store.S.cities[cid]) ? cid
    : (store.remTab && store.S.cities[store.remTab]) ? store.remTab
    : store.S.activeCity;
  const c = store.S.cities[cityId];
  if (!c) return;
  resetOv();
  document.getElementById('ovTitle').textContent = 'Новое напоминание';
  document.getElementById('ovBody').innerHTML = `<label>Текст</label><input id="r_text" placeholder="напр. Купить музейную карту"><label>Крайняя дата</label><input id="r_due" type="date">`;
  document.getElementById('ovSave').onclick = () => {
    const tx = document.getElementById('r_text').value.trim();
    if (!tx) { closeOv(); return; }
    if (!c.reminders) c.reminders = [];
    c.reminders.push({ id: 'r' + uid(), text: tx, due: document.getElementById('r_due').value || '', done: false });
    save();
    closeOv();
    render();
  };
  openOv();
}
