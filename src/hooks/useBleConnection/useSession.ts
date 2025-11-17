import { useState, useRef, useCallback, useEffect } from "react";
import { SessionState, IntervalData, SESSION_CONFIG } from "./sessionTypes";
import {
  createInterval,
  calculateStamina,
  calculateDistance,
  getAvatarState,
  calculateFirstPenalty,
  calculateRegularPenalty,
} from "./staminaEngine";
import { useIntervalTimer } from "./useIntervalTimer";
import { clearSession, loadSession, saveSession } from "../../utils/sessionPerssistance";
import { Gender } from "../../utils/storage";
import { updateBestRunIfBetter } from "../../storage/appStorage";

/**
 * Main session management hook
 */
export function useSession() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [avatarState, setAvatarState] = useState<"normal" | "tired" | "exhausted">("normal");
  
  const intervalsRef = useRef<IntervalData[]>([]);
  const currentIntervalRef = useRef(0);

  /**
   * Interval timer (auto-advance every 10 min)
   */
  const intervalTimer = useIntervalTimer({
    onIntervalComplete: (index) => {
      console.log(`⏱️ Auto-completed interval ${index}`);

      // Ensure interval exists (create with 0ml if user didn't drink)
      if (!session) return;

      let interval = intervalsRef.current[index];
      if (!interval) {
        // User didn't drink during this interval - create with 0ml
        interval = createInterval(
          index,
          session.startTime + index * SESSION_CONFIG.intervalDuration * 60 * 1000,
          session.gender,
          0
        );
        intervalsRef.current[index] = interval;
        console.log(`💧 Interval ${index} auto-created with 0ml (no hydration)`);
      }

      updateSessionState();
    },
    onSessionComplete: () => {
      console.log("⏱️ Session time elapsed → auto-ending session");
      end();
    },
    isActive: session?.isActive ?? false,
    sessionStartTime: session?.startTime, 
  });

  /**
   * Update session state (stamina, distance, avatar)
   *
   * Optimized to avoid unnecessary re-renders by using functional update.
   * This prevents the callback from changing on every session update.
   */
  const updateSessionStateRef = useRef<() => void>();

  updateSessionStateRef.current = () => {
    const stamina = calculateStamina(intervalsRef.current);
    const elapsed = intervalTimer.getElapsedMinutes();
    const distance = calculateDistance(stamina, elapsed);
    const avatar = getAvatarState(stamina);

    console.log(
      `📊 Stamina update: ${stamina} (${intervalsRef.current.length} intervals, ` +
      `penalties: [${intervalsRef.current.map(i => i.penalty).join(', ')}])`
    );

    setSession((prevSession) => {
      if (!prevSession) return null;
      return {
        ...prevSession,
        currentStamina: stamina,
        totalDistance: distance,
        intervals: [...intervalsRef.current],
      };
    });
    setAvatarState(avatar);
  };

  const updateSessionState = useCallback(() => {
    updateSessionStateRef.current?.();
  }, []);

  /**
   * Start new session
   *
   * PRD (Page 2): Session starts with full stamina (300)
   * Intervals are created on-demand when:
   * 1. User records hydration (recordDrink)
   * 2. Interval auto-completes (onIntervalComplete)
   *
   * This prevents premature penalty calculation before user has a chance to drink.
   */
  const start = useCallback((gender: Gender) => {
    const startTime = Date.now();
    const newSession: SessionState = {
      id: `session-${startTime}`,
      startTime,
      endTime: null,
      gender,
      currentStamina: SESSION_CONFIG.maxStamina,
      totalDistance: 0,
      intervals: [],
      isActive: true,
      isComplete: false,
    };

    // Don't create initial interval - let it be created on first drink or auto-completion
    intervalsRef.current = [];
    currentIntervalRef.current = 0;

    setSession(newSession);
    setAvatarState("normal");

    console.log(`🏁 Session started: ${gender}`);
  }, []);

  /**
   * Record hydration (add ml to current interval)
   */
  const recordDrink = useCallback((ml: number) => {
    if (!session || !session.isActive) return;

    // Use timer's current interval (always up-to-date)
    const intervalIndex = intervalTimer.getCurrentInterval();
    currentIntervalRef.current = intervalIndex;

    // Get or create interval
    let interval = intervalsRef.current[intervalIndex];
    if (!interval) {
      interval = createInterval(
        intervalIndex,
        session.startTime + intervalIndex * SESSION_CONFIG.intervalDuration * 60 * 1000,
        session.gender,
        0
      );
      intervalsRef.current[intervalIndex] = interval;
      console.log(`📝 Created interval ${intervalIndex} (required: ${interval.requiredMl}ml)`);
    }

    const oldPenalty = interval.penalty;
    const oldMl = interval.actualMl;

    // Add ml
    interval.actualMl += ml;
    interval.shortage = Math.max(0, interval.requiredMl - interval.actualMl);

    // Recalculate penalty
    interval.penalty = interval.isFirst
      ? calculateFirstPenalty(interval.actualMl, interval.requiredMl)
      : calculateRegularPenalty(interval.requiredMl, interval.actualMl);

    console.log(
      `💧 +${ml}ml → Interval ${intervalIndex} | ` +
      `${oldMl}ml→${interval.actualMl}ml/${interval.requiredMl}ml | ` +
      `penalty: ${oldPenalty}→${interval.penalty}`
    );

    // Update session state
    updateSessionState();
  }, [session, intervalTimer, updateSessionState]);

  /**
   * End session
   */
  const end = useCallback(() => {
    if (!session) return;

    const sessionDuration = Math.floor((Date.now() - session.startTime) / 1000 / 60); // minutes

    const completedSession = {
      ...session,
      endTime: Date.now(),
      isActive: false,
      isComplete: true,
    };

    setSession(completedSession);

    // Save best run if better
    const isNewBest = updateBestRunIfBetter(
      session.totalDistance,
      session.currentStamina,
      sessionDuration
    );

    // Clear from storage
    clearSession();

    console.log(`🏁 Session complete | Duration: ${sessionDuration}min | Distance: ${session.totalDistance.toFixed(2)}km${isNewBest ? " 🏆 NEW BEST!" : ""}`);
  }, [session]);

  /**
   * Getters
   */
  const getStamina = useCallback(() => session?.currentStamina ?? 300, [session]);
  const getDistance = useCallback(() => session?.totalDistance ?? 0, [session]);
  const getElapsedTime = useCallback(() => intervalTimer.getElapsedMinutes(), [intervalTimer]);
  const getRemainingTime = useCallback(() => intervalTimer.getRemainingMinutes(), [intervalTimer]);
  const getCurrentInterval = useCallback(() => intervalTimer.getCurrentInterval(), [intervalTimer]);
  const isActive = useCallback(() => session?.isActive ?? false, [session]);

  /**
   * Auto-update session state every second for live UI
   */
  useEffect(() => {
    if (!session?.isActive) return;

    const timer = setInterval(() => {
      updateSessionStateRef.current?.();
    }, 1000);

    return () => clearInterval(timer);
  }, [session?.isActive]);

  /**
   * Auto-save session on changes
   */
  useEffect(() => {
    if (session && session.isActive) {
      saveSession(session);
    }
  }, [session]);

  /**
   * Auto-restore session on mount
   */
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const saved = await loadSession();
      if (!isMounted || !saved) return;

      if (saved.isActive) {
        const elapsed = Math.floor((Date.now() - saved.startTime) / 1000);
        console.log(`💾 Restoring active session (${elapsed}s elapsed, ${saved.intervals.length} intervals)`);
        setSession(saved);
        intervalsRef.current = saved.intervals;
        currentIntervalRef.current = saved.intervals.length;

        const avatar = getAvatarState(saved.currentStamina);
        setAvatarState(avatar);
      } else {
        clearSession();
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return {
    // State
    session,
    avatarState,
    stamina: getStamina(),
    distance: getDistance(),
    elapsedMinutes: getElapsedTime(),
    remainingMinutes: getRemainingTime(),
    currentInterval: getCurrentInterval(),
    isActive: isActive(),

    // Actions
    start,
    end,
    recordDrink,

    // Formatters
    formatTime: (min: number) => {
      const h = Math.floor(min / 60);
      const m = Math.floor(min % 60);
      return `${h}:${m.toString().padStart(2, "0")}`;
    },
    formatDistance: (km: number) => `${km.toFixed(2)}`,
    formatStamina: (s: number) => `${s}/300`,
  };
}