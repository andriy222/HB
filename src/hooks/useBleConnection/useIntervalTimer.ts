import { useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import { SESSION_CONFIG } from "./sessionTypes";
import { logger } from "../../utils/logger";


interface IntervalTimerConfig {
  onIntervalComplete: (index: number) => void;
  onSessionComplete: () => void;
  isActive: boolean;
  sessionStartTime?: number; // For restoration
}

export function useIntervalTimer(config: IntervalTimerConfig) {
  const { onIntervalComplete, onSessionComplete, isActive, sessionStartTime } = config;

  const sessionStartTimeRef = useRef<number | null>(null);
  const currentIntervalRef = useRef(0);
  const intervalTimerRef = useRef<any>(null);
  const sessionTimerRef = useRef<any>(null);
  const lastIntervalCheckRef = useRef<number>(0);

  const calculateCurrentInterval = useCallback((): number => {
    if (!sessionStartTimeRef.current) return 0;

    const elapsed = Date.now() - sessionStartTimeRef.current;
    const elapsedMinutes = elapsed / (60 * 1000);
    
    const intervalIndex = Math.floor(
      elapsedMinutes / SESSION_CONFIG.intervalDuration
    );

    return Math.min(intervalIndex, SESSION_CONFIG.totalIntervals - 1);
  }, []);

  const checkIntervalProgress = useCallback(() => {
    const actualInterval = calculateCurrentInterval();
    
    if (actualInterval > currentIntervalRef.current) {
      const missedIntervals = actualInterval - currentIntervalRef.current;

      logger.debug(
        `⏱️ Interval transition: ${currentIntervalRef.current} → ${actualInterval}` +
        (missedIntervals > 1 ? ` (skipped ${missedIntervals - 1})` : "")
      );

      for (let i = currentIntervalRef.current + 1; i <= actualInterval; i++) {
        onIntervalComplete(i - 1);
      }

      currentIntervalRef.current = actualInterval;
    }
  }, [calculateCurrentInterval, onIntervalComplete]);

  const scheduleNextInterval = useCallback(() => {
    if (!isActive || !sessionStartTimeRef.current) return;

    if (intervalTimerRef.current) {
      clearTimeout(intervalTimerRef.current);
    }

    const now = Date.now();
    const elapsed = now - sessionStartTimeRef.current;
    const currentIntervalStart = 
      Math.floor(elapsed / (SESSION_CONFIG.intervalDuration * 60 * 1000)) *
      SESSION_CONFIG.intervalDuration * 60 * 1000;
    
    const nextIntervalStart = 
      currentIntervalStart + SESSION_CONFIG.intervalDuration * 60 * 1000;

    const timeUntilNext = nextIntervalStart - elapsed;

    logger.debug(
      `⏰ Next interval in ${Math.ceil(timeUntilNext / 1000)}s ` +
      `(interval ${currentIntervalRef.current + 1}/${SESSION_CONFIG.totalIntervals})`
    );

    intervalTimerRef.current = setTimeout(() => {
      checkIntervalProgress();
      scheduleNextInterval();
    }, timeUntilNext);
  }, [isActive, checkIntervalProgress]);


  const scheduleSessionComplete = useCallback(() => {
    if (!sessionStartTimeRef.current) return;

    const sessionDuration = SESSION_CONFIG.duration * 60 * 1000; 
    const elapsed = Date.now() - sessionStartTimeRef.current;
    const remaining = sessionDuration - elapsed;

    if (remaining <= 0) {
      onSessionComplete();
      return;
    }

    logger.debug(`⏰ Session will complete in ${Math.ceil(remaining / (60 * 1000))}min`);

    sessionTimerRef.current = setTimeout(() => {
      logger.info("🏁 7 hours elapsed → auto-completing session");
      onSessionComplete();
    }, remaining);
  }, [onSessionComplete]);

  const start = useCallback((startTime?: number) => {
    const actualStartTime = startTime ?? Date.now();
    sessionStartTimeRef.current = actualStartTime;

    const elapsed = Date.now() - actualStartTime;
    const elapsedMinutes = elapsed / (60 * 1000);
    const intervalIndex = Math.floor(elapsedMinutes / SESSION_CONFIG.intervalDuration);
    currentIntervalRef.current = Math.min(intervalIndex, SESSION_CONFIG.totalIntervals - 1);
    lastIntervalCheckRef.current = currentIntervalRef.current;

    scheduleNextInterval();
    scheduleSessionComplete();

    const elapsedSec = Math.floor(elapsed / 1000);
    logger.debug(
      `⏱️ Interval timer started${startTime ? ` (restored, ${elapsedSec}s elapsed, interval ${currentIntervalRef.current})` : " (new)"}`
    );
  }, [scheduleNextInterval, scheduleSessionComplete]);


  const stop = useCallback(() => {
    if (intervalTimerRef.current) {
      clearTimeout(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }

    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }

    logger.debug("⏱️ Interval timer stopped");
  }, []);


  const resume = useCallback(() => {
    if (!sessionStartTimeRef.current) return;

    checkIntervalProgress();

    scheduleNextInterval();

    logger.debug("⏱️ Interval timer resumed from background");
  }, [checkIntervalProgress, scheduleNextInterval]);


  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active" && isActive) {
          resume();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [isActive, resume]);

  useEffect(() => {
    if (isActive) {
      const shouldStart =
        !sessionStartTimeRef.current ||
        (sessionStartTime && sessionStartTimeRef.current !== sessionStartTime);

      if (shouldStart) {
        // Use provided sessionStartTime for restoration, or current time for new sessions
        start(sessionStartTime);
      }
    } else {
      stop();
    }

    return () => {
      if (!isActive) {
        stop();
      }
    };
  }, [isActive, sessionStartTime]); 

  const getElapsedMinutes = useCallback((): number => {
    if (!sessionStartTimeRef.current) return 0;
    return (Date.now() - sessionStartTimeRef.current) / (60 * 1000);
  }, []);


  const getRemainingMinutes = useCallback((): number => {
    const elapsed = getElapsedMinutes();
    return Math.max(0, SESSION_CONFIG.duration - elapsed);
  }, [getElapsedMinutes]);

  const reset = useCallback(() => {
    stop();
    sessionStartTimeRef.current = null;
    currentIntervalRef.current = 0;
    lastIntervalCheckRef.current = 0;
    logger.debug("⏱️ Interval timer reset");
  }, [stop]);

  const getStartTime = useCallback((): number | null => {
    return sessionStartTimeRef.current;
  }, []);

  const getCurrentInterval = useCallback((): number => {
    return calculateCurrentInterval();
  }, [calculateCurrentInterval]);

  return {
    currentInterval: getCurrentInterval(),
    getCurrentInterval,
    getElapsedMinutes,
    getRemainingMinutes,
    getStartTime,
    start,
    stop,
    resume,
    reset,
  };
}