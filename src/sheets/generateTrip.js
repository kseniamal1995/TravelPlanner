/* Шит «Новая поездка» — пошаговая форма онбординга (Этап 3).
 * Собирает вход для движка (город, даты, отель/прилёт/заселение, темп, интересы,
 * must-see, забронированные мероприятия), зовёт POST /api/generate и вливает
 * готовый City в store. См. docs/06-telegram-migration.md §2 (онбординг). */
import { DAY_THEMES } from '../config.js';
import { ic } from '../icons.js';
import { store, save } from '../store.js';
import { render } from '../render.js';
import { resetOv, openOv, closeOv } from '../ui/sheet.js';
import { api } from '../services/api.js';
import { tg } from '../services/telegram.js';
import { mountImportPanel, newImportState, selectedPlaces, placeFromImport } from './importPlaces.js';

const PACE = [['low', 'Спокойный'], ['med', 'Средний'], ['high', 'Активный']];
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
  const v = (id) => { const el = document.getElementById(id); return el ? el.value : undefined; };
  if (f.step === 0) {
    f.city = (v('g_city') ?? f.city).trim();
    f.tripStart = v('g_start') ?? f.tripStart;
    f.end = v('g_end') ?? f.end;
  } else if (f.step === 1) {
    f.arrival = v('g_arr') ?? f.arrival;
    f.departure = v('g_dep') ?? f.departure;
    const aa = v('g_arrair'); if (aa !== undefined) f.arrivalAirport = aa.trim();
    const da = v('g_depair'); if (da !== undefined) f.departureAirport = da.trim();
  } else if (f.step === 2) {
    f.hotel = (v('g_hotel') ?? f.hotel).trim();
    f.checkin = v('g_ci') ?? f.checkin;
    f.checkout = v('g_co') ?? f.checkout;
  } else if (f.step === 3) {
    const checked = document.querySelector('#ovBody input[name="g_pace"]:checked');
    if (checked) f.pace = checked.value;
  } else if (f.step === 4) {
    f.interests = [...document.querySelectorAll('#ovBody .chip.on')].map((x) => x.dataset.v);
  } else if (f.step === 5) {
    // Шаг «Свои места»: выбор хранится в f.importState (панель), отдельный collect не нужен.
  } else if (f.step === 6) {
    f.mustSee = v('g_must') ?? f.mustSee;
    f.fixedEvents = v('g_events') ?? f.fixedEvents;
  }
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
    html = `<label>Город</label><input id="g_city" placeholder="напр. Лиссабон" value="${esc(f.city)}">`
      + `<div class="two"><div><label>Первый день</label><input id="g_start" type="date" value="${esc(f.tripStart)}"></div>`
      + `<div><label>Последний день</label><input id="g_end" type="date" min="${esc(f.tripStart)}" value="${esc(f.end)}"></div></div>`;
  } else if (f.step === 1) {
    const opt = '<span class="opt">необязательно</span>';
    const arrFields = `<div class="two"><div><label>Время прилёта ${opt}</label><input id="g_arr" type="time" value="${esc(f.arrival)}"></div>`
      + `<div><label>Аэропорт</label><input id="g_arrair" placeholder="напр. FCO" value="${esc(f.arrivalAirport)}"></div></div>`;
    const depFields = `<div class="two"><div><label>Время вылета ${opt}</label><input id="g_dep" type="time" value="${esc(f.departure)}"></div>`
      + `<div><label>Аэропорт</label><input id="g_depair" placeholder="напр. FCO" value="${esc(f.departureAirport)}"></div></div>`;
    html = `<div class="fsec"><div class="fsec-h"><img src="/emoji/arrival.png" alt=""> Прилёт</div>${arrFields}</div>`
      + `<div class="fsec"><div class="fsec-h"><img src="/emoji/departure.png" alt=""> Вылет</div>${depFields}</div>`;
  } else if (f.step === 2) {
    const opt = '<span class="opt">необязательно</span>';
    html = `<label>Отель или район ${opt}</label><input id="g_hotel" placeholder="можно указать позже" value="${esc(f.hotel)}">`
      + `<div class="two"><div><label>Время заезда ${opt}</label><input id="g_ci" type="time" value="${esc(f.checkin)}"></div>`
      + `<div><label>Время выезда ${opt}</label><input id="g_co" type="time" value="${esc(f.checkout)}"></div></div>`;
  } else if (f.step === 3) {
    html = `<label>Темп прогулок</label><div class="picklist nodiv">`
      + PACE.map(([val, t]) => `<label class="pick"><input type="radio" name="g_pace" value="${val}" ${f.pace === val ? 'checked' : ''}><span>${t}</span></label>`).join('')
      + `</div>`;
  } else if (f.step === 4) {
    html = `<label>Интересы</label><div class="chips">`
      + DAY_THEMES.map(([, t, icon]) => `<button type="button" class="chip${f.interests.includes(t) ? ' on' : ''}" data-v="${esc(t)}">${ic(icon, 15)} ${t}</button>`).join('')
      + `</div>`;
  } else if (f.step === 5) {
    html = `<label>Свои места из Google Maps <span class="opt">необязательно</span></label>`
      + `<div class="hint" style="margin:0 0 6px">Загрузи скриншот списка мест или вставь ссылки — учтём их при составлении поездки.</div>`
      + `<div id="g_importpanel"></div>`;
  } else if (f.step === 6) {
    html = `<label>Обязательно увидеть</label>`
      + `<textarea id="g_must" rows="3" placeholder="Например:&#10;Колизей&#10;Ватикан">${esc(f.mustSee)}</textarea>`
      + `<label>Забронированные мероприятия</label>`
      + `<textarea id="g_events" rows="4" placeholder="Необязательно">${esc(f.fixedEvents)}</textarea>`
      + `<div class="hint">Напишите мероприятия, на которые у вас уже куплены билеты. Приложение учтёт их при составлении поездки.</div>`;
  }
  body.innerHTML = progBar(f.step, STEPS.length) + html;

  // Чипсы интересов — тоггл по клику (не нативные инпуты).
  body.querySelectorAll('.chip').forEach((ch) => { ch.onclick = () => { ch.classList.toggle('on'); tg.haptic('light'); }; });

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

/** Генерация в фоне: закрытая форма → плашка-заглушка на главной → готовый маршрут. */
export async function runGenerate(input) {
  store.pendingTrip = { city: input.city, input };
  store.view = 'home';
  store.S.activeCity = null;
  store.animPending = true;
  render();
  try {
    const { city, mock } = await api.generate(input);
    store.pendingTrip = null;
    // Далёкие импортированные места → в «Идеи → На потом» готовой поездки.
    if (input._farIdeas && input._farIdeas.length) {
      city.places = city.places || [];
      let order = Math.max(0, ...city.places.filter((x) => x.bucket === 'later').map((x) => x.order + 1), 0);
      for (const p of input._farIdeas) city.places.push(placeFromImport(p, city.name || input.city, order++));
    }
    store.S.cities[city.id] = city;
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

/** Повторить последнюю упавшую генерацию (кнопка на плашке-заглушке). */
export function retryPending() {
  if (store.pendingTrip && store.pendingTrip.input) runGenerate(store.pendingTrip.input);
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

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
