/* Minimal, dependency-free logger. Set LOG_LEVEL=debug for verbose output. */
const levels = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof levels;
const current: Level = (process.env.LOG_LEVEL as Level) || 'info';

function log(level: Level, msg: string, meta?: unknown): void {
  if (levels[level] < levels[current]) return;
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`;
  const out = meta === undefined ? line : `${line} ${JSON.stringify(meta)}`;
  if (level === 'error' || level === 'warn') console.error(out);
  else console.log(out);
}

export const logger = {
  debug: (m: string, meta?: unknown) => log('debug', m, meta),
  info: (m: string, meta?: unknown) => log('info', m, meta),
  warn: (m: string, meta?: unknown) => log('warn', m, meta),
  error: (m: string, meta?: unknown) => log('error', m, meta),
};
