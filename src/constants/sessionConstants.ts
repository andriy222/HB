/**
 * Session and Stamina Configuration Constants
 *
 * This file contains all session-related constants including stamina penalties,
 * hydration targets, and session timing configuration.
 */

/**
 * BLE Configuration
 */
export const BLE_CONFIG = {

  USE_MOCK_BLE: false,
} as const;

/**
 * Session Configuration
 */
export const SESSION_CONFIG = {
  /** Maximum stamina points */
  maxStamina: 300,

  /** Session duration in minutes (TESTING: 6 min instead of 7 hours) */
  duration: 6,

  /** Total number of intervals in a session (TESTING: 6 instead of 42) */
  totalIntervals: 6,

  /** Duration of each interval in minutes (TESTING: 1 min instead of 10 min) */
  intervalDuration: 1,

  /** Maximum distance that can be achieved (marathon distance in km) */
  maxDistance: 42.195,
} as const;

/**
 * Stamina Penalty Configuration
 *
 * Penalties are applied based on hydration shortages to calculate stamina loss
 */
export const STAMINA_PENALTY = {
  /** Penalties for first interval (requires 500ml) */
  first: {
    /** No penalty if >= 500ml consumed */
    ml500Plus: 0,

    /** Moderate penalty if 250-499ml consumed (PRD: -15 pts) */
    ml250to499: -15,

    /** Heavy penalty if 1-249ml consumed (PRD: -30 pts) */
    ml1to249: -30,

    /** Maximum penalty if 0ml consumed (PRD: -40 pts) */
    ml0: -40,
  },

  /** Penalties for regular intervals (based on % shortage) */
  regular: {
    /** No penalty if target met */
    shortage0: 0,

    /** Small penalty if 0-25% shortage (PRD: -2 pts) */
    shortage0to25: -2,

    /** Medium penalty if 25-50% shortage (PRD: -4 pts) */
    shortage25to50: -4,

    /** Large penalty if 50-75% shortage (PRD: -6 pts) */
    shortage50to75: -6,

    /** Maximum penalty if 75-100% shortage (PRD: -6.5 pts) */
    shortage75to100: -6.5,
  },
} as const;

/**
 * Hydration Targets by Gender
 * TESTING MODE: Reduced proportionally for 6-min session
 * Original: 3500ml/420min = 8.33ml/min → 6min × 8.33 = 50ml
 */
export const HYDRATION_TARGETS = {
  male: {
    /** Total hydration target for session (TESTING: 50ml for 6min instead of 3500ml for 7h) */
    total: 50,

    /** Required hydration in first interval (TESTING: 12ml for 1min instead of 500ml for 10min) */
    first10min: 12,
  },
  female: {
    /** Total hydration target for session (TESTING: 43ml for 6min instead of 3000ml for 7h) */
    total: 43,

    /** Required hydration in first interval (TESTING: 12ml for 1min instead of 500ml for 10min) */
    first10min: 12,
  },
} as const;

/**
 * Avatar State Thresholds
 *
 * Avatar changes based on stamina percentage
 */
export const AVATAR_THRESHOLDS = {
  /** Stamina ratio above 66% = normal state */
  NORMAL: 0.66,

  /** Stamina ratio above 33% but <= 66% = tired state */
  TIRED: 0.33,

  /** Stamina ratio <= 33% = exhausted state */
  // EXHAUSTED is implied when below TIRED threshold
} as const;

/**
 * Session Update Intervals
 */
export const SESSION_TIMING = {
  /** Update session state every N milliseconds for live UI */
  UI_UPDATE_INTERVAL: 1000,

  /** Save session to storage every N milliseconds */
  SAVE_INTERVAL: 5000,
} as const;

/**
 * Speed Calculation Constants
 */
export const SPEED_CONFIG = {
  /** Minimum speed multiplier when stamina is 0 (20% of max speed) */
  MIN_SPEED_RATIO: 0.2,

  /** Maximum speed multiplier when stamina is 300 (100% of max speed) */
  MAX_SPEED_RATIO: 1.0,
} as const;
