import { Gender } from "../../utils/storage";
import { SESSION_CONFIG, IntervalData } from "./sessionTypes";
import {
  STAMINA_PENALTY,
  HYDRATION_TARGETS,
  AVATAR_THRESHOLDS,
  SPEED_CONFIG,
} from "../../constants/sessionConstants";
import { logger } from "../../utils/logger";

/**
 * Calculate penalty for first interval
 *
 * PRD (Page 2): First 10 minutes requires 500ml (or proportional in test mode)
 * - 100% (500ml in prod, 12ml in test) → 0 pts
 * - 50-99% (250-499ml) → -15 pts
 * - 0.2-49% (1-249ml) → -30 pts
 * - 0% (0ml) → -40 pts
 *
 * @param ml - Actual ml consumed
 * @param target - Required ml for first interval (from HYDRATION_TARGETS[gender].first10min)
 */
export function calculateFirstPenalty(ml: number, target: number): number {
  // Validate inputs
  if (target <= 0) {
    logger.warn('calculateFirstPenalty: target must be > 0, got', target);
    return STAMINA_PENALTY.first.ml0;
  }
  if (ml < 0) {
    logger.warn('calculateFirstPenalty: ml must be >= 0, got', ml);
    return STAMINA_PENALTY.first.ml0;
  }

  if (ml >= target) return STAMINA_PENALTY.first.ml500Plus; // 100%+
  if (ml >= target * 0.5) return STAMINA_PENALTY.first.ml250to499; // 50-99%
  if (ml >= target * 0.002) return STAMINA_PENALTY.first.ml1to249; // 0.2-49% (1/500 = 0.002)
  return STAMINA_PENALTY.first.ml0; // 0%
}

// export function calculateFirstPenalty(ml: number): number {
//   if (ml >= 500) return STAMINA_PENALTY.first.ml500Plus;
//   if (ml >= 250) return STAMINA_PENALTY.first.ml250to499;
//   if (ml >= 1) return STAMINA_PENALTY.first.ml1to249;
//   return STAMINA_PENALTY.first.ml0;
// }

/**
 * Calculate penalty for regular interval (intervals 1-41)
 *
 * PRD (Page 2): Remaining 6h50m (41 intervals of 10 min)
 * Penalties based on shortage percentage:
 * - 0% shortage (met target) → 0 pts
 * - 0-25% shortage → -2 pts
 * - 25-50% shortage → -4 pts
 * - 50-75% shortage → -6 pts
 * - 75-100% shortage → -6.5 pts (interval cap)
 *
 * @param required - Required ml for this interval
 * @param actual - Actual ml consumed
 */
export function calculateRegularPenalty(required: number, actual: number): number {
  // Validate inputs
  if (required <= 0) {
    logger.warn('calculateRegularPenalty: required must be > 0, got', required);
    return 0;
  }

  const shortage = Math.max(0, required - actual);
  if (shortage === 0) return 0;

  const pct = (shortage / required) * 100;
  if (pct <= 25) return STAMINA_PENALTY.regular.shortage0to25; // -2
  if (pct <= 50) return STAMINA_PENALTY.regular.shortage25to50; // -4
  if (pct <= 75) return STAMINA_PENALTY.regular.shortage50to75; // -6
  return STAMINA_PENALTY.regular.shortage75to100; // -6.5
}

/**
 * Calculate current stamina from intervals
 *
 * PRD (Page 3): No recovery - stamina never increases during a session
 * - Starting stamina = 300 (max 300)
 * - Stamina only depletes per penalty rules
 * - Session cap: Total deducted stamina = min(300, sum of interval deductions)
 *
 * Worst-case penalty (PRD Page 3):
 * - Production: 40 + (41 × 6.5) ≈ 307 → capped to 300
 * - Test mode: 40 + (5 × 6.5) = 72.5
 *
 * @param intervals - All intervals completed so far
 * @returns Current stamina (0-300)
 */
export function calculateStamina(intervals: IntervalData[]): number {
  const totalPenalty = intervals.reduce((sum, i) => sum + Math.abs(i.penalty), 0);
  const capped = Math.min(totalPenalty, SESSION_CONFIG.maxStamina);
  return Math.max(0, SESSION_CONFIG.maxStamina - capped);
}

/**
 * Calculate distance based on stamina
 *
 * PRD (Page 3): Distance progression rate is a linear function of current stamina
 * Formula: Distance = (elapsedMin / duration) × maxDistance × speedRatio
 *
 * Speed calculation:
 * - speedRatio = MIN_SPEED_RATIO + (MAX_SPEED_RATIO - MIN_SPEED_RATIO) × (stamina / 300)
 * - speedRatio = 0.2 + 0.8 × (stamina / 300)
 *
 * Examples:
 * - Stamina 300 (100%): speedRatio = 1.0 (full speed)
 * - Stamina 150 (50%): speedRatio = 0.6 (60% speed)
 * - Stamina 0 (0%): speedRatio = 0.2 (20% speed, minimum)
 *
 * @param stamina - Current stamina (0-300)
 * @param elapsedMin - Minutes elapsed since session start
 * @returns Distance in km (0-42.195)
 */
export function calculateDistance(stamina: number, elapsedMin: number): number {
  const ratio = stamina / SESSION_CONFIG.maxStamina;
  const speed = SPEED_CONFIG.MIN_SPEED_RATIO +
    (SPEED_CONFIG.MAX_SPEED_RATIO - SPEED_CONFIG.MIN_SPEED_RATIO) * ratio;
  const base = (elapsedMin / SESSION_CONFIG.duration) * SESSION_CONFIG.maxDistance;
  return Math.min(base * speed, SESSION_CONFIG.maxDistance);
}

/**
 * Get avatar state based on stamina
 *
 * Avatar changes based on stamina percentage (TESTING_GUIDE.md):
 * - Normal (green): stamina > 198 (66% of 300)
 * - Tired (yellow): stamina 99-198 (33-66%)
 * - Exhausted (red): stamina < 99 (< 33%)
 *
 * @param stamina - Current stamina (0-300)
 * @returns Avatar animation state
 */
export function getAvatarState(stamina: number): "normal" | "tired" | "exhausted" {
  const ratio = stamina / SESSION_CONFIG.maxStamina;
  if (ratio > AVATAR_THRESHOLDS.NORMAL) return "normal"; // > 66%
  if (ratio > AVATAR_THRESHOLDS.TIRED) return "tired"; // > 33%
  return "exhausted"; // <= 33%
}

/**
 * Create interval
 *
 * PRD (Page 2): Distribute hydration evenly across intervals
 * - First interval: special target (500ml in prod, 12ml in test)
 * - Remaining intervals: (total - first) / (totalIntervals - 1)
 *   Production: (3500 - 500) / 41 = 73.17ml per interval
 *   Test mode: (50 - 12) / 5 = 7.6ml per interval
 */
export function createInterval(
  index: number,
  startTime: number,
  gender: Gender,
  actualMl: number = 0
): IntervalData {
  const target = HYDRATION_TARGETS[gender];
  const isFirst = index === 0;
  const required = isFirst
    ? target.first10min
    : (target.total - target.first10min) / (SESSION_CONFIG.totalIntervals - 1);

  const interval: IntervalData = {
    index,
    startTime,
    endTime: startTime + SESSION_CONFIG.intervalDuration * 60 * 1000,
    requiredMl: required,
    actualMl,
    shortage: Math.max(0, required - actualMl),
    penalty: 0,
    isFirst,
  };

  interval.penalty = isFirst
    ? calculateFirstPenalty(actualMl, required)
    : calculateRegularPenalty(required, actualMl);

  return interval;
}