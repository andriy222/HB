import { mmkvStorage, STORAGE_KEYS } from "../storage/appStorage";

/**
 * Storage utilities using MMKV
 *
 * Synchronous, fast key-value storage
 */

// BLE Device
export function getLastDeviceId(): string | null {
  return mmkvStorage.getString(STORAGE_KEYS.LAST_DEVICE_ID);
}

export function setLastDeviceId(id: string): void {
  mmkvStorage.set(STORAGE_KEYS.LAST_DEVICE_ID, id);
}

export function clearLastDeviceId(): void {
  mmkvStorage.delete(STORAGE_KEYS.LAST_DEVICE_ID);
}

// Gender
export type Gender = "male" | "female";

export function getSelectedGender(): Gender {
  const value = mmkvStorage.getString(STORAGE_KEYS.GENDER);
  return value === "female" ? "female" : "male";
}

export function hasSelectedGender(): boolean {
  const value = mmkvStorage.getString(STORAGE_KEYS.GENDER);
  return value !== null && value !== undefined;
}

export function setSelectedGender(g: Gender): void {
  mmkvStorage.set(STORAGE_KEYS.GENDER, g);
}

// Hydration Goals
export function getHydrationGoalPerPeriod(): number {
  const value = mmkvStorage.getNumber(STORAGE_KEYS.HYDRATION_GOAL_PER_PERIOD);
  return value && value > 0 ? value : 37; // Default
}

export function setHydrationGoalPerPeriod(n: number): void {
  mmkvStorage.set(STORAGE_KEYS.HYDRATION_GOAL_PER_PERIOD, Math.max(0, Math.floor(n)));
}

export function getHydrationPeriodMin(): number {
  const value = mmkvStorage.getNumber(STORAGE_KEYS.HYDRATION_PERIOD_MIN);
  return value && value > 0 ? value : 5; // Default
}

export function setHydrationPeriodMin(n: number): void {
  mmkvStorage.set(STORAGE_KEYS.HYDRATION_PERIOD_MIN, Math.max(0, Math.floor(n)));
}
