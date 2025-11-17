import { Platform } from "react-native";
import { SessionState } from "../hooks/useBleConnection/sessionTypes";
/**
 * Session Persistence
 * 
 * Save/restore session state using MMKV or AsyncStorage
 * 
 * Features:
 * - Save active session
 * - Restore on app restart
 * - Clear on completion
 */

const SESSION_KEY = "hybit:activeSession";
const LAST_UPDATE_KEY = "hybit:lastUpdate";

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


export async function saveSession(session: SessionState): Promise<void> {
  try {
    const json = JSON.stringify(session);
    await setItemAsync(SESSION_KEY, json);
    await setItemAsync(LAST_UPDATE_KEY, String(Date.now()));
    
    console.log("💾 Session saved");
  } catch (e) {
    console.error("Failed to save session:", e);
  }
}


export async function loadSession(): Promise<SessionState | null> {
  try {
    const json = await getItemAsync(SESSION_KEY);
    if (!json) return null;

    const session = JSON.parse(json) as SessionState;

    const now = Date.now();
    const age = now - session.startTime;
    const maxAge = 8 * 60 * 60 * 1000; 
    
    if (age > maxAge) {
      console.log("💾 Session too old, clearing");
      await clearSession();
      return null;
    }

    const duration = 7 * 60 * 60 * 1000; 
    if (session.isActive && (now - session.startTime) >= duration) {
      console.log("💾 Session exceeded 7h, marking complete");
      session.isActive = false;
      session.isComplete = true;
      session.endTime = session.startTime + duration;
    }

    console.log("💾 Session loaded");
    return session;
  } catch (e) {
    console.error("Failed to load session:", e);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    await setItemAsync(SESSION_KEY, null);
    await setItemAsync(LAST_UPDATE_KEY, null);
    console.log("💾 Session cleared");
  } catch (e) {
    console.error("Failed to clear session:", e);
  }
}


export async function getLastUpdate(): Promise<number | null> {
  try {
    const value = await getItemAsync(LAST_UPDATE_KEY);
    if (!value) return null;
    const ts = parseInt(value, 10);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}


export async function hasActiveSession(): Promise<boolean> {
  try {
    const session = await loadSession();
    return session?.isActive ?? false;
  } catch {
    return false;
  }
}