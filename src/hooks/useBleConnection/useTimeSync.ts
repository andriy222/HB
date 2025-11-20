import { useState, useRef, useCallback, useEffect } from "react";
import { logger } from "../../utils/logger";

/**
 * Time Sync Manager
 * 
 * Features:
 * - NTP time synchronization
 * - Clock drift detection (±2s tolerance)
 * - Periodic sync (every 10 minutes)
 * - Fallback to device clock
 */

interface TimeSyncState {
  isVerified: boolean;        // Time verified against NTP
  lastSync: number | null;    // Last sync timestamp
  drift: number;              // Detected drift in ms
  usingDeviceClock: boolean;  // Fallback mode
}

export function useTimeSync(options?: {
  syncIntervalMinutes?: number;  // Default: 10
  driftToleranceMs?: number;     // Default: 2000 (2s)
}) {
  const { syncIntervalMinutes = 10, driftToleranceMs = 2000 } = options ?? {};

  const [state, setState] = useState<TimeSyncState>({
    isVerified: false,
    lastSync: null,
    drift: 0,
    usingDeviceClock: false,
  });

  const syncTimerRef = useRef<any>(null);
  const deviceTimeOffsetRef = useRef<number>(0);

  /**
   * Get current time (with offset if synced)
   */
  const getCurrentTime = useCallback((): Date => {
    return new Date(Date.now() + deviceTimeOffsetRef.current);
  }, []);

  /**
   * Sync with NTP server
   */
  const syncWithNTP = useCallback(async (): Promise<boolean> => {
    try {
      logger.debug("🕐 Syncing time with NTP...");

      const startTime = Date.now();

      // Try multiple NTP servers
      const servers = [
        "https://worldtimeapi.org/api/timezone/Etc/UTC",
        "https://timeapi.io/api/Time/current/zone?timeZone=UTC",
      ];

      for (const server of servers) {
        try {
          const response = await fetch(server, {
            method: "GET",
            headers: { Accept: "application/json" },
          });

          if (!response.ok) continue;

          const data = await response.json();
          
          // Parse server time
          let serverTime: number;
          if (data.unixtime) {
            serverTime = data.unixtime * 1000; // WorldTimeAPI
          } else if (data.dateTime) {
            serverTime = new Date(data.dateTime).getTime(); // TimeAPI
          } else {
            continue;
          }

          const endTime = Date.now();
          const roundTripTime = endTime - startTime;
          const estimatedServerTime = serverTime + roundTripTime / 2;

          // Calculate drift
          const drift = estimatedServerTime - endTime;
          deviceTimeOffsetRef.current = drift;

          logger.info(
            `🕐 Time synced | Drift: ${drift}ms | ` +
            `Verified: ${Math.abs(drift) < driftToleranceMs}`
          );

          setState({
            isVerified: Math.abs(drift) < driftToleranceMs,
            lastSync: Date.now(),
            drift,
            usingDeviceClock: false,
          });

          return true;
        } catch (e) {
          logger.warn(`Failed to sync with ${server}:`, e);
          continue;
        }
      }

      throw new Error("All NTP servers unavailable");
    } catch (e) {
      logger.warn("⚠️ NTP sync failed, using device clock");

      setState({
        isVerified: false,
        lastSync: null,
        drift: 0,
        usingDeviceClock: true,
      });

      return false;
    }
  }, [driftToleranceMs]);


  const scheduleSync = useCallback(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
    }

    syncTimerRef.current = setInterval(() => {
      syncWithNTP();
    }, syncIntervalMinutes * 60 * 1000);
  }, [syncIntervalMinutes, syncWithNTP]);


  useEffect(() => {
    syncWithNTP().then((success) => {
      if (success) {
        scheduleSync();
      }
    });

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [syncWithNTP, scheduleSync]);

  const formatForSync = useCallback((): string => {
    const now = getCurrentTime();
    const YY = String(now.getFullYear() % 100).padStart(2, "0");
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const DD = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    
    return `${YY}${MM}${DD}${hh}${mm}${ss}`;
  }, [getCurrentTime]);


  const hasDrift = useCallback((): boolean => {
    return Math.abs(state.drift) > driftToleranceMs;
  }, [state.drift, driftToleranceMs]);


  const manualSync = useCallback(async () => {
    return await syncWithNTP();
  }, [syncWithNTP]);

  return {
    isVerified: state.isVerified,
    lastSync: state.lastSync,
    drift: state.drift,
    usingDeviceClock: state.usingDeviceClock,
    hasDrift: hasDrift(),

    getCurrentTime,
    formatForSync,
    manualSync,

    getDriftSeconds: () => Math.round(state.drift / 1000),
    getStatusText: () => {
      if (state.usingDeviceClock) return "Not verified";
      if (!state.isVerified) return "Drift detected";
      return "Verified";
    },
  };
}