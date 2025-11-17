import { useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import { SESSION_CONFIG } from "./sessionTypes";


interface IntervalTimerConfig {
  onIntervalComplete: (index: number) => void;
  onSessionComplete: () => void;
  isActive: boolean;
}

export function useIntervalTimer(config: IntervalTimerConfig) {
  const { onIntervalComplete, onSessionComplete, isActive } = config;

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
      
      console.log(
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

    console.log(
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

    console.log(`⏰ Session will complete in ${Math.ceil(remaining / (60 * 1000))}min`);

    sessionTimerRef.current = setTimeout(() => {
      console.log("🏁 7 hours elapsed → auto-completing session");
      onSessionComplete();
    }, remaining);
  }, [onSessionComplete]);

  const start = useCallback(() => {
    sessionStartTimeRef.current = Date.now();
    currentIntervalRef.current = 0;
    lastIntervalCheckRef.current = 0;

    scheduleNextInterval();
    scheduleSessionComplete();

    console.log("⏱️ Interval timer started");
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

    sessionStartTimeRef.current = null;
    currentIntervalRef.current = 0;

    console.log("⏱️ Interval timer stopped");
  }, []);


  const resume = useCallback(() => {
    if (!sessionStartTimeRef.current) return;

    checkIntervalProgress();

    scheduleNextInterval();

    console.log("⏱️ Interval timer resumed from background");
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
      start();
    } else {
      stop();
    }

    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]); // Only depend on isActive to prevent unnecessary restarts

  const getElapsedMinutes = useCallback((): number => {
    if (!sessionStartTimeRef.current) return 0;
    return (Date.now() - sessionStartTimeRef.current) / (60 * 1000);
  }, []);


  const getRemainingMinutes = useCallback((): number => {
    const elapsed = getElapsedMinutes();
    return Math.max(0, SESSION_CONFIG.duration - elapsed);
  }, [getElapsedMinutes]);

  return {
    currentInterval: currentIntervalRef.current,
    getElapsedMinutes,
    getRemainingMinutes,
    start,
    stop,
    resume,
  };
}