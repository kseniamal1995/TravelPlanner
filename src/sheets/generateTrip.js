/* Шит «Новая поездка» — пошаговая форма онбординга (Этап 3).
 * Собирает вход для движка (город, даты, отель/прилёт/заселение, темп, интересы,
 * must-see, забронированные мероприятия), зовёт POST /api/generate и вливает
 * готовый City в store. См. docs/06-telegram-migration.md §2 (онбординг). */
import { ic } from '../icons.js';
import { store, save, city as getActiveCity } from '../store.js';
import { render } from '../render.js';
import { resetOv, openOv, closeOv } from '../ui/sheet.js';
import { api } from '../services/api.js';
import { tg } from '../services/telegram.js';
import { mountImportPanel, newImportState, selectedPlaces, placeFromImport } from './importPlaces.js';
import {
  cityField, datesField, flightFields, hotelFields, paceField, interestsField, mustSeeField, eventsField,
  bindChips, collectCity, collectDates, collectFlight, collectHotel, collectPace, collectInterests, collectMustSee, collectEvents,
} from './tripFields.js';

const STEPS = ['Город и даты', 'Перелёт', 'Отель', 'Темп', 'Интересы', 'Свои места', 'Мероприятия'];
const TITLE = 'Новая поездка';

export function generateTrip() {
  resetOv();
  // Состояние формы переживает перерисовку шагов (вкл. панель импорта).
  const f = { step: 0, city: '', tripStart: '', end: '', hotel: '', arrival: '', departure: '', arrivalAirport: '', departureAirport: '', checkin: '', checkout: '', pace: 'med', interests: [], mustSee: '', fixedEvents: '', importState: newImportState() };
  document.getElementById('ov').classList.add('fullsheet');  // форма создания — на весь экран
  renderStep(f);
  openOv();
}

/** Считать значения видимых полей текущего шага в f (перед сменой шага). */
function collect(f) {
  if (f.step === 0) { collectCity(f); collectDates(f); }
  else if (f.step === 1) collectFlight(f);
  else if (f.step === 2) collectHotel(f);
  else if (f.step === 3) collectPace(f);
  else if (f.step === 4) collectInterests(f);
  // step 5 «Свои места»: выбор в f.importState (панель), отдельный collect не нужен.
  else if (f.step === 6) { collectMustSee(f); collectEvents(f); }
}

function progBar(step, total) {
  let s = '';
  for (let i = 0; i < total; i++) s += `<span class="seg${i <= step ? ' on' : ''}"></span>`;
  return `<div class="prog">${s}</div>`;
}

function renderStep(f) {
  document.getElementById('ovTitle').textContent = TITLE;
  const body = document.getElementById('ovBody');
  let html = '';

  if (f.step === 0) {
    html = cityField(f) + datesField(f);
  } else if (f.step === 1) {
    html = flightFields(f);
  } else if (f.step === 2) {
    html = hotelFields(f);
  } else if (f.step === 3) {
    html = paceField(f);
  } else if (f.step === 4) {
    html = interestsField(f);
  } else if (f.step === 5) {
    html = `<label>Свои места из Google Maps <span class="opt">необязательно</span></label>`
      + `<div class="hint" style="margin:0 0 6px">Загрузи скриншот списка мест или вставь ссылки — учтём их при составлении поездки.</div>`
      + `<div id="g_importpanel"></div>`;
  } else if (f.step === 6) {
    html = mustSeeField(f) + eventsField(f);
  }
  body.innerHTML = progBar(f.step, STEPS.length) + html;

  // Чипсы интересов — тоггл по клику (не нативные инпуты).
  bindChips(body);

  // Шаг «Свои места»: панель импорта прямо в форме (та же панель, что и в готовой поездке).
  if (f.step === 5) {
    const host = document.getElementById('g_importpanel');
    if (host) mountImportPanel(host, f.importState, () => f.city, null);
  }

  // Футер: слева квадратная кнопка «назад», справа основная кнопка на всю ширину.
  const cancel = document.getElementById('ovCancel');
  cancel.parentElement.classList.add('genfoot');
  cancel.classList.add('sq');
  cancel.innerHTML = ic('chevl', 18);
  cancel.setAttribute('aria-label', f.step === 0 ? 'Отмена' : 'Назад');
  cancel.onclick = () => {
    if (f.step === 0) { closeOv(); return; }
    collect(f); f.step--; renderStep(f);
  };

  const sv = document.getElementById('ovSave');
  sv.disabled = false;
  sv.textContent = f.step === STEPS.length - 1 ? 'Сгенерировать' : 'Далее';
  sv.onclick = () => {
    collect(f);
    if (f.step === 0 && !f.city) { document.getElementById('g_city').focus(); return; }
    if (f.step < STEPS.length - 1) { f.step++; renderStep(f); return; }
    submit(f);
  };
}

