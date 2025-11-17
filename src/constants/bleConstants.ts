/**
 * BLE (Bluetooth Low Energy) Configuration Constants
 *
 * This file contains all Bluetooth-related constants for the Hybit NeuraFlow app
 */

/**
 * Target device configuration
 */
export const BLE_DEVICE = {
  /** Name of the target Bluetooth device */
  TARGET_NAME: "Hybit NeuraFlow",

  /** Service UUID for Nordic UART Service (NUS) */
  SERVICE_UUID: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",

  /** RX Characteristic UUID (receive data from device) */
  RX_CHARACTERISTIC: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",

  /** TX Characteristic UUID (send data to device) */
  TX_CHARACTERISTIC: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
} as const;

/**
 * BLE Connection Timeouts and Delays
 */
export const BLE_TIMEOUTS = {
  /** Device scan duration in milliseconds (10 seconds) */
  SCAN_DURATION: 10000,

  /** Connection timeout in milliseconds (10 seconds) */
  CONNECTION_TIMEOUT: 10000,

  /** Delay before reconnect attempt after disconnect (milliseconds) */
  RECONNECT_INITIAL_DELAY: 1000,

  /** Maximum reconnect delay in milliseconds (30 seconds) */
  RECONNECT_MAX_DELAY: 30000,

  /** Maximum number of automatic reconnect attempts */
  MAX_RECONNECT_ATTEMPTS: 3,

  /** Delay to stabilize BLE before backfill request (milliseconds) */
  BACKFILL_STABILIZATION_DELAY: 500,

  /** Idle timeout for DL stream completion (milliseconds) */
  PROTOCOL_IDLE_TIMEOUT: 3000,

  /** Delay after auto-sync trigger (milliseconds) */
  AUTO_SYNC_DELAY: 250,
} as const;

/**
 * BLE Protocol Constants
 */
export const BLE_PROTOCOL = {
  /** Expected maximum number of data logs for full session */
  MAX_EXPECTED_LOGS: 410, // 41 intervals × 10 logs per interval

  /** Number of data logs per interval */
  LOGS_PER_INTERVAL: 10,

  /** Coaster hydration goal: ml per interval */
  COASTER_GOAL_ML: 37,

  /** Coaster hydration goal: interval duration in minutes */
  COASTER_GOAL_INTERVAL_MIN: 5,
} as const;

/**
 * Connection Status Types
 */
export type ConnectionStatus =
  | "disconnected"
  | "scanning"
  | "connecting"
  | "connected"
  | "reconnecting";
