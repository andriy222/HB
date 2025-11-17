import {
  calculateFirstPenalty,
  calculateRegularPenalty,
  calculateStamina,
  calculateDistance,
  getAvatarState,
  createInterval,
} from '../staminaEngine';
import { STAMINA_PENALTY, SESSION_CONFIG, HYDRATION_TARGETS } from '../../../constants/sessionConstants';
import { IntervalData } from '../sessionTypes';

describe('staminaEngine', () => {
  describe('calculateFirstPenalty', () => {
    const target = HYDRATION_TARGETS.male.first10min; // 12ml in test mode

    it('should return 0 penalty when consuming 100% or more of target', () => {
      expect(calculateFirstPenalty(12, target)).toBe(STAMINA_PENALTY.first.ml500Plus); // 0
      expect(calculateFirstPenalty(15, target)).toBe(STAMINA_PENALTY.first.ml500Plus); // 0
      expect(calculateFirstPenalty(20, target)).toBe(STAMINA_PENALTY.first.ml500Plus); // 0
    });

    it('should return -15 penalty when consuming 50-99% of target', () => {
      expect(calculateFirstPenalty(6, target)).toBe(STAMINA_PENALTY.first.ml250to499); // -15 (50%)
      expect(calculateFirstPenalty(10, target)).toBe(STAMINA_PENALTY.first.ml250to499); // -15 (83%)
      expect(calculateFirstPenalty(11.9, target)).toBe(STAMINA_PENALTY.first.ml250to499); // -15 (99%)
    });

    it('should return -30 penalty when consuming 0.2-49% of target', () => {
      expect(calculateFirstPenalty(0.024, target)).toBe(STAMINA_PENALTY.first.ml1to249); // -30 (0.2%)
      expect(calculateFirstPenalty(1, target)).toBe(STAMINA_PENALTY.first.ml1to249); // -30 (8%)
      expect(calculateFirstPenalty(5, target)).toBe(STAMINA_PENALTY.first.ml1to249); // -30 (42%)
    });

    it('should return -40 penalty when consuming 0ml', () => {
      expect(calculateFirstPenalty(0, target)).toBe(STAMINA_PENALTY.first.ml0); // -40
    });

    it('should handle edge cases around thresholds', () => {
      // Exactly at 50% threshold
      expect(calculateFirstPenalty(6.0, target)).toBe(STAMINA_PENALTY.first.ml250to499); // -15

      // Just below 50% threshold
      expect(calculateFirstPenalty(5.99, target)).toBe(STAMINA_PENALTY.first.ml1to249); // -30

      // Just below 100% threshold
      expect(calculateFirstPenalty(11.99, target)).toBe(STAMINA_PENALTY.first.ml250to499); // -15
    });
  });

  describe('calculateRegularPenalty', () => {
    const required = 7.6; // Regular interval target for male in test mode

    it('should return 0 penalty when meeting or exceeding target', () => {
      expect(calculateRegularPenalty(required, required)).toBe(0);
      expect(calculateRegularPenalty(required, required + 1)).toBe(0);
      expect(calculateRegularPenalty(required, required + 5)).toBe(0);
    });

    it('should return -2 penalty for 0-25% shortage', () => {
      expect(calculateRegularPenalty(required, required * 0.76)).toBe(STAMINA_PENALTY.regular.shortage0to25); // -2 (24% shortage)
      expect(calculateRegularPenalty(required, required * 0.8)).toBe(STAMINA_PENALTY.regular.shortage0to25); // -2 (20% shortage)
      expect(calculateRegularPenalty(required, required * 0.99)).toBe(STAMINA_PENALTY.regular.shortage0to25); // -2 (1% shortage)
    });

    it('should return -4 penalty for 25-50% shortage', () => {
      expect(calculateRegularPenalty(required, required * 0.5)).toBe(STAMINA_PENALTY.regular.shortage25to50); // -4 (50% shortage)
      expect(calculateRegularPenalty(required, required * 0.6)).toBe(STAMINA_PENALTY.regular.shortage25to50); // -4 (40% shortage)
    });

    it('should return -6 penalty for 50-75% shortage', () => {
      expect(calculateRegularPenalty(required, required * 0.25)).toBe(STAMINA_PENALTY.regular.shortage50to75); // -6 (75% shortage)
      expect(calculateRegularPenalty(required, required * 0.4)).toBe(STAMINA_PENALTY.regular.shortage50to75); // -6 (60% shortage)
    });

    it('should return -6.5 penalty for 75-100% shortage', () => {
      expect(calculateRegularPenalty(required, 0)).toBe(STAMINA_PENALTY.regular.shortage75to100); // -6.5 (100% shortage)
      expect(calculateRegularPenalty(required, required * 0.1)).toBe(STAMINA_PENALTY.regular.shortage75to100); // -6.5 (90% shortage)
    });

    it('should handle edge cases around thresholds', () => {
      // Just below 25% shortage
      expect(calculateRegularPenalty(required, required * 0.751)).toBe(STAMINA_PENALTY.regular.shortage0to25); // -2

      // Exactly at 25% shortage - should be in next bracket
      expect(calculateRegularPenalty(required, required * 0.75)).toBe(STAMINA_PENALTY.regular.shortage25to50); // -4

      // Just below 50% shortage
      expect(calculateRegularPenalty(required, required * 0.501)).toBe(STAMINA_PENALTY.regular.shortage25to50); // -4

      // Exactly at 50% shortage - should be in next bracket
      expect(calculateRegularPenalty(required, required * 0.5)).toBe(STAMINA_PENALTY.regular.shortage25to50); // -4
    });
  });

  describe('calculateStamina', () => {
    it('should return max stamina (300) when no intervals completed', () => {
      expect(calculateStamina([])).toBe(SESSION_CONFIG.maxStamina);
    });

    it('should reduce stamina based on penalties from intervals', () => {
      const intervals: IntervalData[] = [
        {
          index: 0,
          startTime: Date.now(),
          endTime: Date.now() + 60000,
          requiredMl: 12,
          actualMl: 0,
          shortage: 12,
          penalty: -160,
          isFirst: true,
        },
      ];

      expect(calculateStamina(intervals)).toBe(300 - 160); // 140
    });

    it('should accumulate penalties from multiple intervals', () => {
      const intervals: IntervalData[] = [
        {
          index: 0,
          startTime: Date.now(),
          endTime: Date.now() + 60000,
          requiredMl: 12,
          actualMl: 0,
          shortage: 12,
          penalty: -160,
          isFirst: true,
        },
        {
          index: 1,
          startTime: Date.now() + 60000,
          endTime: Date.now() + 120000,
          requiredMl: 7.6,
          actualMl: 0,
          shortage: 7.6,
          penalty: -26,
          isFirst: false,
        },
      ];

      const totalPenalty = 160 + 26;
      expect(calculateStamina(intervals)).toBe(300 - totalPenalty); // 114
    });

    it('should never go below 0 stamina', () => {
      const intervals: IntervalData[] = Array.from({ length: 6 }, (_, i) => ({
        index: i,
        startTime: Date.now() + i * 60000,
        endTime: Date.now() + (i + 1) * 60000,
        requiredMl: i === 0 ? 12 : 7.6,
        actualMl: 0,
        shortage: i === 0 ? 12 : 7.6,
        penalty: i === 0 ? -160 : -26,
        isFirst: i === 0,
      }));

      const stamina = calculateStamina(intervals);
      expect(stamina).toBeGreaterThanOrEqual(0);
    });

    it('should cap total penalty at max stamina (300)', () => {
      // Create scenario with more penalty than max stamina
      const intervals: IntervalData[] = Array.from({ length: 10 }, (_, i) => ({
        index: i,
        startTime: Date.now() + i * 60000,
        endTime: Date.now() + (i + 1) * 60000,
        requiredMl: 12,
        actualMl: 0,
        shortage: 12,
        penalty: -160, // Total would be 1600 without cap
        isFirst: i === 0,
      }));

      expect(calculateStamina(intervals)).toBe(0); // Capped at 0
    });
  });

  describe('calculateDistance', () => {
    const maxDistance = SESSION_CONFIG.maxDistance; // 42.195 km
    const duration = SESSION_CONFIG.duration; // 6 minutes

    it('should return 0 distance at start (0 elapsed minutes)', () => {
      expect(calculateDistance(300, 0)).toBe(0);
    });

    it('should calculate full speed distance with max stamina (300)', () => {
      const elapsedMin = 3; // Half of 6-min session
      const expectedBase = (elapsedMin / duration) * maxDistance;
      const expectedDistance = expectedBase * 1.0; // speedRatio = 1.0 at max stamina

      expect(calculateDistance(300, elapsedMin)).toBeCloseTo(expectedDistance, 3);
    });

    it('should calculate 60% speed distance with half stamina (150)', () => {
      const elapsedMin = 3; // Half of 6-min session
      const expectedBase = (elapsedMin / duration) * maxDistance;
      const speedRatio = 0.2 + 0.8 * (150 / 300); // = 0.2 + 0.8 * 0.5 = 0.6
      const expectedDistance = expectedBase * speedRatio;

      expect(calculateDistance(150, elapsedMin)).toBeCloseTo(expectedDistance, 3);
    });

    it('should calculate minimum 20% speed distance with 0 stamina', () => {
      const elapsedMin = 3; // Half of 6-min session
      const expectedBase = (elapsedMin / duration) * maxDistance;
      const speedRatio = 0.2; // Minimum speed at 0 stamina
      const expectedDistance = expectedBase * speedRatio;

      expect(calculateDistance(0, elapsedMin)).toBeCloseTo(expectedDistance, 3);
    });

    it('should never exceed max distance', () => {
      // Even with max stamina, distance shouldn't exceed marathon distance
      expect(calculateDistance(300, duration)).toBeLessThanOrEqual(maxDistance);
      expect(calculateDistance(300, duration * 2)).toBeLessThanOrEqual(maxDistance);
    });

    it('should return correct distance at session end', () => {
      const elapsedMin = duration; // Full 6 minutes
      const expectedBase = maxDistance; // 100% of time
      const speedRatio = 1.0; // Full speed with max stamina
      const expectedDistance = expectedBase * speedRatio;

      expect(calculateDistance(300, elapsedMin)).toBeCloseTo(expectedDistance, 3);
    });
  });

  describe('getAvatarState', () => {
    it('should return "normal" when stamina > 66%', () => {
      expect(getAvatarState(300)).toBe('normal'); // 100%
      expect(getAvatarState(250)).toBe('normal'); // 83%
      expect(getAvatarState(199)).toBe('normal'); // 66.3%
    });

    it('should return "tired" when stamina 33-66%', () => {
      expect(getAvatarState(198)).toBe('tired'); // 66%
      expect(getAvatarState(150)).toBe('tired'); // 50%
      expect(getAvatarState(100)).toBe('tired'); // 33.3%
    });

    it('should return "exhausted" when stamina <= 33%', () => {
      expect(getAvatarState(99)).toBe('exhausted'); // 33%
      expect(getAvatarState(50)).toBe('exhausted'); // 16.7%
      expect(getAvatarState(0)).toBe('exhausted'); // 0%
    });

    it('should handle exact threshold values', () => {
      const threshold66 = 300 * 0.66; // 198
      const threshold33 = 300 * 0.33; // 99

      expect(getAvatarState(threshold66 + 1)).toBe('normal');
      expect(getAvatarState(threshold66)).toBe('tired');
      expect(getAvatarState(threshold33 + 1)).toBe('tired');
      // At exactly 0.33, it's NOT > 0.33, so it's exhausted
      expect(getAvatarState(threshold33)).toBe('exhausted');
      expect(getAvatarState(threshold33 - 1)).toBe('exhausted');
    });
  });

  describe('createInterval', () => {
    const startTime = Date.now();
    const gender = 'male' as const;

    it('should create first interval with correct properties', () => {
      const interval = createInterval(0, startTime, gender, 0);

      expect(interval.index).toBe(0);
      expect(interval.startTime).toBe(startTime);
      expect(interval.endTime).toBe(startTime + SESSION_CONFIG.intervalDuration * 60 * 1000);
      expect(interval.requiredMl).toBe(HYDRATION_TARGETS.male.first10min); // 12ml
      expect(interval.actualMl).toBe(0);
      expect(interval.shortage).toBe(HYDRATION_TARGETS.male.first10min);
      expect(interval.isFirst).toBe(true);
      expect(interval.penalty).toBe(STAMINA_PENALTY.first.ml0); // -160
    });

    it('should create regular interval with correct properties', () => {
      const expectedRequired = (HYDRATION_TARGETS.male.total - HYDRATION_TARGETS.male.first10min) /
        (SESSION_CONFIG.totalIntervals - 1);

      const interval = createInterval(1, startTime, gender, 0);

      expect(interval.index).toBe(1);
      expect(interval.requiredMl).toBeCloseTo(expectedRequired, 2); // 7.6ml
      expect(interval.isFirst).toBe(false);
      expect(interval.penalty).toBe(STAMINA_PENALTY.regular.shortage75to100); // -26
    });

    it('should calculate penalty correctly when water is consumed', () => {
      // First interval with full hydration
      const interval1 = createInterval(0, startTime, gender, 12);
      expect(interval1.penalty).toBe(0);
      expect(interval1.shortage).toBe(0);

      // Regular interval with partial hydration
      const requiredRegular = (HYDRATION_TARGETS.male.total - HYDRATION_TARGETS.male.first10min) /
        (SESSION_CONFIG.totalIntervals - 1);
      const interval2 = createInterval(1, startTime, gender, requiredRegular * 0.8);
      expect(interval2.penalty).toBe(STAMINA_PENALTY.regular.shortage0to25); // -8 (20% shortage)
    });

    it('should handle female gender correctly', () => {
      const interval = createInterval(0, startTime, 'female', 0);

      expect(interval.requiredMl).toBe(HYDRATION_TARGETS.female.first10min); // 12ml
      expect(interval.penalty).toBe(STAMINA_PENALTY.first.ml0); // -160
    });

    it('should create intervals with correct time progression', () => {
      const interval1 = createInterval(0, startTime, gender);
      const interval2 = createInterval(1, interval1.endTime, gender);
      const interval3 = createInterval(2, interval2.endTime, gender);

      expect(interval2.startTime).toBe(interval1.endTime);
      expect(interval3.startTime).toBe(interval2.endTime);
      expect(interval3.endTime - interval3.startTime).toBe(SESSION_CONFIG.intervalDuration * 60 * 1000);
    });
  });
});
