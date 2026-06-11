/* Бейджи-категории мест — ЕДИНЫЙ ИСТОЧНИК СПИСКА.
 *
 * Чтобы добавить / переименовать / переокрасить категорию — правьте ТОЛЬКО:
 *   • этот файл           — список категорий (подпись, иконка, тон);
 *   • src/styles/badges.css — внешний вид тонов.
 *
 * Поле места: place.cat = <id категории>. Если не задано — фолбэк DEFAULT_BADGE.
 * tone — один из 4 тонов (цвета определены в badges.css): neutral | warm | food | nature.
 * icon — имя из словаря PATHS в src/icons.js.
 */
export const BADGES = {
  sight:     { label: 'Достопримечательность', icon: 'pin',      tone: 'warm' },
  view:      { label: 'Смотровая',             icon: 'camera',   tone: 'warm' },
  museum:    { label: 'Музей',                 icon: 'landmark', tone: 'neutral' },
  park:      { label: 'Парк',                  icon: 'leaf',     tone: 'nature' },
  food:      { label: 'Еда',                   icon: 'food',     tone: 'food' },
  shop:      { label: 'Шопинг',                icon: 'bag',      tone: 'neutral' },
  transport: { label: 'Логистика',             icon: 'route',    tone: 'neutral' },
  other:     { label: 'Другое',                icon: 'pin',      tone: 'neutral' },
};

export const DEFAULT_BADGE = 'other';

/** Вернуть определение бейджа для места (с фолбэком). */
export function placeBadge(p) {
  return BADGES[p && p.cat] || BADGES[DEFAULT_BADGE];
}

/** Резолвнутый id категории (для пути к 3D-иконке /emoji/<id>.png). */
export function placeBadgeId(p) {
  return BADGES[p && p.cat] ? p.cat : DEFAULT_BADGE;
}
