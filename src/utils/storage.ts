// import { createMMKV } from "react-native-mmkv";

import { mmkvStorage, STORAGE_KEYS } from "../storage/appStorage";

// const storage = createMMKV();

// // Storage keys
// const LAST_DEVICE_ID_KEY = "ble:lastDeviceId";
// const GENDER_KEY = "user:gender";
// const HYDRATION_GOAL_PER_PERIOD_KEY = "hydration:goalPerPeriod";
// const HYDRATION_PERIOD_MIN_KEY = "hydration:periodMin";

// // Device ID
// export function getLastDeviceId(): string | null {
//   try {
//     return storage.getString(LAST_DEVICE_ID_KEY) ?? null;
//   } catch {
//     return null;
//   }
// }

// export function setLastDeviceId(id: string): void {
//   try {
//     storage.set(LAST_DEVICE_ID_KEY, id);
//   } catch {
//     // ignore
//   }
// }

// export function clearLastDeviceId(): void {
//   try {
//     storage.remove(LAST_DEVICE_ID_KEY);
//   } catch {
//     // ignore
//   }
// }

// // Gender
// export type Gender = "male" | "female";

// export function getSelectedGender(): Gender {
//   try {
//     const v = storage.getString(GENDER_KEY);
//     return v === "female" ? "female" : "male";
//   } catch {
//     return "male";
//   }
// }

// export function setSelectedGender(g: Gender): void {
//   try {
//     storage.set(GENDER_KEY, g);
//   } catch {
//     // ignore
//   }
// }

// // Hydration Goal Per Period
// export function getHydrationGoalPerPeriod(): number {
//   try {
//     const v = storage.getNumber(HYDRATION_GOAL_PER_PERIOD_KEY);
//     return v && v > 0 ? v : 37;
//   } catch {
//     return 37;
//   }
// }

// export function setHydrationGoalPerPeriod(n: number): void {
//   try {
//     storage.set(HYDRATION_GOAL_PER_PERIOD_KEY, Math.max(0, Math.floor(n)));
//   } catch {
//     // ignore
//   }
// }

// // Hydration Period Minutes
// export function getHydrationPeriodMin(): number {
//   try {
//     const v = storage.getNumber(HYDRATION_PERIOD_MIN_KEY);
//     return v && v > 0 ? v : 5;
//   } catch {
//     return 5;
//   }
// }

// export function setHydrationPeriodMin(n: number): void {
//   try {
//     storage.set(HYDRATION_PERIOD_MIN_KEY, Math.max(0, Math.floor(n)));
//   } catch {
//     // ignore
//   }
// }

// // Debug 
// export function debugStorage() {
//   console.log(" All Storage Keys:", storage.getAllKeys());
//   storage.getAllKeys().forEach((key) => {
//     const value = storage.getString(key) ?? storage.getNumber(key);
//     console.log(` ${key}:`, value);
//   });
// }

// export function clearAllStorage() {
//   storage.clearAll();
//   console.log("🗑️ Storage cleared");
// }



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