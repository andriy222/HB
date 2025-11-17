import {
  saveSession,
  loadSession,
  clearSession,
  getLastUpdate,
  hasActiveSession,
} from '../sessionPerssistance';
import { SessionState, SESSION_CONFIG } from '../../hooks/useBleConnection/sessionTypes';

// Mock AsyncStorage
const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
    getItem: jest.fn(async (key: string) => {
      return mockStorage.get(key) || null;
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStorage.delete(key);
    }),
  },
}));

describe('sessionPersistence', () => {
  const createMockSession = (overrides?: Partial<SessionState>): SessionState => ({
    id: 'test-session-123',
    startTime: Date.now(),
    endTime: null,
    gender: 'male',
    currentStamina: 300,
    totalDistance: 0,
    intervals: [],
    isActive: true,
    isComplete: false,
    ...overrides,
  });

  beforeEach(() => {
    mockStorage.clear();
    jest.clearAllMocks();
  });

  describe('saveSession', () => {
    it('should save session to storage', async () => {
      const session = createMockSession();
      await saveSession(session);

      const stored = mockStorage.get('hybit:activeSession');
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!);
      expect(parsed.id).toBe(session.id);
      expect(parsed.currentStamina).toBe(300);
    });

    it('should save last update timestamp', async () => {
      const session = createMockSession();
      const beforeSave = Date.now();

      await saveSession(session);

      const lastUpdate = mockStorage.get('hybit:lastUpdate');
      expect(lastUpdate).toBeDefined();

      const timestamp = parseInt(lastUpdate!, 10);
      expect(timestamp).toBeGreaterThanOrEqual(beforeSave);
      expect(timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should save session with intervals', async () => {
      const session = createMockSession({
        intervals: [
          {
            index: 0,
            startTime: Date.now(),
            endTime: Date.now() + 60000,
            requiredMl: 12,
            actualMl: 10,
            shortage: 2,
            penalty: -60,
            isFirst: true,
          },
        ],
        currentStamina: 240,
      });

      await saveSession(session);

      const stored = mockStorage.get('hybit:activeSession');
      const parsed = JSON.parse(stored!);

      expect(parsed.intervals).toHaveLength(1);
      expect(parsed.intervals[0].actualMl).toBe(10);
      expect(parsed.currentStamina).toBe(240);
    });

    it('should handle save errors gracefully', async () => {
      const session = createMockSession();

      // Mock storage to throw error
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw
      await expect(saveSession(session)).resolves.not.toThrow();
    });
  });

  describe('loadSession', () => {
    it('should load saved session', async () => {
      const session = createMockSession();
      await saveSession(session);

      const loaded = await loadSession();

      expect(loaded).toBeDefined();
      expect(loaded!.id).toBe(session.id);
      expect(loaded!.currentStamina).toBe(session.currentStamina);
      expect(loaded!.isActive).toBe(true);
    });

    it('should return null when no session exists', async () => {
      const loaded = await loadSession();
      expect(loaded).toBeNull();
    });

    it('should clear old sessions', async () => {
      const oldSession = createMockSession({
        startTime: Date.now() - (SESSION_CONFIG.duration + 120) * 60 * 1000, // Past max age
      });

      await saveSession(oldSession);

      const loaded = await loadSession();
      expect(loaded).toBeNull();

      // Should also clear from storage
      const stored = mockStorage.get('hybit:activeSession');
      expect(stored).toBeUndefined();
    });

    it('should mark session as complete if duration exceeded', async () => {
      const session = createMockSession({
        startTime: Date.now() - (SESSION_CONFIG.duration + 1) * 60 * 1000, // Past duration
        isActive: true,
        isComplete: false,
      });

      await saveSession(session);

      const loaded = await loadSession();

      expect(loaded).toBeDefined();
      expect(loaded!.isActive).toBe(false);
      expect(loaded!.isComplete).toBe(true);
      expect(loaded!.endTime).toBeDefined();
    });

    it('should handle corrupted session data', async () => {
      mockStorage.set('hybit:activeSession', 'invalid json {{{');

      const loaded = await loadSession();
      expect(loaded).toBeNull();
    });

    it('should restore intervals correctly', async () => {
      const session = createMockSession({
        intervals: [
          {
            index: 0,
            startTime: Date.now(),
            endTime: Date.now() + 60000,
            requiredMl: 12,
            actualMl: 12,
            shortage: 0,
            penalty: 0,
            isFirst: true,
          },
          {
            index: 1,
            startTime: Date.now() + 60000,
            endTime: Date.now() + 120000,
            requiredMl: 7.6,
            actualMl: 5,
            shortage: 2.6,
            penalty: -16,
            isFirst: false,
          },
        ],
        currentStamina: 284,
      });

      await saveSession(session);
      const loaded = await loadSession();

      expect(loaded!.intervals).toHaveLength(2);
      expect(loaded!.intervals[0].isFirst).toBe(true);
      expect(loaded!.intervals[1].penalty).toBe(-16);
      expect(loaded!.currentStamina).toBe(284);
    });
  });

  describe('clearSession', () => {
    it('should remove session from storage', async () => {
      const session = createMockSession();
      await saveSession(session);

      expect(mockStorage.get('hybit:activeSession')).toBeDefined();

      await clearSession();

      expect(mockStorage.get('hybit:activeSession')).toBeUndefined();
      expect(mockStorage.get('hybit:lastUpdate')).toBeUndefined();
    });

    it('should handle clear errors gracefully', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.removeItem.mockRejectedValueOnce(new Error('Storage error'));

      await expect(clearSession()).resolves.not.toThrow();
    });

    it('should allow loading after clear', async () => {
      const session = createMockSession();
      await saveSession(session);
      await clearSession();

      const loaded = await loadSession();
      expect(loaded).toBeNull();
    });
  });

  describe('getLastUpdate', () => {
    it('should return last update timestamp', async () => {
      const session = createMockSession();
      const beforeSave = Date.now();

      await saveSession(session);

      const lastUpdate = await getLastUpdate();

      expect(lastUpdate).toBeDefined();
      expect(lastUpdate!).toBeGreaterThanOrEqual(beforeSave);
      expect(lastUpdate!).toBeLessThanOrEqual(Date.now());
    });

    it('should return null when no update exists', async () => {
      const lastUpdate = await getLastUpdate();
      expect(lastUpdate).toBeNull();
    });

    it('should return null for invalid timestamp', async () => {
      mockStorage.set('hybit:lastUpdate', 'not-a-number');

      const lastUpdate = await getLastUpdate();
      expect(lastUpdate).toBeNull();
    });

    it('should handle storage errors', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      const lastUpdate = await getLastUpdate();
      expect(lastUpdate).toBeNull();
    });
  });

  describe('hasActiveSession', () => {
    it('should return true for active session', async () => {
      const session = createMockSession({ isActive: true });
      await saveSession(session);

      const hasActive = await hasActiveSession();
      expect(hasActive).toBe(true);
    });

    it('should return false for inactive session', async () => {
      const session = createMockSession({
        isActive: false,
        isComplete: true,
        endTime: Date.now(),
      });
      await saveSession(session);

      const hasActive = await hasActiveSession();
      expect(hasActive).toBe(false);
    });

    it('should return false when no session exists', async () => {
      const hasActive = await hasActiveSession();
      expect(hasActive).toBe(false);
    });

    it('should return false for old sessions', async () => {
      const session = createMockSession({
        startTime: Date.now() - (SESSION_CONFIG.duration + 120) * 60 * 1000,
        isActive: true,
      });
      await saveSession(session);

      const hasActive = await hasActiveSession();
      expect(hasActive).toBe(false);
    });

    it('should handle storage errors', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      const hasActive = await hasActiveSession();
      expect(hasActive).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle save/load/clear cycle', async () => {
      const session = createMockSession();

      await saveSession(session);
      const loaded1 = await loadSession();
      expect(loaded1).toBeDefined();
      expect(loaded1!.id).toBe(session.id);

      await clearSession();
      const loaded2 = await loadSession();
      expect(loaded2).toBeNull();
    });

    it('should handle multiple saves (updates)', async () => {
      const session = createMockSession({ currentStamina: 300 });
      await saveSession(session);

      session.currentStamina = 250;
      await saveSession(session);

      session.currentStamina = 200;
      await saveSession(session);

      const loaded = await loadSession();
      expect(loaded!.currentStamina).toBe(200);
    });

    it('should preserve session state across multiple saves', async () => {
      const session = createMockSession({
        currentStamina: 300,
        totalDistance: 0,
        intervals: [],
      });

      await saveSession(session);

      // Simulate drinking
      session.intervals.push({
        index: 0,
        startTime: Date.now(),
        endTime: Date.now() + 60000,
        requiredMl: 12,
        actualMl: 12,
        shortage: 0,
        penalty: 0,
        isFirst: true,
      });
      session.currentStamina = 300;
      session.totalDistance = 0.5;

      await saveSession(session);

      const loaded = await loadSession();
      expect(loaded!.intervals).toHaveLength(1);
      expect(loaded!.totalDistance).toBe(0.5);
    });

    it('should handle concurrent save operations', async () => {
      const session1 = createMockSession({ id: 'session-1' });
      const session2 = createMockSession({ id: 'session-2' });

      await Promise.all([saveSession(session1), saveSession(session2)]);

      const loaded = await loadSession();
      // One of them should be saved (last one wins)
      expect(loaded).toBeDefined();
      expect(['session-1', 'session-2']).toContain(loaded!.id);
    });
  });

  describe('edge cases', () => {
    it('should handle session at exact duration boundary', async () => {
      const session = createMockSession({
        startTime: Date.now() - SESSION_CONFIG.duration * 60 * 1000,
        isActive: true,
      });

      await saveSession(session);
      const loaded = await loadSession();

      expect(loaded).toBeDefined();
      expect(loaded!.isActive).toBe(false);
      expect(loaded!.isComplete).toBe(true);
    });

    it('should handle session just before duration', async () => {
      const session = createMockSession({
        startTime: Date.now() - (SESSION_CONFIG.duration * 60 * 1000 - 1000), // 1 second before
        isActive: true,
      });

      await saveSession(session);
      const loaded = await loadSession();

      expect(loaded).toBeDefined();
      expect(loaded!.isActive).toBe(true);
      expect(loaded!.isComplete).toBe(false);
    });

    it('should handle empty intervals array', async () => {
      const session = createMockSession({ intervals: [] });
      await saveSession(session);

      const loaded = await loadSession();
      expect(loaded!.intervals).toEqual([]);
    });

    it('should handle session with both genders', async () => {
      const maleSession = createMockSession({ gender: 'male', id: 'male-1' });
      await saveSession(maleSession);
      const loadedMale = await loadSession();
      expect(loadedMale!.gender).toBe('male');

      const femaleSession = createMockSession({ gender: 'female', id: 'female-1' });
      await saveSession(femaleSession);
      const loadedFemale = await loadSession();
      expect(loadedFemale!.gender).toBe('female');
    });
  });
});
