# Планер маршрутов

Личный планер путешествий — раскладывает места по дням в виде пешего маршрута от
отеля. Будущий фронт **Telegram Mini App**. Это рабочая структура проекта, собранная
из прототипа `paris-planner.html` (он сохранён в корне как референс).

Документация продукта, данных и дизайн-системы — в [docs/](docs/).

## Стек

- **Фронт:** vanilla JS (ES-модули), сборка — **Vite**. Без фреймворков.
- **Бэкенд (фаза 1):** **Express** + **SQLite** (`better-sqlite3`), состояние на пользователя, валидация Telegram `initData`.
- **Внешние данные без ключей:** фото — Wikipedia REST, погода — Open-Meteo, ссылки — Google Maps deep-links.

## Структура

```
index.html              точка входа Vite
src/
  main.js               бутстрап + экспорт inline-обработчиков в window
  render.js             полная перерисовка активного экрана
  store.js              состояние S, миграции, save/load
  config.js, icons.js   константы и SVG-иконки
  lib/                  format · maps · intensity (чистые функции)
  data/seed.js          seed Парижа (schema v12)
  services/             storage · api · weather · photos · telegram
  ui/                   toast · sheet
  components/           stop · arrival · empty
  views/                home · plan · ideas · reminders · nav
  sheets/               daySheet · tripSettings · addPlace · reminder · newTrip
  navigation.js         переходы между экранами + удаление дня
  events.js             делегированные обработчики на document
  styles/               токены + компонентные CSS (index.css собирает всё)
server/                 бэкенд фазы 1 (см. server/README.md)
docs/                   каноничная документация
```

### Что изменилось при разбивке (важно)

- **Один источник стиля для повторяющихся блоков:** общая поверхность карточек
  (`.tripcard/.flow/.stop/.rcard`) вынесена в одно правило + токены `--shadow-card`,
  `--shadow-card-lg`, `--shadow-float`, `--pill-bg` в [tokens.css](src/styles/tokens.css).
- **Состояние** живёт в `store` (объект-держатель), т.к. ESM-импорты только для чтения.
- **Хранилище** теперь адаптер: бэкенд REST → localStorage → память (фолбэк).
- **Telegram** — адаптер-заглушка [services/telegram.js](src/services/telegram.js):
  приложение работает как обычный веб, но готово к подключению TMA (тема, MainButton/
  BackButton, haptics) без переписывания логики.

## Запуск

```bash
npm install
cp .env.example .env      # при желании настроить порт/токен/путь к БД
npm run dev               # Vite (5173) + Express (3000) одновременно
```

Открыть http://localhost:5173. Запросы `/api` Vite проксирует на бэкенд.
Без запущенного сервера фронт всё равно работает — состояние ляжет в localStorage.

### Прод

```bash
npm run build             # фронт → dist/
npm start                 # Express раздаёт dist/ и обслуживает /api
```

## Переход в Telegram Mini App

Чек-лист в [docs/06-telegram-migration.md](docs/06-telegram-migration.md). Кратко:
1. Подключить `telegram-web-app.js` в `index.html`, зарегистрировать Mini App в BotFather.
2. Заполнить `BOT_TOKEN` в `.env` — включится валидация подписи `initData`.
3. Допилить `applyTheme()` и привязать MainButton/BackButton в `services/telegram.js`.