/** Сбор входных данных формы и запуск генерации (закрывает форму, показывает плашку). */
function submit(f) {
  // Импортированные места: близкие → must-see (AI строит вокруг них), далёкие → «Идеи» после генерации.
  const imported = selectedPlaces(f.importState, f.city);
  const nearNames = imported.filter((p) => p.near).map((p) => p.name);
  const farPlaces = imported.filter((p) => !p.near);
  const input = {
    city: f.city, tripStart: f.tripStart, days: daysBetween(f.tripStart, f.end),
    hotel: f.hotel, arrival: f.arrival, departure: f.departure, checkin: f.checkin, checkout: f.checkout,
    arrivalAirport: f.arrivalAirport, departureAirport: f.departureAirport,
    pace: f.pace,
    interests: f.interests,
    mustSee: [...splitLines(f.mustSee), ...nearNames],
    fixedEvents: splitLines(f.fixedEvents),
    _farIdeas: farPlaces, // клиентское поле: сервер игнорирует, добавим в «Идеи» после генерации
  };
  closeOv();
  runGenerate(input);
}

/** Генерация в фоне: закрытая форма → плашка-заглушка на главной → готовый маршрут.
 *  replaceId — id заменяемой поездки (перегенерация): старая удаляется после успеха. */
export async function runGenerate(input, replaceId = null) {
  store.pendingTrip = { city: input.city, input };
  store.view = 'home';
  store.S.activeCity = null;
  store.animPending = true;
  render();
  try {
    const { jobId } = await api.generateStart(input);
    const { city, mock } = await pollGeneration(jobId);
    store.pendingTrip = null;
    // Далёкие импортированные места → в «Идеи → На потом» готовой поездки.
    if (input._farIdeas && input._farIdeas.length) {
      city.places = city.places || [];
      let order = Math.max(0, ...city.places.filter((x) => x.bucket === 'later').map((x) => x.order + 1), 0);
      for (const p of input._farIdeas) city.places.push(placeFromImport(p, city.name || input.city, order++));
    }
    // сохраняем вход генерации на город — для экрана «Настройки поездки» и перегенерации
    city.genInput = {
      pace: input.pace, interests: input.interests || [],
      mustSee: input.mustSee || [], fixedEvents: input.fixedEvents || [],
      arrivalAirport: input.arrivalAirport || '', departureAirport: input.departureAirport || '',
    };
    city.dirty = false;
    store.S.cities[city.id] = city;
    if (replaceId && replaceId !== city.id) delete store.S.cities[replaceId]; // перегенерация: убрать старую версию
    store.S.activeCity = city.id;
    store.view = 'plan';
    await save();
    tg.haptic('success');
    store.animPending = true;
    render();
    if (mock) console.warn('Маршрут сгенерирован в MOCK-режиме (нет ANTHROPIC_API_KEY).');
  } catch (e) {
    store.pendingTrip = { city: input.city, input, error: true };
    tg.haptic('error');
    render();
    console.warn('Генерация не удалась:', e.message);
  }
}

/** Опрос фоновой генерации короткими запросами: устойчиво к обрывам мобильной
 *  сети/WebView (в отличие от одного длинного запроса). Возвращает { city, mock }. */
