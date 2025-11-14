import { Platform } from "react-native";

// Storage keys
const LAST_DEVICE_ID_KEY = "ble:lastDeviceId";
const GENDER_KEY = "user:gender"; // 'male' | 'female'
const HYDRATION_GOAL_PER_PERIOD_KEY = "hydration:goalPerPeriod"; // integer ml per period
const HYDRATION_PERIOD_MIN_KEY = "hydration:periodMin"; // integer minutes

// Web: use localStorage; Native: use AsyncStorage
let setItemAsync: (key: string, value: string | null) => Promise<void>;
let getItemAsync: (key: string) => Promise<string | null>;

if (Platform.OS === "web") {
  setItemAsync = async (key, value) => {
    if (typeof window !== "undefined" && window.localStorage) {
      if (value == null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    }
  };
  getItemAsync = async (key) => {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  };
} else {
  // Native path assumes @react-native-async-storage/async-storage is installed
  // The app needs this dependency to be added to work on device.
  // If not installed, this will throw at runtime; ensure to install it.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AsyncStorage = require("@react-native-async-storage/async-storage").default as {
    setItem: (k: string, v: string) => Promise<void>;
    getItem: (k: string) => Promise<string | null>;
    removeItem: (k: string) => Promise<void>;
  };
  setItemAsync = async (key, value) => {
    if (value == null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, value);
  };
  getItemAsync = async (key) => AsyncStorage.getItem(key);
}

export async function getLastDeviceId(): Promise<string | null> {
  try {
    return await getItemAsync(LAST_DEVICE_ID_KEY);
  } catch {
    return null;
  }
}

export async function setLastDeviceId(id: string): Promise<void> {
  try {
    await setItemAsync(LAST_DEVICE_ID_KEY, id);
  } catch {
    // ignore
  }
}

export async function clearLastDeviceId(): Promise<void> {
  try {
    await setItemAsync(LAST_DEVICE_ID_KEY, null);
  } catch {
    // ignore
  }
}

export type Gender = "male" | "female";

export async function getSelectedGender(): Promise<Gender> {
  try {
    const v = await getItemAsync(GENDER_KEY);
    return v === "female" ? "female" : "male";
  } catch {
    return "male";
  }
}

export async function setSelectedGender(g: Gender): Promise<void> {
  try {
    await setItemAsync(GENDER_KEY, g);
  } catch {
    // ignore
  }
}

export async function getHydrationGoalPerPeriod(): Promise<number> {
  try {
    const v = await getItemAsync(HYDRATION_GOAL_PER_PERIOD_KEY);
    const n = v != null ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 37; // sensible default
  } catch {
    return 37;
  }
}

export async function setHydrationGoalPerPeriod(n: number): Promise<void> {
  try {
    await setItemAsync(HYDRATION_GOAL_PER_PERIOD_KEY, String(Math.max(0, Math.floor(n))));
  } catch {}
}

export async function getHydrationPeriodMin(): Promise<number> {
  try {
    const v = await getItemAsync(HYDRATION_PERIOD_MIN_KEY);
    const n = v != null ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 5;
  } catch {
    return 5;
  }
}

export async function setHydrationPeriodMin(n: number): Promise<void> {
  try {
    await setItemAsync(HYDRATION_PERIOD_MIN_KEY, String(Math.max(0, Math.floor(n))));
  } catch {}
}
