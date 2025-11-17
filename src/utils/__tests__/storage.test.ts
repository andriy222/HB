import {
  getLastDeviceId,
  setLastDeviceId,
  clearLastDeviceId,
  getSelectedGender,
  setSelectedGender,
  getHydrationGoalPerPeriod,
  setHydrationGoalPerPeriod,
  getHydrationPeriodMin,
  setHydrationPeriodMin,
} from '../storage';
import { mmkvStorage, STORAGE_KEYS } from '../../storage/appStorage';

// Mock is already set up in jest.setup.js
jest.mock('../../storage/appStorage', () => {
  const mockStorage = new Map<string, any>();

  return {
    mmkvStorage: {
      getString: jest.fn((key: string) => mockStorage.get(key) || null),
      getNumber: jest.fn((key: string) => {
        const value = mockStorage.get(key);
        return typeof value === 'number' ? value : null;
      }),
      set: jest.fn((key: string, value: any) => {
        mockStorage.set(key, value);
      }),
      delete: jest.fn((key: string) => {
        mockStorage.delete(key);
      }),
      clearAll: jest.fn(() => {
        mockStorage.clear();
      }),
      _mockStorage: mockStorage, // For test access
    },
    STORAGE_KEYS: {
      LAST_DEVICE_ID: 'ble:lastDeviceId',
      GENDER: 'user:gender',
      HYDRATION_GOAL_PER_PERIOD: 'hydration:goalPerPeriod',
      HYDRATION_PERIOD_MIN: 'hydration:periodMin',
    },
  };
});

