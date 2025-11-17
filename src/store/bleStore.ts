import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV();

const mmkvStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  removeItem: (name: string) => {
    storage.remove(name);
  },
};

// Debug 
export const debugStorage = () => {
  console.log("📦 All MMKV keys:", storage.getAllKeys());
  
  storage.getAllKeys().forEach(key => {
    const value = storage.getString(key) ?? storage.getNumber(key);
    console.log(`📦 ${key}:`, value);
  });
};

export const clearStorage = () => {
  storage.clearAll();
  console.log("🗑️ Storage cleared");
};

interface BleState {
  hasCompletedOnboarding: boolean;
  setOnboardingComplete: () => void;
  reset: () => void;
 }

export const useBleStore = create<BleState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      
      setOnboardingComplete: () => set({ 
        hasCompletedOnboarding: true,
      }),

      reset: () => set({
        hasCompletedOnboarding: false,
      }),
    }),
    {
      name: 'ble-onboarding',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);