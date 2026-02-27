import { useState, useRef, useCallback } from "react";
import { BLE_TIMEOUTS } from "../../constants/bleConstants";
import { logger } from "../../utils/logger";

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
  | "idle"          
  | "requesting"     
  | "receiving"      
  | "syncing"        
  | "complete"     
  | "error";     

interface ProtocolHandlerCallbacks {
  onDataStart?: () => void;   
  onDataComplete?: (count: number) => void;
  onSyncAck?: () => void;
  onGoalAck?: () => void;
  onError?: (message: string) => void;
}

export function useProtocolHandler(callbacks?: ProtocolHandlerCallbacks) {
  const [state, setState] = useState<ProtocolState>("idle");
  const [dlCount, setDlCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  // Use ref to track state for closures (avoids stale state in timeouts)
  const stateRef = useRef<ProtocolState>("idle");
  const setStateAndRef = (newState: ProtocolState) => {
    stateRef.current = newState;
    setState(newState);
  };

  const awaitingGoalAckRef = useRef(false);
  const awaitingSyncAckRef = useRef(false);
  const dlCountRef = useRef(0);
  const idleTimerRef = useRef<any>(null);
  const noResponseTimerRef = useRef<any>(null);
  const ackTimeoutRef = useRef<any>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const handleProtocolLine = useCallback((line: string) => {
    const trimmed = line.trim().toUpperCase();

    if (trimmed.startsWith("SDT")) {
      logger.debug("📊 SDT: Data transfer starting");
      if (noResponseTimerRef.current) {
        clearTimeout(noResponseTimerRef.current);
        noResponseTimerRef.current = null;
      }
      setStateAndRef("receiving");
      callbacksRef.current?.onDataStart?.();
      return true;
    }

    if (trimmed.startsWith("DL")) {
      // Data is coming — clear the no-response safety timer
      if (noResponseTimerRef.current) {
        clearTimeout(noResponseTimerRef.current);
        noResponseTimerRef.current = null;
      }
      dlCountRef.current += 1;
      setDlCount(dlCountRef.current);

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        // Use ref to avoid stale closure over render-time state
        if (stateRef.current === "receiving") {
          logger.debug("⏱️ DL stream idle → auto-completing");
          handleProtocolLine("END");
        }
      }, BLE_TIMEOUTS.PROTOCOL_IDLE_TIMEOUT);

      return true;
    }

    if (trimmed.startsWith("END")) {
      logger.info(`📊 END: ${dlCountRef.current} logs received`);
      setStateAndRef("idle");

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      if (noResponseTimerRef.current) {
        clearTimeout(noResponseTimerRef.current);
        noResponseTimerRef.current = null;
      }

      callbacksRef.current?.onDataComplete?.(dlCountRef.current);
      return true;
    }

    if (trimmed === "ACK") {
      // Clear ACK timeout on any ACK
      if (ackTimeoutRef.current) {
        clearTimeout(ackTimeoutRef.current);
        ackTimeoutRef.current = null;
      }

      if (awaitingGoalAckRef.current) {
        logger.info("✅ ACK: GOAL confirmed");
        awaitingGoalAckRef.current = false;
        callbacksRef.current?.onGoalAck?.();
        return true;
      }

      if (awaitingSyncAckRef.current) {
        logger.info("✅ ACK: SYNC confirmed");
        awaitingSyncAckRef.current = false;
        setStateAndRef("complete");
        callbacksRef.current?.onSyncAck?.();
        return true;
      }

      logger.info("ℹ️ ACK: (no pending command)");
      return true;
    }

    if (trimmed.startsWith("ERR")) {
      const message = line.substring(3).trim() || "Unknown error";
      logger.error(`❌ ERR: ${message}`);
      setStateAndRef("error");
      setLastError(message);
      callbacksRef.current?.onError?.(message);
      return true;
    }

    return false;
  }, []);

  const ACK_TIMEOUT_MS = 5000;

  const expectGoalAck = useCallback(() => {
    awaitingGoalAckRef.current = true;
    logger.debug("⏳ Waiting for GOAL ACK...");

    if (ackTimeoutRef.current) clearTimeout(ackTimeoutRef.current);
    ackTimeoutRef.current = setTimeout(() => {
      if (awaitingGoalAckRef.current) {
        logger.warn("⚠️ GOAL ACK timeout (5s)");
        awaitingGoalAckRef.current = false;
        callbacksRef.current?.onError?.("GOAL ACK timeout");
      }
    }, ACK_TIMEOUT_MS);
  }, []);

  const expectSyncAck = useCallback(() => {
    awaitingSyncAckRef.current = true;
    setStateAndRef("syncing");
    logger.debug("⏳ Waiting for SYNC ACK...");

    if (ackTimeoutRef.current) clearTimeout(ackTimeoutRef.current);
    ackTimeoutRef.current = setTimeout(() => {
      if (awaitingSyncAckRef.current) {
        logger.warn("⚠️ SYNC ACK timeout (5s)");
        awaitingSyncAckRef.current = false;
        callbacksRef.current?.onError?.("SYNC ACK timeout");
      }
    }, ACK_TIMEOUT_MS);
  }, []);



  const NO_RESPONSE_TIMEOUT_MS = 5000;

  const startDataTransfer = useCallback(() => {
    setStateAndRef("requesting");
    dlCountRef.current = 0;
    setDlCount(0);
    logger.debug("📥 Starting data transfer...");

    // Safety: if coaster sends no SDT/DL/END within 5s, auto-complete with 0 logs.
    // This handles the case where coaster has no data and stays silent after GET ALL.
    if (noResponseTimerRef.current) clearTimeout(noResponseTimerRef.current);
    noResponseTimerRef.current = setTimeout(() => {
      if (stateRef.current === "requesting") {
        logger.warn("⚠️ No response to GET ALL within 5s — completing with 0 logs");
        setStateAndRef("idle");
        callbacksRef.current?.onDataComplete?.(0);
      }
    }, NO_RESPONSE_TIMEOUT_MS);
  }, []);


  const reset = useCallback(() => {
    setStateAndRef("idle");
    setDlCount(0);
    setLastError(null);
    dlCountRef.current = 0;
    awaitingGoalAckRef.current = false;
    awaitingSyncAckRef.current = false;

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (ackTimeoutRef.current) {
      clearTimeout(ackTimeoutRef.current);
      ackTimeoutRef.current = null;
    }
    if (noResponseTimerRef.current) {
      clearTimeout(noResponseTimerRef.current);
      noResponseTimerRef.current = null;
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