/* Адаптер Telegram Mini App — ТОЧКА ПОДКЛЮЧЕНИЯ (см. docs/06-telegram-migration.md, фаза 1).
 *
 * Сейчас приложение работает как обычный веб-сайт. Когда оно открывается внутри
 * Telegram (подключён telegram-web-app.js и window.Telegram.WebApp существует) —
 * адаптер активируется. Вне Telegram все методы безопасны и ничего не делают.
 *
 * Чтобы включить полноценный TMA позже:
 *  1. Добавить <script src="https://telegram.org/js/telegram-web-app.js"></script> в index.html.
 *  2. Зарегистрировать Mini App в BotFather и указать URL хостинга.
 *  3. Допилить applyTheme() (маппинг themeParams → CSS-токены) и привязать
 *     MainButton/BackButton к шитам/навигации в соответствующих модулях.
 */

/* telegram-web-app.js создаёт window.Telegram.WebApp и ВНЕ Telegram (platform === 'unknown').
   Поэтому считаем адаптер активным только когда мы реально внутри Telegram-клиента. */
const _wa = (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp)
  ? window.Telegram.WebApp
  : null;
const wa = (_wa && _wa.platform && _wa.platform !== 'unknown') ? _wa : null;

/** initData для валидации подписи на бэкенде (пустая строка вне Telegram). */
export function tgInitData() {
  return wa ? (wa.initData || '') : '';
}

/** Тема. Сейчас СПЕЦИАЛЬНО не переносим цвета Telegram на токены: приложение
 *  должно сохранять собственный бренд (свой фон #F4F5F8, акценты, серифные
 *  заголовки — см. docs/04), а не перекрашиваться под белую/тёмную тему клиента.
 *  Когда понадобится тёмная тема — включим маппинг через отдельный набор токенов. */
function applyTheme() {
  /* no-op: бренд приоритетнее themeParams */
}

export const tg = {
  available: !!wa,

  /** Инициализация: вызывать один раз при старте. Безопасно вне Telegram. */
  init() {
    if (!wa) return;
    wa.ready();
    wa.expand?.();
    wa.disableVerticalSwipes?.();           // свайп вниз не закрывает приложение во время скролла
    document.body.classList.add('tg-app');  // включает TG-специфичные правила CSS (safe-area, скрытие дублей)
    applyTheme();
    wa.onEvent?.('themeChanged', applyTheme);
  },

  /** Параметр запуска Mini App из deep-link (?startapp=…). Пусто, если нет. */
  startParam() {
    return (wa && wa.initDataUnsafe && wa.initDataUnsafe.start_param) || '';
  },

  /** Поделиться ссылкой. В Telegram — нативный выбор чата; вне — копируем в буфер.
   *  Возвращает 'tg' | 'copy' | 'none' — как именно поделились (для тоста). */
  share(link, text = '') {
    if (!link) return 'none';
    if (wa && wa.openTelegramLink) {
      wa.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(text));
      return 'tg';
    }
    try { navigator.clipboard.writeText(link); return 'copy'; } catch { return 'none'; }
  },

  /** Тактильный отклик. type: 'light'|'medium'|'heavy'|'success'|'warning'|'error'. */
  haptic(type = 'light') {
    if (!wa || !wa.HapticFeedback) return;
    if (['success', 'warning', 'error'].includes(type)) {
      wa.HapticFeedback.notificationOccurred(type);
    } else {
      wa.HapticFeedback.impactOccurred(type);
    }
  },

  /** Главная кнопка Telegram (в проде заменяет CTA «Сохранить»/«Добавить» в шитах). */
  mainButton(text, onClick) {
    if (!wa || !wa.MainButton) return () => {};
    const mb = wa.MainButton;
    mb.setText(text);
    mb.show();
    mb.onClick(onClick);
    return () => { mb.offClick(onClick); mb.hide(); };
  },

  /** Прогресс/доступность главной кнопки (синхронизируются с состоянием #ovSave). */
  mainButtonProgress(on) {
    if (!wa || !wa.MainButton) return;
    on ? wa.MainButton.showProgress?.() : wa.MainButton.hideProgress?.();
  },
  mainButtonEnabled(on) {
    if (!wa || !wa.MainButton) return;
    on ? wa.MainButton.enable?.() : wa.MainButton.disable?.();
  },

  /** Кнопка «назад» Telegram (в проде заменяет «← Поездки»). */
  backButton(onClick) {
    if (!wa || !wa.BackButton) return () => {};
    const bb = wa.BackButton;
    bb.show();
    bb.onClick(onClick);
    return () => { bb.offClick(onClick); bb.hide(); };
  },
};
