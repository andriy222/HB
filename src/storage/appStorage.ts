import { Platform } from "react-native";
import { logger } from "../utils/logger";

interface Storage {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string | number | boolean) => void;
  delete: (key: string) => void;
  clearAll: () => void;
}

let storage: Storage;

if (Platform.OS === "web") {
  storage = {
    getString: (key: string) => {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key) ?? undefined;
      }
      return undefined;
    },
    set: (key: string, value: string | number | boolean) => {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, String(value));
      }
    },
    delete: (key: string) => {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    },
    clearAll: () => {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear();
      }
    },
  };
} else {
  try {
    const { MMKV } = require("react-native-mmkv");
    const mmkv = new MMKV();

    storage = {
      getString: (key: string) => mmkv.getString(key),
      set: (key: string, value: string | number | boolean) => mmkv.set(key, value),
      delete: (key: string) => mmkv.delete(key),
      clearAll: () => mmkv.clearAll(),
    };

    logger.info("💾 Using MMKV storage");
  } catch (e) {
    logger.warn("⚠️ MMKV not available, falling back to AsyncStorage");

    const AsyncStorage = require("@react-native-async-storage/async-storage").default;

    const cache = new Map<string, string>();
    let initialized = false;

    AsyncStorage.getAllKeys().then(async (keys: string[]) => {
      const items = await AsyncStorage.multiGet(keys);
      items.forEach(([key, value]: [string, string | null]) => {
        if (value !== null) {
          cache.set(key, value);
        }
      });
      initialized = true;
      logger.info("💾 AsyncStorage cache initialized");
    });

    storage = {
      getString: (key: string) => {
        if (!initialized) {
          logger.warn("⚠️ Storage not initialized yet, reading from AsyncStorage");
        }
        return cache.get(key);
      },
      set: (key: string, value: string | number | boolean) => {
        const strValue = String(value);
        cache.set(key, strValue);
        AsyncStorage.setItem(key, strValue).catch((err: Error) => {
          logger.error("Failed to write to AsyncStorage:", err);
        });
      },
      delete: (key: string) => {
        cache.delete(key);
        AsyncStorage.removeItem(key).catch((err: Error) => {
          logger.error("Failed to delete from AsyncStorage:", err);
        });
      },
      clearAll: () => {
        cache.clear();
        AsyncStorage.clear().catch((err:Error) => {
          logger.error("Failed to clear AsyncStorage:", err);
        });
      },
    };
  }
}

export const mmkvStorage = {
  getString(key: string): string | null {
    return storage.getString(key) ?? null;
  },

  getNumber(key: string): number | null {
    const value = storage.getString(key);
    if (!value) return null;
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : null;
  },

  getBoolean(key: string): boolean | null {
    const value = storage.getString(key);
    if (value === "true") return true;
    if (value === "false") return false;
    return null;
  },

  getObject<T>(key: string): T | null {
    const value = storage.getString(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  set(key: string, value: string | number | boolean | object): void {
    if (typeof value === "object") {
      storage.set(key, JSON.stringify(value));
    } else {
      storage.set(key, value);
    }
  },

  delete(key: string): void {
    storage.delete(key);
  },

  clearAll(): void {
    storage.clearAll();
  },

  contains(key: string): boolean {
    return storage.getString(key) !== undefined;
  },
};

export const STORAGE_KEYS = {
  ACTIVE_SESSION: "hybit:activeSession",
  LAST_UPDATE: "hybit:lastUpdate",
  BEST_RUN: "hybit:bestRun",
  LAST_RACE_DISTANCE: "race:lastDistance",
  GENDER: "user:gender",
  HYDRATION_GOAL_PER_PERIOD: "hydration:goalPerPeriod",
  HYDRATION_PERIOD_MIN: "hydration:periodMin",

  LAST_DEVICE_ID: "ble:lastDeviceId",

  ONBOARDING_COMPLETE: "app:onboardingComplete",
} as const;


export interface BestRun {
  distance: number;
  stamina: number;
  completedAt: number;
  sessionDuration: number;
}

export function saveBestRun(distance: number, stamina: number, sessionDuration: number): void {
  const bestRun: BestRun = {
    distance,
    stamina,
    completedAt: Date.now(),
    sessionDuration,
  };
  mmkvStorage.set(STORAGE_KEYS.BEST_RUN, bestRun);
  logger.info(`💾 Best run saved: ${distance.toFixed(2)} km`);
}

export function getBestRun(): BestRun | null {
  return mmkvStorage.getObject<BestRun>(STORAGE_KEYS.BEST_RUN);
}

export function updateBestRunIfBetter(distance: number, stamina: number, sessionDuration: number): boolean {
  const current = getBestRun();

  if (!current || distance > current.distance) {
    saveBestRun(distance, stamina, sessionDuration);
    return true;
  }

  return false;
}


export function getLastRaceDistance(): number {
  return mmkvStorage.getNumber(STORAGE_KEYS.LAST_RACE_DISTANCE) ?? 0;
}

export function setLastRaceDistance(distance: number): void {
  mmkvStorage.set(STORAGE_KEYS.LAST_RACE_DISTANCE, distance);
}

export function clearLastRaceDistance(): void {
  mmkvStorage.delete(STORAGE_KEYS.LAST_RACE_DISTANCE);
}