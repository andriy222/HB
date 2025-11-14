// import { create } from 'zustand';
// import { createJSONStorage, persist } from 'zustand/middleware';
// import { MMKV } from 'react-native-mmkv';

// const storage = new MMKV();

// const mmkvStorage = {
//   getItem: (name: string) => {
//     const value = storage.getString(name);
//     return value ?? null;
//   },
//   setItem: (name: string, value: string) => {
//     storage.set(name, value);
//   },
//   removeItem: (name: string) => {
//     storage.delete(name);
//   },
// };

// interface BleState {
//   hasCompletedOnboarding: boolean;
//   setOnboardingComplete: () => void;
//   reset: () => void;
// }

// export const useBleStore = create<BleState>()(
//   persist(
//     (set) => ({
//       hasCompletedOnboarding: false,
      
//       setOnboardingComplete: () => set({ 
//         hasCompletedOnboarding: true,
//       }),

//       reset: () => set({
//         hasCompletedOnboarding: false,
//       }),
//     }),
//     {
//       name: 'ble-onboarding',
//       storage: createJSONStorage(() => mmkvStorage),
//     }
//   )
// );

// store/bleStore.ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BleState {
  hasCompletedOnboarding: boolean;
  lastConnectedDeviceId: string | null;
  
  setOnboardingComplete: () => void;
  setLastDevice: (deviceId: string) => void;
  reset: () => void;
}

export const useBleStore = create<BleState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      lastConnectedDeviceId: null,
      
      setOnboardingComplete: () => set({ 
        hasCompletedOnboarding: true,
      }),

      setLastDevice: (deviceId: string) => set({
        lastConnectedDeviceId: deviceId,
      }),

      reset: () => set({
        hasCompletedOnboarding: false,
        lastConnectedDeviceId: null,
      }),
    }),
    {
      name: 'ble-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);