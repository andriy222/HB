import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { logger } from '../utils/logger';

export const storage = new MMKV();

const mmkvStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    logger.debug(`📦 MMKV getItem("${name}"):`, value);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    logger.debug(`📦 MMKV setItem("${name}"):`, value);
    storage.set(name, value);
  },
  removeItem: (name: string) => {
    logger.debug(`📦 MMKV removeItem("${name}")`);
    storage.delete(name);
  },
};

// Debug
export const debugStorage = () => {
  logger.debug("📦 All MMKV keys:", storage.getAllKeys());

  storage.getAllKeys().forEach(key => {
    const value = storage.getString(key) ?? storage.getNumber(key);
    logger.debug(`📦 ${key}:`, value);
  });
};

export const clearStorage = () => {
  storage.clearAll();
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