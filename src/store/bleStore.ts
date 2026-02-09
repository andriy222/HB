import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import { logger } from '../utils/logger';

// Safe MMKV initialization with fallback
let storage: {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
  getAllKeys: () => string[];
  getNumber: (key: string) => number | undefined;
  clearAll: () => void;
} | null = null;

function getStorage() {
  if (storage) return storage;

  if (Platform.OS === 'web') {
    // Web fallback using localStorage
    storage = {
      getString: (key: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key) ?? undefined;
        }
        return undefined;
      },
      set: (key: string, value: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      },
      delete: (key: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      },
      getAllKeys: () => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return Object.keys(window.localStorage);
        }
        return [];
      },
      getNumber: (key: string) => {
        const value = storage?.getString(key);
        if (value) {
          const num = parseFloat(value);
          return Number.isFinite(num) ? num : undefined;
        }
        return undefined;
      },
      clearAll: () => {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.clear();
        }
      },
    };
    logger.info('📦 Using localStorage for web');
    return storage;
  }

  try {
    const { MMKV } = require('react-native-mmkv');
    const mmkv = new MMKV();
    storage = {
      getString: (key: string) => mmkv.getString(key),
      set: (key: string, value: string) => mmkv.set(key, value),
      delete: (key: string) => mmkv.delete(key),
      getAllKeys: () => mmkv.getAllKeys(),
      getNumber: (key: string) => mmkv.getNumber(key),
      clearAll: () => mmkv.clearAll(),
    };
    logger.info('📦 Using MMKV storage');
    return storage;
  } catch (e) {
    logger.warn('⚠️ MMKV not available, using in-memory fallback', e);

    // In-memory fallback (data won't persist across app restarts)
    const memoryStorage = new Map<string, string>();
    storage = {
      getString: (key: string) => memoryStorage.get(key),
      set: (key: string, value: string) => { memoryStorage.set(key, value); },
      delete: (key: string) => { memoryStorage.delete(key); },
      getAllKeys: () => Array.from(memoryStorage.keys()),
      getNumber: (key: string) => {
        const value = memoryStorage.get(key);
        if (value) {
          const num = parseFloat(value);
          return Number.isFinite(num) ? num : undefined;
        }
        return undefined;
      },
      clearAll: () => { memoryStorage.clear(); },
    };
    return storage;
  }
}

const mmkvStorage: StateStorage = {
  getItem: (name: string) => {
    const s = getStorage();
    const value = s.getString(name);
    logger.debug(`📦 MMKV getItem("${name}"):`, value);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    logger.debug(`📦 MMKV setItem("${name}"):`, value);
    getStorage().set(name, value);
  },
  removeItem: (name: string) => {
    logger.debug(`📦 MMKV removeItem("${name}")`);
    getStorage().delete(name);
  },
};

// Debug
export const debugStorage = () => {
  const s = getStorage();
  logger.debug("📦 All MMKV keys:", s.getAllKeys());

  s.getAllKeys().forEach(key => {
    const value = s.getString(key) ?? s.getNumber(key);
    logger.debug(`📦 ${key}:`, value);
  });
};

export const clearStorage = () => {
  getStorage().clearAll();
  logger.info("🗑️ Storage cleared");
};

interface BleState {
  hasCompletedOnboarding: boolean;
  setOnboardingComplete: () => void;
  reset: () => void;
}

export const useBleStore = create<BleState>()(
  persist(
    (set, get) => ({
      hasCompletedOnboarding: false,

      setOnboardingComplete: () => {
        logger.info("✅ Setting onboarding complete");
        set({ hasCompletedOnboarding: true });
        setTimeout(() => {
          logger.debug("📦 After set, onboarding status:", get().hasCompletedOnboarding);
          debugStorage();
        }, 100);
      },

      reset: () => {
        logger.info("🔄 Resetting onboarding");
        set({ hasCompletedOnboarding: false });
      },
    }),
    {
      name: 'ble-onboarding',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

// Export storage getter for external use
export { getStorage as storage };
