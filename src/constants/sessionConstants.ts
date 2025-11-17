/**
 * Session and Stamina Configuration Constants
 *
 * This file contains all session-related constants including stamina penalties,
 * hydration targets, and session timing configuration.
 */

/**
 * Session Configuration
 */
export const SESSION_CONFIG = {
  /** Maximum stamina points */
  maxStamina: 300,

  /** Session duration in minutes (7 hours) */
  duration: 420,

  /** Total number of intervals in a session */
  totalIntervals: 42,

  /** Duration of each interval in minutes */
  intervalDuration: 10,

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

    /** Moderate penalty if 250-499ml consumed */
    ml250to499: -15,

    /** Heavy penalty if 1-249ml consumed */
    ml1to249: -30,

    /** Maximum penalty if 0ml consumed */
    ml0: -40,
  },

  /** Penalties for regular intervals (based on % shortage) */
  regular: {
    /** No penalty if target met */
    shortage0: 0,

    /** Small penalty if 0-25% shortage */
    shortage0to25: -2,

    /** Medium penalty if 25-50% shortage */
    shortage25to50: -4,

    /** Large penalty if 50-75% shortage */
    shortage50to75: -6,

    /** Maximum penalty if 75-100% shortage */
    shortage75to100: -6.5,
  },
} as const;

/**
 * Hydration Targets by Gender
 */
export const HYDRATION_TARGETS = {
  male: {
    /** Total hydration target for 7-hour session (ml) */
    total: 3500,

    /** Required hydration in first 10 minutes (ml) */
    first10min: 500,
  },
  female: {
    /** Total hydration target for 7-hour session (ml) */
    total: 3000,

    /** Required hydration in first 10 minutes (ml) */
    first10min: 500,
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
