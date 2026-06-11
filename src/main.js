/* Точка входа. Инициализирует Telegram-адаптер, состояние, события и первый рендер.
 *
 * Сгенерированный HTML использует inline-обработчики (onclick="goHome()" и т.п.).
 * В ESM-модулях такие функции не глобальны, поэтому мы явно вешаем их на window. */
import { initState } from './store.js';
import { render } from './render.js';
import { registerEvents } from './events.js';
import { registerDrag } from './ui/drag.js';
import { tg } from './services/telegram.js';
import { closeOv } from './ui/sheet.js';
import { undoLast } from './ui/toast.js';
import { goHome, openTrip2, goRem, setTab, setIdeas, goView, addDay, delDay } from './navigation.js';
// Шиты «Настроить день» (sheets/daySheet.js) и «Настройки поездки» (sheets/tripSettings.js)
// отключены в итерации 6 — файлы сохранены как наработки.
import { openAdd } from './sheets/addPlace.js';
import { openRem } from './sheets/reminder.js';
import { newTrip } from './sheets/newTrip.js';
import { generateTrip } from './sheets/generateTrip.js';
import { openArrival } from './sheets/arrival.js';
import { openDeparture } from './sheets/departure.js';

// Экспорт обработчиков для inline-onclick в сгенерированной разметке.
Object.assign(window, {
  closeOv, undoLast,
  goHome, openTrip2, goRem, setTab, setIdeas, goView, addDay, delDay,
  openAdd, openRem, newTrip, generateTrip, openArrival, openDeparture,
});

async function boot() {
  tg.init();
  registerEvents();
  registerDrag();
  // Закрытие шита по тапу на подложку.
  document.getElementById('ov').addEventListener('click', (e) => { if (e.target.id === 'ov') closeOv(); });
  await initState();
  render();
}

boot();