async function pollGeneration(jobId) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const DEADLINE = Date.now() + 1000 * 60 * 4; // ждём результат максимум 4 минуты
  let misses = 0;
  while (Date.now() < DEADLINE) {
    await sleep(2500);
    let s;
    try {
      s = await api.generateStatus(jobId);
    } catch (e) {
      // временный сбой сети/опроса — терпим несколько подряд, потом сдаёмся
      if (++misses > 8) throw e;
      continue;
    }
    misses = 0;
    if (s.status === 'done') return { city: s.city, mock: s.mock };
    if (s.status === 'error') throw new Error(s.detail || 'generation failed');
    // status === 'running' → продолжаем опрос
  }
  throw new Error('Генерация заняла слишком долго');
}

/** Повторить последнюю упавшую генерацию (кнопка на плашке-заглушке). */
export function retryPending() {
  if (store.pendingTrip && store.pendingTrip.input) runGenerate(store.pendingTrip.input);
}

/** Вход генерации из текущего города (для перегенерации по изменённым настройкам). */
function cityToGenInput(c) {
  const g = c.genInput || {};
  return {
    city: c.name,
    tripStart: c.tripStart,
    days: (c.days || []).length || 3,
    hotel: (c.hotel && c.hotel.name) || '',
    arrival: c.arrival || '', departure: c.departure || '',
    checkin: c.checkin || '', checkout: c.checkout || '',
    arrivalAirport: c.arrivalAirport || g.arrivalAirport || '',
    departureAirport: c.departureAirport || g.departureAirport || '',
    pace: g.pace || 'med',
    interests: g.interests || [],
    mustSee: g.mustSee || [],
    fixedEvents: g.fixedEvents || [],
  };
}

/** Диалог выбора перед перегенерацией: пересобрать заново или сохранить места. */
export function openRegenerate() {
  const c = getActiveCity();
  if (!c || !c.dirty) return;
  resetOv();
  document.getElementById('ovTitle').textContent = 'Перегенерировать поездку';
  document.getElementById('ovBody').innerHTML =
    `<div class="hint" style="margin:2px 0 16px">Настройки изменились. Как обновить маршрут?</div>`
    + `<div class="regen-opts">`
    + `<button class="regen-opt" onclick="regenerateTrip(true)"><div class="regen-opt-t">Сохранить мои места</div>`
    + `<div class="regen-opt-s">Оставим уже добавленные места и разложим их по новым дням и настройкам</div></button>`
    + `<button class="regen-opt" onclick="regenerateTrip(false)"><div class="regen-opt-t">Пересобрать заново</div>`
    + `<div class="regen-opt-s">Соберём маршрут с нуля. Ручные правки и добавленные места не сохранятся</div></button>`
    + `</div>`;
  // прячем стандартные кнопки шита — выбор делается опциями
  document.getElementById('ovSave').style.display = 'none';
  document.getElementById('ovCancel').textContent = 'Отмена';
  openOv();
}

/** Запустить перегенерацию. keepPlaces — подмешать текущие места в must-see. */
export function regenerateTrip(keepPlaces) {
  const c = getActiveCity();
  if (!c) return;
  const oldId = store.S.activeCity;
  const input = cityToGenInput(c);
  if (keepPlaces) {
    const inDay = (c.places || []).filter((p) => (c.days || []).some((d) => d.id === p.bucket)).map((p) => p.name);
    input.mustSee = [...new Set([...(input.mustSee || []), ...inDay])];
  }
  closeOv();
  runGenerate(input, oldId);
}

function splitLines(s) {
  return String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
}

/** Число дней поездки (включительно) из диапазона дат. Дефолт 3, если даты не заданы. */
function daysBetween(start, end) {
  if (!start || !end) return 3;
  const a = new Date(start + 'T00:00:00');
  const b = new Date(end + 'T00:00:00');
  const d = Math.round((b - a) / 86400000) + 1;
  return d >= 1 ? d : 1;
}
