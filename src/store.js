/* Центральное состояние приложения + загрузка/сохранение/миграция.
 *
 * store — изменяемый держатель: персистентное S (см. docs/03-data-model.md) и
 * эфемерные поля экрана. Другие модули мутируют через store.<поле>, т.к. ESM-импорты
 * только для чтения (нельзя переприсвоить импортированную привязку). */
import { seed } from './data/seed.js';
import { STORAGE_KEY } from './config.js';
import { storage } from './services/storage.js';

export const store = {
  S: null,             // персистентное состояние
  view: 'home',        // 'home' | 'plan' | 'ideas' | 'reminders'
  ideasTab: 'shop',    // активная под-вкладка идей
  remScope: 'trip',    // 'trip' | 'all' — область напоминаний
  undoSnap: null,      // снапшот для undo
  animPending: false,  // ставить ли класс .anim при следующем рендере
  flashId: null,       // id только что добавленного места (вспышка)
};

// Раскрытые карточки/напоминания — Set'ы переживают перерисовку.
export const openCards = new Set();
export const openRems = new Set();

// Кэши внешних данных.
export const imgCache = {};   // id места → url фото | null
export const wxCache = {};    // имя города → 'loading' | null | { date: {t, c} }
export const imgQueue = [];    // очередь подгрузки фото (мутируется push/splice на месте)

/** Активный город. */
export function city() {
  return store.S.cities[store.S.activeCity];
}

/** Число мест, отнесённых к дням (не в идеях). */
export function placeCount(c) {
  return c.places.filter((p) => (c.days || []).some((d) => d.id === p.bucket)).length;
}

/** Снимок всего состояния для undo. */
export function snapshot() {
  store.undoSnap = JSON.stringify(store.S);
}

/** Сохранить текущее состояние (fire-and-forget). */
export function save() {
  return storage.set(STORAGE_KEY, JSON.stringify(store.S));
}

/**
 * Загрузить состояние и при необходимости мигрировать на актуальный seed.
 * Перенос пользовательских полей описан в docs/03-data-model.md «Миграции».
 */
export async function initState() {
  let st = null;
  try {
    const raw = await storage.get(STORAGE_KEY);
    if (raw) st = JSON.parse(raw);
  } catch { /* битый JSON → как будто пусто */ }

  const sd = seed();
  if (!st) {
    st = sd;
  } else if ((st.version || 0) < sd.version) {
    st.version = sd.version;
    const old = {}, rem = {};
    for (const cid in (st.cities || {})) {
      (st.cities[cid].places || []).forEach((p) => {
        old[cid + '::' + p.id] = { bought: p.bought, userNote: p.userNote, done: p.done, skipTk: p.skipTk };
      });
      (st.cities[cid].reminders || []).forEach((r) => { rem[cid + '::' + r.id] = r.done; });
    }
    for (const cid in sd.cities) {
      sd.cities[cid].places.forEach((p) => {
        const k = cid + '::' + p.id;
        if (old[k]) { p.bought = old[k].bought; p.userNote = old[k].userNote; p.done = old[k].done; p.skipTk = old[k].skipTk; }
      });
      (sd.cities[cid].reminders || []).forEach((r) => {
        const k = cid + '::' + r.id;
        if (rem[k] !== undefined) r.done = rem[k];
      });
    }
    // Перенести города/места, добавленные пользователем (которых нет в seed).
    for (const cid in (st.cities || {})) {
      if (!sd.cities[cid]) { sd.cities[cid] = st.cities[cid]; continue; }
      const ids = new Set(sd.cities[cid].places.map((p) => p.id));
      (st.cities[cid].places || []).forEach((p) => { if (!ids.has(p.id)) sd.cities[cid].places.push(p); });
    }
    st = sd;
  }

  if (st.activeCity === undefined) st.activeCity = null;
  store.S = st;
  await save();
}
