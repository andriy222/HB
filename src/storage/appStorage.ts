import { Platform } from "react-native";

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

    console.log("💾 Using MMKV storage");
  } catch (e) {
    console.warn("⚠️ MMKV not available, falling back to AsyncStorage");

    const AsyncStorage = require("@react-native-async-storage/async-storage").default;

    // In-memory cache for synchronous access
    const cache = new Map<string, string>();
    let initialized = false;

    // Initialize cache asynchronously
    AsyncStorage.getAllKeys().then(async (keys: string[]) => {
      const items = await AsyncStorage.multiGet(keys);
      items.forEach(([key, value]: [string, string | null]) => {
        if (value !== null) {
          cache.set(key, value);
        }
      });
      initialized = true;
      console.log("💾 AsyncStorage cache initialized");
    });

    storage = {
      getString: (key: string) => {
        if (!initialized) {
          console.warn("⚠️ Storage not initialized yet, reading from AsyncStorage");
        }
        return cache.get(key);
      },
      set: (key: string, value: string | number | boolean) => {
        const strValue = String(value);
        cache.set(key, strValue);
        AsyncStorage.setItem(key, strValue).catch((err: Error) => {
          console.error("Failed to write to AsyncStorage:", err);
        });
      },
      delete: (key: string) => {
        cache.delete(key);
        AsyncStorage.removeItem(key).catch((err: Error) => {
          console.error("Failed to delete from AsyncStorage:", err);
        });
      },
      clearAll: () => {
        cache.clear();
        AsyncStorage.clear().catch((err:Error) => {
          console.error("Failed to clear AsyncStorage:", err);
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

  GENDER: "user:gender",
  HYDRATION_GOAL_PER_PERIOD: "hydration:goalPerPeriod",
  HYDRATION_PERIOD_MIN: "hydration:periodMin",

  LAST_DEVICE_ID: "ble:lastDeviceId",

  ONBOARDING_COMPLETE: "app:onboardingComplete",
} as const;
