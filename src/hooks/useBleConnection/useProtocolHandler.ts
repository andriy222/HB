import { useState, useRef, useCallback } from 'react';
import { BLE_TIMEOUTS } from '../../constants/bleConstants';
import { logger } from '../../utils/logger';

/**
 * Protocol Response Handler
 *
 * Handles coaster responses:
 * - ACK: command acknowledged
 * - END: data transfer complete
 * - ERR: error from coaster
 * - SDT: start data transfer
 */

export type ProtocolState =
  | 'idle'
  | 'requesting'
  | 'receiving'
  | 'syncing'
  | 'complete'
  | 'error';

interface ProtocolHandlerCallbacks {
  onDeviceReady?: () => void;
  onDataStart?: () => void;
  onDataComplete?: (count: number) => void;
  onSyncAck?: () => void;
  onGoalAck?: () => void;
  onError?: (message: string) => void;
}

export function useProtocolHandler(callbacks?: ProtocolHandlerCallbacks) {
  const [state, setState] = useState<ProtocolState>('idle');
  const [dlCount, setDlCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const awaitingGoalAckRef = useRef(false);
  const awaitingSyncAckRef = useRef(false);
  const dlCountRef = useRef(0);
  const idleTimerRef = useRef<any>(null);
  const stateRef = useRef<ProtocolState>('idle');
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Guard against multiple END processing
  const dataCompleteCalledRef = useRef(false);

  const handleProtocolLine = useCallback((line: string) => {
    const trimmed = line.trim().toUpperCase();

    if (trimmed.startsWith('SDT')) {
      logger.debug('📊 SDT: Data transfer starting');
      setState('receiving');
      stateRef.current = 'receiving';
      callbacksRef.current?.onDataStart?.();
      return true;
    }

    if (trimmed.startsWith('DL')) {
      dlCountRef.current += 1;
      setDlCount(dlCountRef.current);

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        // Use ref to avoid stale closure
        if (stateRef.current === 'receiving') {
          logger.debug('⏱️ DL stream idle → auto-completing');
          handleProtocolLine('END');
        }
      }, BLE_TIMEOUTS.PROTOCOL_IDLE_TIMEOUT);

      return true;
    }

    if (trimmed.startsWith('END')) {
      // Guard against multiple END processing (race between real END and idle timeout)
      if (dataCompleteCalledRef.current) {
        logger.debug('📊 END ignored (already processed)');
        return true;
      }
      dataCompleteCalledRef.current = true;

      logger.info(`📊 END received: ${dlCountRef.current} logs`);
      setState('idle');
      stateRef.current = 'idle';

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }

      callbacksRef.current?.onDataComplete?.(dlCountRef.current);
      return true;
    }

    if (trimmed === 'ACK') {
      if (awaitingGoalAckRef.current) {
        logger.info('✅ ACK: GOAL confirmed');
        awaitingGoalAckRef.current = false;
        callbacksRef.current?.onGoalAck?.();
        return true;
      }

      if (awaitingSyncAckRef.current) {
        logger.info('✅ ACK: SYNC confirmed');
        awaitingSyncAckRef.current = false;
        setState('complete');
        stateRef.current = 'complete';
        callbacksRef.current?.onSyncAck?.();
        return true;
      }

      logger.info('ℹ️ ACK: (no pending command)');
      return true;
    }

    if (trimmed.startsWith('ERR')) {
      const message = line.substring(3).trim() || 'Unknown error';
      logger.error(`❌ ERR: ${message}`);
      setState('error');
      stateRef.current = 'error';
      setLastError(message);
      callbacksRef.current?.onError?.(message);
      return true;
    }

    // Recognized but no-op: BATT responses handled by useBleConnection
    if (trimmed.startsWith('BATT')) {
      return true;
    }

    // READY signal from device - device is ready to receive commands
    if (trimmed === 'READY') {
      logger.info('✅ READY: Device ready to receive commands');
      callbacksRef.current?.onDeviceReady?.();
      return true;
    }

    return false;
  }, []);

  const expectGoalAck = useCallback(() => {
    awaitingGoalAckRef.current = true;
    logger.debug('⏳ Waiting for GOAL ACK...');
  }, []);

  const expectSyncAck = useCallback(() => {
    awaitingSyncAckRef.current = true;
    setState('syncing');
    logger.debug('⏳ Waiting for SYNC ACK...');
  }, []);



  const startDataTransfer = useCallback(() => {
    setState('requesting');
    stateRef.current = 'requesting';
    dlCountRef.current = 0;
    setDlCount(0);
    dataCompleteCalledRef.current = false; // Reset guard for new transfer
    logger.debug('📥 Starting data transfer...');
  }, []);


  const reset = useCallback(() => {
    setState('idle');
    stateRef.current = 'idle';
    setDlCount(0);
    setLastError(null);
    dlCountRef.current = 0;
    awaitingGoalAckRef.current = false;
    awaitingSyncAckRef.current = false;
    dataCompleteCalledRef.current = false;

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const getDLCount = useCallback(() => dlCountRef.current, []);

  return {
    state,
    dlCount,
    lastError,
    isWaitingForAck: awaitingGoalAckRef.current || awaitingSyncAckRef.current,

    handleProtocolLine,
    expectGoalAck,
    expectSyncAck,
    startDataTransfer,
    reset,
    getDLCount,
  };
}
