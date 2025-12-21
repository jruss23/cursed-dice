/**
 * Logger Utility
 * Conditionally logs to console based on development mode.
 * In production builds, all logging is silently disabled.
 */

import { DEV } from '@/config';

type LogLevel = 'log' | 'warn' | 'error' | 'debug';

/**
 * Creates a prefixed log function for a specific module.
 * Usage: const log = createLogger('MyModule');
 *        log('Something happened'); // outputs: [MyModule] Something happened
 */
export function createLogger(prefix: string) {
  return {
    log: (...args: unknown[]) => log('log', prefix, ...args),
    warn: (...args: unknown[]) => log('warn', prefix, ...args),
    error: (...args: unknown[]) => log('error', prefix, ...args),
    debug: (...args: unknown[]) => log('debug', prefix, ...args),
  };
}

/**
 * Core logging function - only outputs in development mode.
 * Errors are always logged regardless of mode.
 */
function log(level: LogLevel, prefix: string, ...args: unknown[]): void {
  // Always log errors, even in production
  if (level === 'error') {
    console.error(`[${prefix}]`, ...args);
    return;
  }

  // All other logs only in development
  if (!DEV.IS_DEVELOPMENT) return;

  const formattedPrefix = `[${prefix}]`;

  switch (level) {
    case 'warn':
      console.warn(formattedPrefix, ...args);
      break;
    case 'debug':
      console.debug(formattedPrefix, ...args);
      break;
    default:
      console.log(formattedPrefix, ...args);
  }
}

/**
 * Quick log without prefix - for one-off debug statements.
 * Only outputs in development mode.
 */
export function devLog(...args: unknown[]): void {
  if (DEV.IS_DEVELOPMENT) {
    console.log(...args);
  }
}

/**
 * Quick warn without prefix.
 * Only outputs in development mode.
 */
export function devWarn(...args: unknown[]): void {
  if (DEV.IS_DEVELOPMENT) {
    console.warn(...args);
  }
}
