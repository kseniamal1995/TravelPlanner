# Архитектура прототипа

Один файл `paris-planner.html`: `<style>` (дизайн-система) + `<div id="app">` + `<div id="ov">` (общий bottom-sheet) + `<div id="toast">` + `<script>` (vanilla JS, ~600 строк). Без сборки и зависимостей; шрифты — Google Fonts.

## Состояние и рендер

- Глобальное состояние: `S` (персистентное, см. 03-data-model) + эфемерное: `view` ('home'|'plan'|'ideas'|'reminders'), `ideasTab`, `remScope`, `openCards`/`openRems` (Set раскрытых карточек), `undoSnap`, `animPending`, `flashId`, `imgCache`/`imgQueue`, `wxCache`.
- **Рендер — полная перерисовка**: `render()` собирает HTML-строку активного экрана (`homeHtml/planHtml/ideasHtml/remHtml` + `bnavHtml`) и присваивает в `innerHTML`. Любая мутация: изменить `S` → `save(S)` → `render()`.
- Исключения из перерисовки (для плавности): раскрытие карточки/напоминания — toggle класса на DOM + Set; подгрузка фото и погоды — точечный патч узлов `[data-img]` / `[data-wxd]`.
- Раскрытость карточек хранится в Set'ах, поэтому переживает перерисовки.

## События

Делегирование на `document`:
- `click` по `[data-act]`: `card` (раскрыть, с guard'ом на интерактивные элементы), `remtoggle`, `toggle` (редактор), `rem` (чекбокс напоминания), `buy`, `visit`, `up`/`dn`, `del`.
- `change` по `[data-act="move"]` — перенос места между buckets.
- `input` по `[data-act="note"]` — автосохранение заметки.
- Прочее — inline `onclick` (навигация, шиты).

Общий bottom-sheet `#ov`: `ovTitle` + `ovBody` + кнопки Отмена/Сохранить; каждый «открыватель» (`openTrip`, `openDaySheet`, `openAdd`, `openRem`, `newTrip`) наполняет body и переназначает `ovSave.onclick`. `resetOv()` возвращает дефолтный вид кнопок.

## Undo

`snapshot()` = JSON.stringify всего `S` перед деструктивной операцией → `showToast(текст, undo=1)` → «Отменить» восстанавливает снапшот целиком. Применяется: удаление места, удаление дня, уменьшение числа дней (снапшот в начале сохранения настроек).

## Внешние интеграции (все — без ключей и бэкенда)

### Фото мест — Wikipedia REST
- `GET https://ru.wikipedia.org/api/rest_v1/page/summary/{encodeURIComponent(place.wiki)}` → `thumbnail.source` (~320px). CORS `*`.
- Ленивая загрузка: `stopHtml`/`homeHtml` кладут места в `imgQueue`, `render()` в конце запускает `fetchImg` для каждого; результат кэшируется в `imgCache` (null = «нет фото», повторных запросов нет) и патчится во все `[data-img="{id}"]`.
- Фолбэк — плитка с иконкой категории по bucket (`pin`/`food`/`bag`/`bookmark`).
- В проде заменить источник на Google Places Photos — интерфейс тот же (url по месту).

### Погода — Open-Meteo
- Геокодинг: `geocoding-api.open-meteo.com/v1/search?name={city.name}&count=1&language=ru`.
- Прогноз: `api.open-meteo.com/v1/forecast?latitude&longitude&daily=weather_code,temperature_2m_max&timezone=auto&start_date&end_date` (диапазон зажат: не раньше сегодня, не дальше +15 дней — **горизонт прогноза ~16 дней**, для более дальних дат слот скрыт).
- `wxCache` по имени города ('loading' | null | {date: {t, c}}); `applyWx` патчит `[data-wxd]`. Иконка: код 0–1 → sun, ≤48 → cloud, иначе rain.

### Google Maps deep-links
- Место: `maps/search/?api=1&query={name}`.
- Маршрут дня: `maps/dir/?api=1&origin&destination&waypoints&travelmode` по `rname`.

## Известные ограничения (важно для продакшена)

1. **Париж захардкожен в хелпере `g()`** и в `rname`/`openAdd` (`name + ', Paris'`) — для других городов геопривязка наивная. Решение: Places API (геокодинг при добавлении места).
2. `daySub()` — захардкоженные подзаголовки seed-дней (фолбэк до `day.theme`).
3. Хранилище в браузере без `window.storage` — только память (см. 03).
4. `wiki`-заголовки — ru-Википедия; покрытие хорошее для достопримечательностей, нулевое для кафе/магазинов.
5. Миграция сбрасывает структурные правки seed-города (см. 03).
6. Тексты seed (`orly`, советы) — HTML-строки, рендерятся без эскейпа (доверенные данные).

## Тестирование

Прототип проверяется Node-смоуком без браузера: извлечь `<script>`, подставить мини-стаб DOM (`getElementById`→объект-заглушка, `querySelectorAll`→[]), прогнать `render()` всех экранов и ключевые флоу (создание/удаление дня, undo, шиты). Визуальная проверка — headless Chrome `--screenshot` (для экранов поездки — sed-патч `activeCity`/`view`/`activeTab` во временной копии). Паттерн см. в истории чата / повторить по аналогии.
