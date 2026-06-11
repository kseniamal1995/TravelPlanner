/* Express-сервер фазы 1: REST для состояния + раздача собранного фронта (prod).
   В dev фронт обслуживает Vite (5173) и проксирует /api сюда. */
import express from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ── Минимальный загрузчик .env (без зависимостей) ──
const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, '..', '.env');
if (existsSync(ENV_PATH)) {
  for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    // Заполняем не только неустановленные, но и ПУСТЫЕ переменные окружения
    // (среда может экспортировать ANTHROPIC_API_KEY='' — .env должен иметь приоритет).
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// db и роуты импортируем ПОСЛЕ загрузки .env (они читают process.env на старте).
const { default: stateRoutes } = await import('./routes/state.js');
const { default: generateRoutes } = await import('./routes/generate.js');

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json({ limit: '5mb' })); // состояние поездки — десятки КБ

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', stateRoutes);
app.use('/api', generateRoutes);

// Раздача собранного фронта, если он есть (prod-сценарий).
const DIST = join(__dirname, '..', 'dist');
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (_req, res) => res.sendFile(join(DIST, 'index.html')));
}

app.listen(PORT, () => {
  const mode = process.env.BOT_TOKEN ? 'initData-валидация ВКЛ' : 'DEV (без проверки подписи)';
  console.log(`API на http://localhost:${PORT} · ${mode}`);
});
