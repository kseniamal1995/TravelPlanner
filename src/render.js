/* Полная перерисовка активного экрана (см. docs/05-architecture.md «Состояние и рендер»).
   Любая мутация: изменить store.S → save() → render(). */
import { store, city, imgQueue, cityImgQueue } from './store.js';
import { homeHtml } from './views/home.js';
import { planHtml } from './views/plan.js';
import { ideasHtml } from './views/ideas.js';
import { remHtml } from './views/reminders.js';
import { bnavHtml } from './views/nav.js';
import { fetchImg, fetchCityImg } from './services/photos.js';
import { applyWx, ensureWeather } from './services/weather.js';
import { syncNav } from './ui/tgChrome.js';

export function render() {
  const app = document.getElementById('app');
  let h;
  if (store.view === 'home') h = homeHtml();
  else if (store.view === 'ideas') h = ideasHtml();
  else if (store.view === 'reminders') h = remHtml();
  else h = planHtml();
  if (store.view !== 'home' && store.S.activeCity) h += bnavHtml();

  app.classList.toggle('anim', store.animPending);
  store.animPending = false;
  app.innerHTML = h;

  imgQueue.splice(0).forEach(fetchImg);
  cityImgQueue.splice(0).forEach(fetchCityImg);
  if (store.view === 'plan' && store.S.activeCity) { applyWx(city()); ensureWeather(city()); }

  // фейд краёв скроллируемого ряда табов (классы fadeL/fadeR → mask в tabs.css)
  const tabs = app.querySelector('.tabs');
  if (tabs) {
    const fade = () => {
      tabs.classList.toggle('fadeL', tabs.scrollLeft > 4);
      tabs.classList.toggle('fadeR', tabs.scrollLeft < tabs.scrollWidth - tabs.clientWidth - 4);
    };
    fade();
    tabs.addEventListener('scroll', fade, { passive: true });
  }

  syncNav(); // синхронизировать нативную кнопку «назад» Telegram с текущим экраном
}
