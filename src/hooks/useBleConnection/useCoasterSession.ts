import { useEffect, useRef, useCallback } from "react";
import { Device } from "react-native-ble-plx";
import { useSession } from "./useSession";
import { useProtocolHandler } from "./useProtocolHandler";
import { useReconnectHandler } from "./useRecconectHandler";
import { useBLEWrapper } from "../MockBleProvider/useBleWrapper";
import { getSelectedGender } from "../../utils/storage";
import { BLE_DEVICE, BLE_PROTOCOL, BLE_TIMEOUTS } from "../../constants/bleConstants";
import { SESSION_CONFIG } from "../../constants/sessionConstants";


/**
 * Coordinator: BLE + Session Logic + Protocol
 */

interface CoasterSessionConfig {
  device: Device | null;
  isConnected: boolean;
  dlPerInterval?: number;
}

export function useCoasterSession(config: CoasterSessionConfig) {
  const { device, isConnected, dlPerInterval = BLE_PROTOCOL.LOGS_PER_INTERVAL } = config;

  const session = useSession();
  const sessionStartedRef = useRef(false);
  const autoSyncRef = useRef(false);
  const lastDLTimestampRef = useRef<number | null>(null);

  // Store session in ref to avoid recreating callbacks
  const sessionRef = useRef(session);
  sessionRef.current = session;

  /**
   * Map DL → Interval
   */
  const mapDLToInterval = useCallback((dlIndex: number): number => {
    return Math.floor(dlIndex / dlPerInterval);
  }, [dlPerInterval]);

  /**
   * Handle BLE data - using ref to avoid dependency changes
   */
  const handleBLEData = useCallback((data: { index: number; ml: number }) => {
    const currentSession = sessionRef.current;
    if (!currentSession.isActive) return;

    const intervalIndex = mapDLToInterval(data.index);

    if (intervalIndex < 0 || intervalIndex >= SESSION_CONFIG.totalIntervals) {
      console.warn(`⚠️ Interval ${intervalIndex} out of range (max: ${SESSION_CONFIG.totalIntervals - 1})`);
      return;
    }

    // Update last DL timestamp for reconnect detection
    lastDLTimestampRef.current = Date.now();

    // Record hydration
    currentSession.recordDrink(data.ml);

    console.log(
      `💧 DL ${data.index} → Interval ${intervalIndex}: +${data.ml.toFixed(1)}ml`
    );
  }, [mapDLToInterval]);

  // Reconnect handler
  const reconnect = useReconnectHandler(isConnected, {
    onReconnect: () => {
      console.log("🔄 Backfill: requesting all logs");
      requestLogs();
    },
    onBackfillComplete: () => {
      console.log("🔄 Backfill complete");
    },
    sessionStartTime: session.session?.startTime ?? null,
    lastDLTimestamp: lastDLTimestampRef.current,
  });

  // Protocol handler
  const protocol = useProtocolHandler({
    onDataStart: () => {
      console.log("📊 Data transfer started");
    },
    onDataComplete: (count) => {
      console.log(`📊 Data complete: ${count} logs`);

      // Auto-sync if we got 0 logs or >= max expected logs
      if ((count === 0 || count >= BLE_PROTOCOL.MAX_EXPECTED_LOGS) && !autoSyncRef.current) {
        autoSyncRef.current = true;
        setTimeout(() => {
          sendGoalAndSync();
        }, BLE_TIMEOUTS.AUTO_SYNC_DELAY);
      }
    },
    onGoalAck: () => {
      console.log("✅ GOAL confirmed, sending SYNC...");
      sendTimeSync();
    },
    onSyncAck: () => {
      console.log("✅ SYNC complete, session ready");
      autoSyncRef.current = false;
    },
    onError: (msg) => {
      console.error(`❌ Coaster error: ${msg}`);
    },
  });

  // Store protocol in ref to avoid recreating callbacks
  const protocolRef = useRef(protocol);
  protocolRef.current = protocol;

  /**
   * Handle protocol lines (ACK/END/ERR/SDT)
   */
  const handleProtocolLine = useCallback((line: string) => {
    protocolRef.current.handleProtocolLine(line);
  }, []);

  // BLE (with mock support)
  const ble = useBLEWrapper(
    {
      device,
      isConnected,
      targetService: BLE_DEVICE.SERVICE_UUID,
      rxCharacteristic: BLE_DEVICE.RX_CHARACTERISTIC,
      txCharacteristic: BLE_DEVICE.TX_CHARACTERISTIC,
    },
    handleBLEData,
    handleProtocolLine
  );

  /**
   * Auto-start session
   */
  useEffect(() => {
    if (isConnected && device && !sessionStartedRef.current && ble.isReady) {
      const gender = getSelectedGender();
      session.start(gender);
      sessionStartedRef.current = true;
      ble.resetSeenIndices();
      protocol.reset();
      autoSyncRef.current = false;

      console.log(`🏁 Session started (${gender})`);
    }
  }, [isConnected, device, ble.isReady]);

  /**
   * Commands
   */
  const sendGoal = useCallback(async (ml: number, min: number) => {
    const cmd = `GOAL ${ml} ${min}\r\n`;
    const ok = await ble.sendCommand(cmd);
    if (ok) {
      protocol.expectGoalAck();
      console.log(`🎯 GOAL: ${ml}ml / ${min}min`);
    }
    return ok;
  }, [ble, protocol]);

  const sendTimeSync = useCallback(async () => {
    const now = new Date();
    const YY = String(now.getFullYear() % 100).padStart(2, "0");
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const DD = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    
    const ts = `${YY}${MM}${DD}${hh}${mm}${ss}`;
    const cmd = `SYNC ${ts}\r\n`;
    
    const ok = await ble.sendCommand(cmd);
    if (ok) {
      protocol.expectSyncAck();
      console.log(`⏰ SYNC: ${ts}`);
    }
    return ok;
  }, [ble, protocol]);

  const requestLogs = useCallback(async () => {
    protocol.startDataTransfer();
    const ok = await ble.sendCommand("GET ALL\r\n");
    if (ok) {
      console.log("📥 GET ALL");
      ble.resetSeenIndices();
    }
    return ok;
  }, [ble, protocol]);

  /**
   * Send GOAL then SYNC (auto flow)
   */
  const sendGoalAndSync = useCallback(async () => {
    // Send goal (default values from BLE protocol)
    await sendGoal(BLE_PROTOCOL.COASTER_GOAL_ML, BLE_PROTOCOL.COASTER_GOAL_INTERVAL_MIN);
    // SYNC will be sent after GOAL ACK (handled in protocol callbacks)
  }, [sendGoal]);

  return {
    // Session
    session,
    isSessionActive: session.isActive,
    
    // BLE
    isBLEReady: ble.isReady,
    batteryLevel: ble.batteryLevel,
    
    // Protocol
    protocolState: protocol.state,
    dlCount: protocol.dlCount,
    lastError: protocol.lastError,
    
    // Reconnect
    reconnectCount: reconnect.reconnectCount,
    missedIntervals: reconnect.getMissedIntervals(),
    
    // Commands
    sendGoal,
    sendTimeSync,
    requestLogs,
    sendGoalAndSync,
    
    // Actions
    completeSession: () => {
      session.end();
      sessionStartedRef.current = false;
      protocol.reset();
    },
  };
}