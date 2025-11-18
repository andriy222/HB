/**
 * Application-wide constants
 *
 * Centralizes all magic numbers and strings used throughout the app
 */

/**
 * Regex patterns for parsing
 */
export const REGEX_PATTERNS = {
  /** Line separators for BLE data parsing */
  LINE_SEPARATORS: /\r\n|\n|\r/,

  /** DL line pattern: "DL <index> <ml>" */
  DL_INDEX: /^DL\s+(\d+)/,
  DL_VALUE: /^DL\s+\d+\s+([0-9]+(?:\.[0-9]+)?)/,
  DL_LAST_NUMBER: /(\d+(?:\.\d+)?)\s*(?:ml)?\s*$/i,

  /** DEV line pattern: "DEV <battery_percentage>" */
  DEV_BATTERY: /^DEV\s+(\d{1,3})/,
} as const;

/**
 * Validation limits
 */
export const VALIDATION = {
  /** Battery level must be 0-100% */
  BATTERY_MIN: 0,
  BATTERY_MAX: 100,

  /** Interval index must be 0-41 (42 total intervals) */
  INTERVAL_MIN: 0,
  INTERVAL_MAX: 41,

  /** Minimum ml value for validation */
  ML_MIN: 0,

  /** Maximum ml value for validation (10 liters should be enough) */
  ML_MAX: 10000,

  /** Maximum line length for BLE data (prevent DoS attacks) */
  MAX_LINE_LENGTH: 1000,

  /** Maximum base64 chunk size (prevent memory exhaustion) */
  MAX_BASE64_CHUNK_SIZE: 10000,
} as const;

/**
 * Time constants (in milliseconds)
 */
export const TIME = {
  /** 1 second in milliseconds */
  ONE_SECOND: 1000,

  /** 1 minute in milliseconds */
  ONE_MINUTE: 60 * 1000,

  /** 10 minutes in milliseconds */
  TEN_MINUTES: 10 * 60 * 1000,
} as const;

/**
 * Protocol command prefixes
 */
export const PROTOCOL_COMMANDS = {
  /** Data log entry */
  DL: 'DL',

  /** Device status (battery) */
  DEV: 'DEV',

  /** Start data transfer */
  SDT: 'SDT',

  /** End data transfer */
  END: 'END',

  /** Acknowledge */
  ACK: 'ACK',

  /** Error */
  ERR: 'ERR',

  /** Get all logs */
  GET_ALL: 'GET ALL\r\n',

  /** Goal command format */
  GOAL_FORMAT: 'GOAL',

  /** Sync command format */
  SYNC_FORMAT: 'SYNC',
} as const;

/**
 * Error message keywords for BLE
 */
export const BLE_ERROR_KEYWORDS = {
  WITHOUT_RESPONSE: 'without response',
  NOT_SUPPORTED: 'not supported',
  GATT: 'GATT',
} as const;
