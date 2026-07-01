/* Нижняя навигация внутри поездки: План / Идеи / Напоминания. */
import { ic } from '../icons.js';
import { store, city } from '../store.js';
import { cityDot } from '../lib/reminders.js';

export function bnavHtml() {
  const hasDot = cityDot(city());
  const items = [['plan', 'route', 'План'], ['ideas', 'bulb', 'Идеи'], ['reminders', 'bell', 'Напоминания']];
  return '<div class="bnav">' + items.map(([v, n, lb]) => {
    const dot = (v === 'reminders' && hasDot) ? ' hasdot' : '';
    return `<button class="${store.view === v ? 'on' : ''}${dot}" onclick="goView('${v}')"><span class="bi">${ic(n, 20)}</span>${lb}</button>`;
  }).join('') + '</div>';
}
