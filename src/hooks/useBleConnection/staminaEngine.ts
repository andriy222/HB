import { Gender } from "../../utils/storage";
import { SESSION_CONFIG, IntervalData } from "./sessionTypes";
import {
  STAMINA_PENALTY,
  HYDRATION_TARGETS,
  AVATAR_THRESHOLDS,
  SPEED_CONFIG,
} from "../../constants/sessionConstants";

/**
 * Calculate penalty for first interval (500ml)
 */
export function calculateFirstPenalty(ml: number): number {
  if (ml >= 500) return STAMINA_PENALTY.first.ml500Plus;
  if (ml >= 250) return STAMINA_PENALTY.first.ml250to499;
  if (ml >= 1) return STAMINA_PENALTY.first.ml1to249;
  return STAMINA_PENALTY.first.ml0;
}

/**
 * Calculate penalty for regular interval
 */
export function calculateRegularPenalty(required: number, actual: number): number {
  const shortage = Math.max(0, required - actual);
  if (shortage === 0) return 0;

  const pct = (shortage / required) * 100;
  if (pct <= 25) return STAMINA_PENALTY.regular.shortage0to25;
  if (pct <= 50) return STAMINA_PENALTY.regular.shortage25to50;
  if (pct <= 75) return STAMINA_PENALTY.regular.shortage50to75;
  return STAMINA_PENALTY.regular.shortage75to100;
}

/**
 * Calculate current stamina from intervals
 */
export function calculateStamina(intervals: IntervalData[]): number {
  const totalPenalty = intervals.reduce((sum, i) => sum + Math.abs(i.penalty), 0);
  const capped = Math.min(totalPenalty, SESSION_CONFIG.maxStamina);
  return Math.max(0, SESSION_CONFIG.maxStamina - capped);
}

/**
 * Calculate distance based on stamina
 */
export function calculateDistance(stamina: number, elapsedMin: number): number {
  const ratio = stamina / SESSION_CONFIG.maxStamina;
  const speed = SPEED_CONFIG.MIN_SPEED_RATIO +
    (SPEED_CONFIG.MAX_SPEED_RATIO - SPEED_CONFIG.MIN_SPEED_RATIO) * ratio;
  const base = (elapsedMin / SESSION_CONFIG.duration) * SESSION_CONFIG.maxDistance;
  return Math.min(base * speed, SESSION_CONFIG.maxDistance);
}

/**
 * Get avatar state
 */
export function getAvatarState(stamina: number): "normal" | "tired" | "exhausted" {
  const ratio = stamina / SESSION_CONFIG.maxStamina;
  if (ratio > AVATAR_THRESHOLDS.NORMAL) return "normal";
  if (ratio > AVATAR_THRESHOLDS.TIRED) return "tired";
  return "exhausted";
}

/**
 * Create interval
 */
export function createInterval(
  index: number,
  startTime: number,
  gender: Gender,
  actualMl: number = 0
): IntervalData {
  const target = HYDRATION_TARGETS[gender];
  const isFirst = index === 0;
  const required = isFirst ? target.first10min : (target.total - target.first10min) / 41;

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
    ? calculateFirstPenalty(actualMl)
    : calculateRegularPenalty(required, actualMl);

  return interval;
}