describe('storage utilities', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    (mmkvStorage as any)._mockStorage.clear();
    jest.clearAllMocks();
  });

  describe('Device ID storage', () => {
    it('should return null when no device ID is stored', () => {
      expect(getLastDeviceId()).toBeNull();
    });

    it('should store and retrieve device ID', () => {
      const deviceId = 'ABC123-DEF456';
      setLastDeviceId(deviceId);

      expect(mmkvStorage.set).toHaveBeenCalledWith(STORAGE_KEYS.LAST_DEVICE_ID, deviceId);
      expect(getLastDeviceId()).toBe(deviceId);
    });

    it('should clear device ID', () => {
      setLastDeviceId('ABC123');
      clearLastDeviceId();

      expect(mmkvStorage.delete).toHaveBeenCalledWith(STORAGE_KEYS.LAST_DEVICE_ID);
      expect(getLastDeviceId()).toBeNull();
    });

    it('should handle multiple device ID updates', () => {
      setLastDeviceId('DEVICE1');
      expect(getLastDeviceId()).toBe('DEVICE1');

      setLastDeviceId('DEVICE2');
      expect(getLastDeviceId()).toBe('DEVICE2');

      setLastDeviceId('DEVICE3');
      expect(getLastDeviceId()).toBe('DEVICE3');
    });
  });

  describe('Gender selection', () => {
    it('should return "male" as default when no gender is stored', () => {
      expect(getSelectedGender()).toBe('male');
    });

    it('should store and retrieve male gender', () => {
      setSelectedGender('male');

      expect(mmkvStorage.set).toHaveBeenCalledWith(STORAGE_KEYS.GENDER, 'male');
      expect(getSelectedGender()).toBe('male');
    });

    it('should store and retrieve female gender', () => {
      setSelectedGender('female');

      expect(mmkvStorage.set).toHaveBeenCalledWith(STORAGE_KEYS.GENDER, 'female');
      expect(getSelectedGender()).toBe('female');
    });

    it('should default to male for invalid gender values', () => {
      // Manually set invalid value
      (mmkvStorage as any)._mockStorage.set(STORAGE_KEYS.GENDER, 'invalid');

      expect(getSelectedGender()).toBe('male');
    });

    it('should handle gender switching', () => {
      setSelectedGender('male');
      expect(getSelectedGender()).toBe('male');

      setSelectedGender('female');
      expect(getSelectedGender()).toBe('female');

      setSelectedGender('male');
      expect(getSelectedGender()).toBe('male');
    });
  });

  describe('Hydration goal per period', () => {
    it('should return default value (37) when not set', () => {
      expect(getHydrationGoalPerPeriod()).toBe(37);
    });

    it('should store and retrieve hydration goal', () => {
      setHydrationGoalPerPeriod(50);

      expect(mmkvStorage.set).toHaveBeenCalledWith(
        STORAGE_KEYS.HYDRATION_GOAL_PER_PERIOD,
        50
      );
      expect(getHydrationGoalPerPeriod()).toBe(50);
    });

    it('should floor decimal values', () => {
      setHydrationGoalPerPeriod(42.7);
      expect(mmkvStorage.set).toHaveBeenCalledWith(
        STORAGE_KEYS.HYDRATION_GOAL_PER_PERIOD,
        42
      );
    });

    it('should handle zero value', () => {
      setHydrationGoalPerPeriod(0);
      expect(mmkvStorage.set).toHaveBeenCalledWith(
        STORAGE_KEYS.HYDRATION_GOAL_PER_PERIOD,
        0
      );

      // Zero is not considered valid, should return default
      expect(getHydrationGoalPerPeriod()).toBe(37);
    });

    it('should reject negative values and use zero instead', () => {
      setHydrationGoalPerPeriod(-10);
      expect(mmkvStorage.set).toHaveBeenCalledWith(
        STORAGE_KEYS.HYDRATION_GOAL_PER_PERIOD,
        0
      );
    });

    it('should handle large values', () => {
      setHydrationGoalPerPeriod(1000);
      expect(getHydrationGoalPerPeriod()).toBe(1000);
    });

    it('should return default for invalid stored values', () => {
      (mmkvStorage as any)._mockStorage.set(STORAGE_KEYS.HYDRATION_GOAL_PER_PERIOD, null);
      expect(getHydrationGoalPerPeriod()).toBe(37);
    });
  });

  describe('Hydration period minutes', () => {
    it('should return default value (5) when not set', () => {
      expect(getHydrationPeriodMin()).toBe(5);
    });

    it('should store and retrieve period minutes', () => {
      setHydrationPeriodMin(10);

      expect(mmkvStorage.set).toHaveBeenCalledWith(
        STORAGE_KEYS.HYDRATION_PERIOD_MIN,
        10
      );
      expect(getHydrationPeriodMin()).toBe(10);
    });

    it('should floor decimal values', () => {
      setHydrationPeriodMin(7.9);
      expect(mmkvStorage.set).toHaveBeenCalledWith(
        STORAGE_KEYS.HYDRATION_PERIOD_MIN,
        7
      );
    });

    it('should handle zero value', () => {
      setHydrationPeriodMin(0);
      expect(mmkvStorage.set).toHaveBeenCalledWith(
        STORAGE_KEYS.HYDRATION_PERIOD_MIN,
        0
      );

      // Zero is not considered valid, should return default
      expect(getHydrationPeriodMin()).toBe(5);
    });

    it('should reject negative values and use zero instead', () => {
      setHydrationPeriodMin(-5);
      expect(mmkvStorage.set).toHaveBeenCalledWith(
        STORAGE_KEYS.HYDRATION_PERIOD_MIN,
        0
      );
    });

    it('should handle various valid periods', () => {
      const periods = [1, 5, 10, 15, 30, 60];

      periods.forEach(period => {
        setHydrationPeriodMin(period);
        expect(getHydrationPeriodMin()).toBe(period);
      });
    });

    it('should return default for invalid stored values', () => {
      (mmkvStorage as any)._mockStorage.set(STORAGE_KEYS.HYDRATION_PERIOD_MIN, null);
      expect(getHydrationPeriodMin()).toBe(5);
    });
  });

  describe('Integration tests', () => {
    it('should handle multiple settings independently', () => {
      setLastDeviceId('DEVICE123');
      setSelectedGender('female');
      setHydrationGoalPerPeriod(45);
      setHydrationPeriodMin(10);

      expect(getLastDeviceId()).toBe('DEVICE123');
      expect(getSelectedGender()).toBe('female');
      expect(getHydrationGoalPerPeriod()).toBe(45);
      expect(getHydrationPeriodMin()).toBe(10);
    });

    it('should persist values across multiple gets', () => {
      setHydrationGoalPerPeriod(60);

      expect(getHydrationGoalPerPeriod()).toBe(60);
      expect(getHydrationGoalPerPeriod()).toBe(60);
      expect(getHydrationGoalPerPeriod()).toBe(60);
    });

    it('should handle updating all values multiple times', () => {
      // First set
      setSelectedGender('male');
      setHydrationGoalPerPeriod(37);

      expect(getSelectedGender()).toBe('male');
      expect(getHydrationGoalPerPeriod()).toBe(37);

      // Update
      setSelectedGender('female');
      setHydrationGoalPerPeriod(50);

      expect(getSelectedGender()).toBe('female');
      expect(getHydrationGoalPerPeriod()).toBe(50);
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid successive calls', () => {
      for (let i = 0; i < 100; i++) {
        setHydrationGoalPerPeriod(i);
      }

      expect(getHydrationGoalPerPeriod()).toBe(99);
    });

    it('should handle very large numbers', () => {
      setHydrationGoalPerPeriod(999999);
      expect(getHydrationGoalPerPeriod()).toBe(999999);
    });

    it('should handle device ID with special characters', () => {
      const specialId = 'ABC-123_DEF:456';
      setLastDeviceId(specialId);
      expect(getLastDeviceId()).toBe(specialId);
    });

    it('should handle empty device ID', () => {
      setLastDeviceId('');
      // Empty string is stored, but getString might return null for empty values
      const result = getLastDeviceId();
      expect(result === '' || result === null).toBe(true);
    });
  });
});
