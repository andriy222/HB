import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  IS_FIRST_TIME: 'is_first_time',
  THEME_PREFERENCE: 'theme_preference',
  USERS: 'users',
  PASSWORDS: 'passwords'
} as const;

/**
 * Generic storage operations
 */
export const storage = {
  /**
   * Save data to AsyncStorage
   */
  setItem: async <T>(key: string, value: T): Promise<void> => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      throw error;
    }
  },

  /**
   * Get data from AsyncStorage
   */
  getItem: async <T>(key: string): Promise<T | null> => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      return null;
    }
  },

  /**
   * Remove item from AsyncStorage
   */
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      throw error;
    }
  },

  /**
   * Clear all AsyncStorage data
   */
  clear: async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  },

  /**
   * Get all keys from AsyncStorage
   */
  getAllKeys: async (): Promise<readonly string[]> => {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  },
};

/**
 * App-specific storage operations
 */
export const appStorage = {
  /**
   * Check if it's user's first time opening the app
   */
  isFirstTime: async (): Promise<boolean> => {
    const value = await storage.getItem<boolean>(STORAGE_KEYS.IS_FIRST_TIME);
    return value === null; // null = first time
  },

  /**
   * Mark that user has opened the app before
   */
  setNotFirstTime: async (): Promise<void> => {
    await storage.setItem(STORAGE_KEYS.IS_FIRST_TIME, false);
  },

  /**
   * Get theme preference (light/dark)
   */
  getThemePreference: async (): Promise<'light' | 'dark' | null> => {
    return await storage.getItem<'light' | 'dark'>(STORAGE_KEYS.THEME_PREFERENCE);
  },

  /**
   * Save theme preference
   */
  setThemePreference: async (theme: 'light' | 'dark'): Promise<void> => {
    await storage.setItem(STORAGE_KEYS.THEME_PREFERENCE, theme);
  },
};