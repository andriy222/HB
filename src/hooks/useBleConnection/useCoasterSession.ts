import { useEffect, useRef, useCallback } from 'react';
import { Device } from 'react-native-ble-plx';
import { useSession } from './useSession';
import { useProtocolHandler } from './useProtocolHandler';
import { useReconnectHandler } from './useRecconectHandler';
import { useBLEWrapper } from '../MockBleProvider/useBleWrapper';
import { getSelectedGender } from '../../utils/storage';
import { BLE_DEVICE, BLE_PROTOCOL, BLE_TIMEOUTS } from '../../constants/bleConstants';
import { logger } from '../../utils/logger';

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
   * Now uses coaster timestamp for accurate interval calculation
   */
  const handleBLEData = useCallback((data: { index: number; ml: number; timestampDate?: Date }) => {
    const currentSession = sessionRef.current;
    if (!currentSession.isActive) {return;}

    // Use coaster timestamp if available, otherwise fall back to Date.now()
    const eventTime = data.timestampDate?.getTime() ?? Date.now();

    // Update last DL timestamp for reconnect detection
    lastDLTimestampRef.current = eventTime;

    // Record hydration with coaster timestamp for accurate interval calculation
    currentSession.recordDrink(data.ml, data.timestampDate);

    const intervalIndex = mapDLToInterval(data.index);
    console.log(
      `💧 DL ${data.index} → Interval ${intervalIndex}: +${data.ml.toFixed(1)}ml` +
      (data.timestampDate ? ` @ ${data.timestampDate.toLocaleTimeString()}` : ' (no timestamp)'),
    );
  }, [mapDLToInterval]);

  // Reconnect handler
  const reconnect = useReconnectHandler(isConnected, {
    onReconnect: () => {
      logger.debug('🔄 Backfill: requesting all logs');
      requestLogs();
    },
    onBackfillComplete: () => {
      logger.debug('🔄 Backfill complete');
    },
    sessionStartTime: session.session?.startTime ?? null,
    lastDLTimestamp: lastDLTimestampRef.current,
  });

  // Protocol handler
  const protocol = useProtocolHandler({
    onDataStart: () => {
      logger.debug('📊 Data transfer started');
    },
    onDataComplete: (count) => {
      logger.info(`📊 Data complete: ${count} logs`);

      // Auto-sync if we got 0 logs or >= max expected logs
      if ((count === 0 || count >= BLE_PROTOCOL.MAX_EXPECTED_LOGS) && !autoSyncRef.current) {
        autoSyncRef.current = true;
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
      logger.info('✅ SYNC complete, session ready');
      autoSyncRef.current = false;
    },
    onError: (msg) => {
      logger.error(`❌ Coaster error: ${msg}`);
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
    handleProtocolLine,
  );

  /**
   * Auto-start or restore session on BLE connect
   *
   * PRD: "Backgrounding/quit: coaster keeps logging; on reconnect,
   * the app re-syncs time and backfills before applying penalties"
   */
  useEffect(() => {
    if (!isConnected || !device || !ble.isReady) {return;}

    // Check if we have an active restored session
    if (currentSession.session?.isActive && currentSession.session?.startTime) {
      // Session was restored from storage - request backfill
      if (!sessionStartedRef.current) {
        sessionStartedRef.current = true;
        ble.resetSeenIndices();
        protocol.reset();
        autoSyncRef.current = false;

        logger.info('🔄 Session restored, requesting backfill...');

        // Request all logs from coaster to catch up on missed data
        setTimeout(() => {
          requestLogs();
        }, BLE_TIMEOUTS.BACKFILL_STABILIZATION_DELAY);
      }
    } else if (!sessionStartedRef.current) {
      // No active session - start a new one
      const gender = getSelectedGender();
      session.start(gender);
      sessionStartedRef.current = true;
      ble.resetSeenIndices();
      protocol.reset();
      autoSyncRef.current = false;

      logger.info(`🏁 New session started (${gender})`);

      // Firmware requires: GET ALL → GOAL → SYNC sequence
      // Request logs first, then GOAL/SYNC will be sent after data complete
      setTimeout(() => {
        requestLogs();
      }, BLE_TIMEOUTS.BACKFILL_STABILIZATION_DELAY);
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
      logger.info(`🎯 GOAL: ${ml}ml / ${min}min`);
    }
    return ok;
  }, [ble, protocol]);

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

    const ok = await ble.sendCommand(cmd);
    if (ok) {
      protocol.expectSyncAck();
      logger.info(`⏰ SYNC: ${ts}`);
    }
    return ok;
  }, [ble, protocol]);

  const requestLogs = useCallback(async () => {
    protocol.startDataTransfer();
    const ok = await ble.sendCommand('GET ALL\r\n');
    if (ok) {
      logger.info('📥 GET ALL');
      ble.resetSeenIndices();
    }
    return ok;
  }, [ble, protocol]);

  /**
   * Request battery level from device
   * Device responds with "DEV <0-100>" line
   */
  const requestBattery = useCallback(async () => {
    const ok = await ble.sendCommand('GET BATT\r\n');
    if (ok) {
      logger.info('🔋 GET BATT');
    }
    return ok;
  }, [ble]);

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
    requestBattery,
    sendGoalAndSync,

    // Actions
    completeSession: () => {
      session.end();
      sessionStartedRef.current = false;
      protocol.reset();
    },
  };
}
