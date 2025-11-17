import { useState, useRef, useCallback, useEffect } from "react";
import { mockCoaster } from "./MockCoaster";

/**
 * Mock BLE Connection
 *
 * Simulates useBLEConnection interface for testing without device
 */

interface MockBLEConfig {
  autoConnect?: boolean;
  initialLogCount?: number;
}

export function useMockBLE(
  isConnected: boolean,
  onDataReceived?: (data: { index: number; ml: number }) => void,
  onLineReceived?: (line: string) => void,
  config: MockBLEConfig = {}
) {
  const { autoConnect = true, initialLogCount = 100 } = config;

  const [isReady, setIsReady] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const seenIndicesRef = useRef<Set<number>>(new Set());

  /**
   * Parse DL line
   */
  const parseDLLine = useCallback((line: string) => {
    const match = /^DL\s+(\d+)\s+([0-9.]+)/.exec(line);
    if (!match) return null;

    const index = parseInt(match[1], 10);
    const ml = parseFloat(match[2]);

    if (!Number.isFinite(index) || !Number.isFinite(ml)) return null;

    return { index, ml };
  }, []);

  /**
   * Parse DEV line (battery)
   */
  const parseDEVLine = useCallback((line: string) => {
    const match = /^DEV\s+(\d{1,3})/.exec(line);
    if (!match) return null;

    const battery = parseInt(match[1], 10);
    return Number.isFinite(battery)
      ? Math.max(0, Math.min(100, battery))
      : null;
  }, []);

  /**
   * Handle incoming line
   */
  const handleLine = useCallback(
    (line: string) => {
      console.log("📥 [MOCK]:", line);

      // Pass to protocol handler
      onLineReceived?.(line);

      // Parse DL
      const dlData = parseDLLine(line);
      if (dlData) {
        if (!seenIndicesRef.current.has(dlData.index)) {
          seenIndicesRef.current.add(dlData.index);
          onDataReceived?.(dlData);
        }
        return;
      }

      // Parse battery
      const battery = parseDEVLine(line);
      if (battery !== null) {
        setBatteryLevel(battery);
        return;
      }
    },
    [parseDLLine, parseDEVLine, onDataReceived, onLineReceived]
  );

  /**
   * Setup mock coaster
   */
  useEffect(() => {
    if (isConnected && autoConnect) {
      // Generate initial logs
      mockCoaster.generateLogs(initialLogCount);

      // Connect and listen
      mockCoaster.connect(handleLine);
      setIsReady(true);

      console.log("🔌 [MOCK] BLE ready");

      return () => {
        mockCoaster.disconnect();
        setIsReady(false);
      };
    }
  }, [isConnected, autoConnect, initialLogCount, handleLine]);

  /**
   * Send command
   */
  const sendCommand = useCallback(
    async (command: string): Promise<boolean> => {
      if (!isReady) return false;

      mockCoaster.handleCommand(command);
      return true;
    },
    [isReady]
  );

  /**
   * Reset seen indices
   */
  const resetSeenIndices = useCallback(() => {
    seenIndicesRef.current.clear();
  }, []);

  return {
    isReady,
    batteryLevel,
    sendCommand,
    resetSeenIndices,
  };
}
