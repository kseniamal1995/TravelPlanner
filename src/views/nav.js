/* Нижняя навигация внутри поездки: План / Идеи / Напоминания. */
import { ic } from '../icons.js';
import { store } from '../store.js';

export function bnavHtml() {
  const items = [['plan', 'route', 'План'], ['ideas', 'bulb', 'Идеи'], ['reminders', 'bell', 'Напоминания']];
  return '<div class="bnav">' + items.map(([v, n, lb]) =>
    `<button class="${store.view === v ? 'on' : ''}" onclick="goView('${v}')"><span class="bi">${ic(n, 20)}</span>${lb}</button>`
  ).join('') + '</div>';
}
