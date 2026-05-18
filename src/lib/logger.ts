type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50,
};

const getLogLevel = (): LogLevel => {
  const configured =
    process.env.NEXT_PUBLIC_LOG_LEVEL || process.env.LOG_LEVEL;
  if (configured && configured in LEVELS) {
    return configured as LogLevel;
  }

  return process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
};

const shouldLog = (level: Exclude<LogLevel, 'silent'>) =>
  LEVELS[level] >= LEVELS[getLogLevel()];

const write = (level: Exclude<LogLevel, 'silent'>, args: unknown[]) => {
  if (!shouldLog(level)) return;

  const method = level === 'debug' ? 'log' : level;
  // eslint-disable-next-line no-console
  console[method](...args);
};

export const logger = {
  debug: (...args: unknown[]) => write('debug', args),
  info: (...args: unknown[]) => write('info', args),
  warn: (...args: unknown[]) => write('warn', args),
  error: (...args: unknown[]) => write('error', args),
};
