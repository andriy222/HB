import { useEffect, useRef, useCallback } from "react";

/**
 * Reconnect Handler with Backfill
 * 
 * Handles BLE reconnection and missed data recovery
 * 
 * Features:
 * - Detect reconnect events
 * - Calculate missed time
 * - Request backfill (GET ALL)
 * - Recompute intervals
 */

interface ReconnectConfig {
  onReconnect: () => void;           // Trigger GET ALL
  onBackfillComplete: () => void;    // After data restored
  sessionStartTime: number | null;   // Session start timestamp
  lastDLTimestamp: number | null;    // Last received DL timestamp
}

export function useReconnectHandler(
  isConnected: boolean,
  config: ReconnectConfig
) {
  const { onReconnect, onBackfillComplete, sessionStartTime, lastDLTimestamp } = config;
  
  const wasConnectedRef = useRef(false);
  const reconnectCountRef = useRef(0);
  const lastReconnectRef = useRef<number | null>(null);

  /**
   * Detect connection state change
   */
  useEffect(() => {
    if (isConnected && !wasConnectedRef.current) {
      // Connection established
      handleConnect();
    } else if (!isConnected && wasConnectedRef.current) {
      // Connection lost
      handleDisconnect();
    }

    wasConnectedRef.current = isConnected;
  }, [isConnected]);

  /**
   * Handle connect event
   */
  const handleConnect = useCallback(() => {
    const now = Date.now();
    const isReconnect = lastReconnectRef.current !== null;

    if (isReconnect) {
      const missedTime = now - (lastReconnectRef.current ?? now);
      const missedMinutes = missedTime / (60 * 1000);

      console.log(
        `🔌 Reconnected after ${missedMinutes.toFixed(1)}min | ` +
        `Count: ${reconnectCountRef.current + 1}`
      );

      reconnectCountRef.current += 1;

      // Check if we need backfill
      if (sessionStartTime && missedMinutes > 1) {
        console.log("🔄 Requesting backfill...");
        
        // Give BLE a moment to stabilize
        setTimeout(() => {
          onReconnect();
        }, 500);
      }
    } else {
      console.log("🔌 Initial connection");
    }

    lastReconnectRef.current = now;
  }, [sessionStartTime, onReconnect]);

  /**
   * Handle disconnect event
   */
  const handleDisconnect = useCallback(() => {
    console.log("🔌 Connection lost");
    // Store disconnect time for calculating missed duration
    lastReconnectRef.current = Date.now();
  }, []);

  /**
   * Calculate missed intervals
   */
  const getMissedIntervals = useCallback((): number[] => {
    if (!sessionStartTime || !lastDLTimestamp) return [];

    const now = Date.now();
    const sessionElapsed = now - sessionStartTime;
    const lastDLElapsed = lastDLTimestamp - sessionStartTime;

    const currentInterval = Math.floor(sessionElapsed / (10 * 60 * 1000));
    const lastDLInterval = Math.floor(lastDLElapsed / (10 * 60 * 1000));

    const missed: number[] = [];
    for (let i = lastDLInterval + 1; i <= currentInterval; i++) {
      if (i >= 0 && i < 42) {
        missed.push(i);
      }
    }

    return missed;
  }, [sessionStartTime, lastDLTimestamp]);

  /**
   * Get reconnect stats
   */
  const getStats = useCallback(() => {
    return {
      reconnectCount: reconnectCountRef.current,
      lastReconnect: lastReconnectRef.current,
      missedIntervals: getMissedIntervals(),
    };
  }, [getMissedIntervals]);

  return {
    reconnectCount: reconnectCountRef.current,
    getMissedIntervals,
    getStats,
  };
}