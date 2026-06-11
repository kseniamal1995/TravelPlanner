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

/** Маппинг themeParams Telegram на CSS-токены (тёмная тема). Бренд (зелёный акцент,
 *  серифные заголовки) сохраняем поверх темы — см. docs/04. Заготовка на фазу 1. */
function applyTheme() {
  if (!wa || !wa.themeParams) return;
  const t = wa.themeParams;
  const root = document.documentElement.style;
  const map = {
    '--bg': t.bg_color,
    '--card': t.secondary_bg_color,
    '--ink': t.text_color,
    '--soft': t.hint_color,
    '--blue': t.link_color,
  };
  for (const [token, value] of Object.entries(map)) {
    if (value) root.setProperty(token, value);
  }
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
