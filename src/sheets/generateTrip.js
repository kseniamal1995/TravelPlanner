/* Шит «Сгенерировать маршрут» — пошаговая форма онбординга (Этап 3).
 * Собирает вход для движка (город, даты, отель, темп, интересы, must-see,
 * фиксированные события), зовёт POST /api/generate и вливает готовый City в store.
 * См. docs/06-telegram-migration.md §2 (онбординг). */
import { DAY_THEMES } from '../config.js';
import { store, save } from '../store.js';
import { render } from '../render.js';
import { resetOv, openOv, closeOv } from '../ui/sheet.js';
import { api } from '../services/api.js';
import { tg } from '../services/telegram.js';

const PACE = [['low', 'Спокойный'], ['med', 'Средний'], ['high', 'Активный']];
const STEPS = ['Город и даты', 'Отель и темп', 'Интересы', 'События'];
const TITLE = 'Новая поездка';

export function generateTrip() {
  resetOv();
  // Состояние формы переживает перерисовку шагов.
  const f = { step: 0, city: '', tripStart: '', end: '', hotel: '', pace: 'med', interests: [], mustSee: '', fixedEvents: '' };
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
    f.hotel = (v('g_hotel') ?? f.hotel).trim();
    const checked = document.querySelector('#ovBody input[name="g_pace"]:checked');
    if (checked) f.pace = checked.value;
  } else if (f.step === 2) {
    f.interests = [...document.querySelectorAll('#ovBody .pick input:checked')].map((x) => x.value);
    f.mustSee = v('g_must') ?? f.mustSee;
  } else if (f.step === 3) {
    f.fixedEvents = v('g_events') ?? f.fixedEvents;
  }
}

function renderStep(f) {
  document.getElementById('ovTitle').textContent = `${TITLE} · ${f.step + 1}/${STEPS.length}`;
  const body = document.getElementById('ovBody');

  if (f.step === 0) {
    body.innerHTML = `<label>Город</label><input id="g_city" placeholder="напр. Лиссабон" value="${esc(f.city)}">`
      + `<label>Даты поездки</label><div class="two"><div><label class="sub">С</label><input id="g_start" type="date" value="${esc(f.tripStart)}"></div>`
      + `<div><label class="sub">По</label><input id="g_end" type="date" min="${esc(f.tripStart)}" value="${esc(f.end)}"></div></div>`;
  } else if (f.step === 1) {
    body.innerHTML = `<label>Отель или район</label><input id="g_hotel" placeholder="можно позже" value="${esc(f.hotel)}">`
      + `<label>Темп прогулок</label><div class="picklist">`
      + PACE.map(([val, t]) => `<label class="pick"><input type="radio" name="g_pace" value="${val}" ${f.pace === val ? 'checked' : ''}><span>${t}</span></label>`).join('')
      + `</div>`;
  } else if (f.step === 2) {
    body.innerHTML = `<label>Интересы</label><div class="picklist">`
      + DAY_THEMES.map(([, t]) => `<label class="pick"><input type="checkbox" value="${t}" ${f.interests.includes(t) ? 'checked' : ''}><span>${t}</span></label>`).join('')
      + `</div><label>Обязательно увидеть (по строке)</label><textarea id="g_must" rows="3" placeholder="напр.&#10;Эйфелева башня&#10;Лувр">${esc(f.mustSee)}</textarea>`;
  } else if (f.step === 3) {
    body.innerHTML = `<label>Фиксированные события (по строке)</label>`
      + `<textarea id="g_events" rows="4" placeholder="напр.&#10;Концерт — 2026-07-05 18:30&#10;Экскурсия Опера — 2026-07-06 10:00">${esc(f.fixedEvents)}</textarea>`
      + `<div class="hint">Билеты и время — приложение учтёт их как якоря дней.</div>`;
  }

  // Кнопки: Назад/Отмена слева, Далее/Сгенерировать справа.
  const cancel = document.getElementById('ovCancel');
  cancel.textContent = f.step === 0 ? 'Отмена' : 'Назад';
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

async function submit(f) {
  const sv = document.getElementById('ovSave');
  const body = document.getElementById('ovBody');
  sv.disabled = true; sv.textContent = 'Генерирую…';
  document.getElementById('ovCancel').onclick = null;
  body.innerHTML = `<div class="hint">Собираю маршрут по дням — это займёт несколько секунд…</div>`;

  const input = {
    city: f.city, tripStart: f.tripStart, days: daysBetween(f.tripStart, f.end), hotel: f.hotel, pace: f.pace,
    interests: f.interests,
    mustSee: splitLines(f.mustSee),
    fixedEvents: splitLines(f.fixedEvents),
  };

  try {
    const { city, mock } = await api.generate(input);
    store.S.cities[city.id] = city;
    store.S.activeCity = city.id;
    store.view = 'plan';
    await save();
    tg.haptic('success');
    closeOv();
    store.animPending = true;
    render();
    if (mock) console.warn('Маршрут сгенерирован в MOCK-режиме (нет ANTHROPIC_API_KEY).');
  } catch (e) {
    body.innerHTML = `<div class="hint">${esc(e.message)}</div>`;
    const c = document.getElementById('ovCancel');
    c.textContent = 'Назад'; c.onclick = () => { f.step = STEPS.length - 1; renderStep(f); };
    sv.disabled = false; sv.textContent = 'Повторить';
    sv.onclick = () => submit(f);
  }
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
