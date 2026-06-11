# Бэкенд (фаза 1)

Минимальный сервер из плана миграции в Telegram Mini App (см. [../docs/06-telegram-migration.md](../docs/06-telegram-migration.md)).

## Что делает

- Хранит состояние поездок **одним JSON-блобом на пользователя** (SQLite, `state` таблица).
- Идентифицирует пользователя по **подписи Telegram `initData`** (валидация HMAC + проверка `auth_date`).
- Отдаёт собранный фронт из `dist/` в проде.

## Структура

| Файл | Роль |
|------|------|
| `index.js` | запуск, загрузка `.env`, монтирование роутов, статика |
| `db.js` | SQLite: `getState`/`setState` (легко заменить на Postgres) |
| `routes/state.js` | `GET /api/state`, `PUT /api/state` |
| `middleware/initData.js` | валидация подписи `initData`, `req.userId` |

## API

| Метод | Путь | Тело | Ответ |
|-------|------|------|-------|
| GET | `/api/health` | — | `{ ok: true }` |
| GET | `/api/state` | — | `{ value: string \| null }` |
| PUT | `/api/state` | `{ value: string }` | `{ ok: true }` |

`value` — это `JSON.stringify` всего клиентского состояния `S`. Заголовок
`X-Telegram-Init-Data` пробрасывает `initData` (фронт берёт его из `telegram.js`).

## DEV-режим

Если `BOT_TOKEN` в `.env` пуст — подпись **не проверяется**, все запросы относятся к
`DEV_USER_ID`. Это удобно локально, но **в проде токен обязателен**.

## Дальше (фаза 2+)

- Заменить SQLite на Postgres (интерфейс `db.js` тот же).
- Пуши по дедлайнам `reminders[].due`, шаринг поездок.
- Генерация маршрутов: LLM (Claude API) + Places API заполняют те же структуры `days[]`/`places[]`.
