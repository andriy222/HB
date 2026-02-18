import { useEffect, useRef, useCallback } from 'react';
import { Device } from 'react-native-ble-plx';
import { useSession } from './useSession';
import { useProtocolHandler } from './useProtocolHandler';
import { useBLEWrapper } from '../MockBleProvider/useBleWrapper';
import { getSelectedGender } from '../../utils/storage';
import { BLE_DEVICE, BLE_PROTOCOL, BLE_TIMEOUTS } from '../../constants/bleConstants';
import { logger } from '../../utils/logger';

/**
 * Coordinator: BLE + Session Logic + Protocol
 *
 * Single source of truth for all BLE commands.
 * All command triggers go through this hook.
 */

interface CoasterSessionConfig {
  device: Device | null;
  isConnected: boolean;
  dlPerInterval?: number;
}

export function useCoasterSession(config: CoasterSessionConfig) {
  const { device, isConnected, dlPerInterval = BLE_PROTOCOL.LOGS_PER_INTERVAL } = config;

  const session = useSession();

  // Guards to prevent duplicate commands
  const sessionStartedRef = useRef(false);
  const goalSyncInProgressRef = useRef(false);
  const getAllInProgressRef = useRef(false);

  // Track device READY state - don't send commands until device signals READY
  const deviceReadyRef = useRef(false);
  const waitingForReadyRef = useRef(false);

  // Track disconnect for reconnect detection
  const wasConnectedRef = useRef(false);
  const disconnectTimeRef = useRef<number | null>(null);
  const reconnectCountRef = useRef(0);

  // Data tracking
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
  const handleBLEData = useCallback((data: { index: number; ml: number; timestampDate?: Date }) => {
    const currentSession = sessionRef.current;
    if (!currentSession.isActive) {return;}

    const eventTime = data.timestampDate?.getTime() ?? Date.now();
    lastDLTimestampRef.current = eventTime;

    currentSession.recordDrink(data.ml, data.timestampDate);

    const intervalIndex = mapDLToInterval(data.index);
    logger.debug(
      `💧 DL ${data.index} → Interval ${intervalIndex}: +${data.ml.toFixed(1)}ml` +
      (data.timestampDate ? ` @ ${data.timestampDate.toLocaleTimeString()}` : ''),
    );
  }, [mapDLToInterval]);

  /**
   * Protocol handler with stable callbacks via refs
   */
  const protocolCallbacksRef = useRef({
    onDeviceReady: () => {},
    onDataComplete: (_count: number) => {},
    onGoalAck: () => {},
    onSyncAck: () => {},
    onError: (_msg: string) => {},
  });

  const protocol = useProtocolHandler({
    onDeviceReady: () => {
      protocolCallbacksRef.current.onDeviceReady();
    },
    onDataStart: () => {
      logger.debug('📊 Data transfer started');
    },
    onDataComplete: (count) => {
      protocolCallbacksRef.current.onDataComplete(count);
    },
    onGoalAck: () => {
      protocolCallbacksRef.current.onGoalAck();
    },
    onSyncAck: () => {
      protocolCallbacksRef.current.onSyncAck();
    },
    onError: (msg) => {
      protocolCallbacksRef.current.onError(msg);
    },
  });

  // Store protocol in ref
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
    handleProtocolLine,
  );

  // Store ble in ref for use in callbacks
  const bleRef = useRef(ble);
  bleRef.current = ble;

  /**
   * Send GOAL command
   */
  const sendGoal = useCallback(async (ml: number, min: number) => {
    const cmd = `GOAL ${ml} ${min}\r\n`;
    const ok = await bleRef.current.sendCommand(cmd);
    if (ok) {
      protocolRef.current.expectGoalAck();
      logger.info(`🎯 GOAL: ${ml}ml / ${min}min`);
    }
    return ok;
  }, []);

  /**
   * Send SYNC command
   */
  const sendTimeSync = useCallback(async () => {
    const now = new Date();
    const YY = String(now.getFullYear() % 100).padStart(2, '0');
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    const ts = `${YY}${MM}${DD}${hh}${mm}${ss}`;
    const cmd = `SYNC ${ts}\r\n`;

    const ok = await bleRef.current.sendCommand(cmd);
    if (ok) {
      protocolRef.current.expectSyncAck();
      logger.info(`⏰ SYNC: ${ts}`);
    }
    return ok;
  }, []);

  /**
   * Request all logs from device
   */
  const requestLogs = useCallback(async () => {
    // Guard: prevent multiple GET ALL in progress
    if (getAllInProgressRef.current) {
      logger.warn('⏳ GET ALL already in progress');
      return false;
    }
    getAllInProgressRef.current = true;

    protocolRef.current.startDataTransfer();
    const ok = await bleRef.current.sendCommand('GET ALL\r\n');
    if (ok) {
      logger.info('📥 GET ALL sent');
      bleRef.current.resetSeenIndices();
    } else {
      getAllInProgressRef.current = false;
    }
    return ok;
  }, []);

  /**
   * Send GOAL then SYNC
   */
  const sendGoalAndSync = useCallback(async () => {
    // Guard: prevent multiple GOAL/SYNC in progress
    if (goalSyncInProgressRef.current) {
      logger.warn('⏳ GOAL/SYNC already in progress');
      return;
    }
    goalSyncInProgressRef.current = true;

    await sendGoal(BLE_PROTOCOL.COASTER_GOAL_ML, BLE_PROTOCOL.COASTER_GOAL_INTERVAL_MIN);
    // SYNC will be sent after GOAL ACK
  }, [sendGoal]);

  /**
   * Update protocol callbacks (using refs to avoid dependency issues)
   */
  protocolCallbacksRef.current = {
    onDeviceReady: () => {
      logger.info('✅ Device READY - starting protocol sequence');
      deviceReadyRef.current = true;

      // If we were waiting for READY, now send GET ALL
      if (waitingForReadyRef.current) {
        waitingForReadyRef.current = false;
        requestLogs();
      }
    },
    onDataComplete: (count: number) => {
      logger.info(`📊 Data complete: ${count} logs`);
      getAllInProgressRef.current = false;

      // Auto-sync after data complete
      if (count === 0 || count >= BLE_PROTOCOL.MAX_EXPECTED_LOGS) {
        logger.info(`📊 Triggering GOAL+SYNC (count=${count})`);
        setTimeout(() => {
          sendGoalAndSync();
        }, BLE_TIMEOUTS.AUTO_SYNC_DELAY);
      }
    },
    onGoalAck: () => {
      logger.info('✅ GOAL confirmed, sending SYNC...');
      sendTimeSync();
    },
    onSyncAck: () => {
      logger.info('✅ SYNC complete');
      goalSyncInProgressRef.current = false;
    },
    onError: (msg: string) => {
      logger.error(`❌ Coaster error: ${msg}`);
      // Reset guards on error
      getAllInProgressRef.current = false;
      goalSyncInProgressRef.current = false;
    },
  };

  /**
   * Track connection state changes
   */
  useEffect(() => {
    if (!isConnected && wasConnectedRef.current) {
      // Disconnected - reset device ready state
      disconnectTimeRef.current = Date.now();
      deviceReadyRef.current = false;
      waitingForReadyRef.current = false;
      logger.info('🔌 Connection lost');
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected]);

  /**
   * Main connection handler - waits for READY before sending commands
   *
   * Flow: BLE Connect → Wait for READY → GET ALL → GOAL → SYNC
   * Firmware sends "READY\r\n" when it's ready to receive commands
   */
  useEffect(() => {
    if (!isConnected || !device || !ble.isReady) {
      return;
    }

    // Check if this is a reconnect
    const isReconnect = disconnectTimeRef.current !== null;

    if (isReconnect) {
      // Calculate missed time
      const missedMs = Date.now() - (disconnectTimeRef.current ?? Date.now());
      const missedMinutes = missedMs / (60 * 1000);

      reconnectCountRef.current += 1;
      disconnectTimeRef.current = null; // Clear for next disconnect

      logger.info(`🔌 Reconnected after ${missedMinutes.toFixed(1)}min (count: ${reconnectCountRef.current})`);

      // Reset state for new data transfer
      bleRef.current.resetSeenIndices();
      protocolRef.current.reset();
      getAllInProgressRef.current = false;
      goalSyncInProgressRef.current = false;
      deviceReadyRef.current = false;

      // Wait for READY signal before sending commands
      waitingForReadyRef.current = true;
      logger.info('⏳ Waiting for device READY signal...');

      return;
    }

    // Initial connection
    if (sessionStartedRef.current) {
      return; // Already initialized
    }

    // Check if we have a restored session
    if (session.session?.isActive && session.session?.startTime) {
      logger.info('🔄 Session restored, waiting for device READY...');
    } else {
      // Start new session
      const gender = getSelectedGender();
      session.start(gender);
      logger.info(`🏁 New session started (${gender})`);
    }

    sessionStartedRef.current = true;
    bleRef.current.resetSeenIndices();
    protocolRef.current.reset();
    getAllInProgressRef.current = false;
    goalSyncInProgressRef.current = false;
    deviceReadyRef.current = false;

    // Wait for READY signal before sending GET ALL
    // Device will send "READY\r\n" when it's ready to receive commands
    waitingForReadyRef.current = true;
    logger.info('⏳ Waiting for device READY signal...');
  }, [isConnected, device, ble.isReady, session]);

  /**
   * Keep-alive: Coaster disconnects after 25s without messages
   */
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isConnected && ble.isReady) {
      keepAliveRef.current = setInterval(() => {
        bleRef.current.sendCommand('GET BATT\r\n').then((ok) => {
          if (ok) {
            logger.debug('💓 Keep-alive ping');
          }
        });
      }, BLE_TIMEOUTS.KEEP_ALIVE_INTERVAL);

      logger.info('💓 Keep-alive started');
    }

    return () => {
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
        keepAliveRef.current = null;
      }
    };
  }, [isConnected, ble.isReady]);

  /**
   * Request battery level
   */
  const requestBattery = useCallback(async () => {
    const ok = await bleRef.current.sendCommand('GET BATT\r\n');
    if (ok) {
      logger.debug('🔋 GET BATT');
    }
    return ok;
  }, []);

  /**
   * Calculate missed intervals (for UI display)
   */
  const getMissedIntervals = useCallback((): number[] => {
    const startTime = session.session?.startTime;
    const lastDL = lastDLTimestampRef.current;
    if (!startTime || !lastDL) {return [];}

    const now = Date.now();
    const currentInterval = Math.floor((now - startTime) / (10 * 60 * 1000));
    const lastDLInterval = Math.floor((lastDL - startTime) / (10 * 60 * 1000));

    const missed: number[] = [];
    for (let i = lastDLInterval + 1; i <= currentInterval; i++) {
      if (i >= 0 && i < 42) {
        missed.push(i);
      }
    }
    return missed;
  }, [session.session?.startTime]);

  return {
    // Session
    session,
    isSessionActive: session.isActive,

    // BLE
    isBLEReady: ble.isReady,
    batteryLevel: ble.batteryLevel,

    // Device ready state
    isDeviceReady: deviceReadyRef.current,
    isWaitingForReady: waitingForReadyRef.current,

    // Protocol
    protocolState: protocol.state,
    dlCount: protocol.dlCount,
    lastError: protocol.lastError,

    // Reconnect stats
    reconnectCount: reconnectCountRef.current,
    missedIntervals: getMissedIntervals(),

    // Commands
    sendGoal,
    sendTimeSync,
    requestLogs,
    requestBattery,
    sendGoalAndSync,

    // Actions
    completeSession: () => {
      session.end();
      sessionStartedRef.current = false;
      protocolRef.current.reset();
      getAllInProgressRef.current = false;
      goalSyncInProgressRef.current = false;
      deviceReadyRef.current = false;
      waitingForReadyRef.current = false;
    },
  };
}
