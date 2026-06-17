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
  remTab: 'all',       // активный таб напоминаний: 'all' | cityId
  undoSnap: null,      // снапшот для undo
  generating: false,   // идёт генерация маршрута (блокирует закрытие шита)
  pendingTrip: null,   // { city, input, error } — плашка-заглушка генерируемой поездки
  animPending: false,  // ставить ли класс .anim при следующем рендере
  flashId: null,       // id только что добавленного места (вспышка)
};

// Раскрытые карточки/напоминания — Set'ы переживают перерисовку.
export const openCards = new Set();
export const openRems = new Set();

// Кэши внешних данных.
export const imgCache = {};       // id места → url фото | null
export const cityImgCache = {};   // id города → url картинки | null
export const wxCache = {};        // имя города → 'loading' | null | { date: {t, c} }
export const imgQueue = [];        // очередь подгрузки фото мест (push/splice на месте)
export const cityImgQueue = [];    // очередь подгрузки картинок городов

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
 * Загрузить состояние пользователя. Каждый пользователь начинает с ПУСТОГО
 * состояния — поездки создаёт он сам (генерацией). Seed Парижа больше не
 * подставляется (остаётся только эталоном качества для движка, см. docs/01).
 */
export async function initState() {
  let st = null;
  try {
    const raw = await storage.get(STORAGE_KEY);
    if (raw) st = JSON.parse(raw);
  } catch { /* битый JSON → как будто пусто */ }

  const version = seed().version; // версия схемы (без подстановки демо-данных)
  if (!st || typeof st !== 'object' || !st.cities) {
    st = { version, activeCity: null, cities: {} };
  } else {
    st.version = version; // помечаем актуальной; пользовательские поездки сохраняем как есть
  }

  if (st.activeCity === undefined) st.activeCity = null;
  store.S = st;
  await save();
}
