import { addBreadcrumb } from './sentry';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'ble';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  enableBleLogging: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  ble: 2,
  warn: 3,
  error: 4,
};

// Default config - can be changed via setConfig()
let config: LoggerConfig = {
  enabled: __DEV__ ?? true, // Only log in development
  minLevel: 'debug',
  enableBleLogging: true,
};

/**
 * Update logger configuration
 */
export function setLoggerConfig(newConfig: Partial<LoggerConfig>) {
  config = { ...config, ...newConfig };
}

/**
 * Get current logger configuration
 */
export function getLoggerConfig(): LoggerConfig {
  return { ...config };
}

/**
 * Check if a log level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  if (!config.enabled) {return false;}
  if (level === 'ble' && !config.enableBleLogging) {return false;}
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

/**
 * Format log message with timestamp and emoji
 */
function formatMessage(level: LogLevel, message: string, data?: any): any[] {
  const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
  const emoji = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    ble: '📡',
  }[level];

  const prefix = `[${timestamp}] ${emoji}`;

  if (data !== undefined) {
    return [prefix, message, data];
  }
  return [prefix, message];
}

/**
 * Debug log - for development debugging
 */
export function logDebug(message: string, data?: any) {
  if (shouldLog('debug')) {
    console.log(...formatMessage('debug', message, data));
  }
}

/**
 * Info log - for general information
 */
export function logInfo(message: string, data?: any) {
  if (shouldLog('info')) {
    console.log(...formatMessage('info', message, data));
  }
}

/**
 * Warning log - for non-critical issues
 */
export function logWarn(message: string, data?: any) {
  if (shouldLog('warn')) {
    console.warn(...formatMessage('warn', message, data));
  }
}

/**
 * Error log - for errors and exceptions
 */
export function logError(message: string, error?: Error | any) {
  if (shouldLog('error')) {
    console.error(...formatMessage('error', message, error));
  }
  // Always send errors to Sentry
  addBreadcrumb(message, 'error', 'error', { error: String(error) });
}

/**
 * BLE log - for Bluetooth Low Energy operations
 */
export function logBLE(message: string, data?: any) {
  if (shouldLog('ble')) {
    console.log(...formatMessage('ble', message, data));
  }
  // Send BLE logs to Sentry as breadcrumbs for debugging
  addBreadcrumb(message, 'bluetooth', 'info', data);
}

/**
 * Logger object with all methods
 */
export const logger = {
  debug: logDebug,
  info: logInfo,
  warn: logWarn,
  error: logError,
  ble: logBLE,
  setConfig: setLoggerConfig,
  getConfig: getLoggerConfig,
};

/**
 * Default export
 */
export default logger;
