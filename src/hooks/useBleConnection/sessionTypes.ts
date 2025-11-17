import { Gender } from "../../utils/storage";


export interface SessionConfig {
  maxStamina: number; // 300
  duration: number; // 420 minutes (7h)
  maxDistance: number; // 42.195 km
  intervalDuration: number; // 10 minutes
  totalIntervals: number; // 42
}

export const SESSION_CONFIG: SessionConfig = {
  maxStamina: 300,
  duration: 420,
  maxDistance: 42.195,
  intervalDuration: 10,
  totalIntervals: 42,
};

export interface IntervalData {
  index: number;
  startTime: number;
  endTime: number;
  requiredMl: number;
  actualMl: number;
  shortage: number;
  penalty: number;
  isFirst: boolean;
}

export interface SessionState {
  id: string;
  startTime: number;
  endTime: number | null;
  gender: Gender;
  currentStamina: number;
  totalDistance: number;
  intervals: IntervalData[];
  isActive: boolean;
  isComplete: boolean;
}

export type AvatarAnimationState = "normal" | "tired" | "exhausted";