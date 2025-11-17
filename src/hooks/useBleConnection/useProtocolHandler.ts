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
  
  const awaitingGoalAckRef = useRef(false);
  const awaitingSyncAckRef = useRef(false);
  const dlCountRef = useRef(0);
  const idleTimerRef = useRef<any>(null);

  const handleProtocolLine = useCallback((line: string) => {
    const trimmed = line.trim().toUpperCase();

    if (trimmed.startsWith("SDT")) {
      logger.debug("📊 SDT: Data transfer starting");
      setState("receiving");
      callbacks?.onDataStart?.();
      return true;
    }

    if (trimmed.startsWith("DL")) {
      dlCountRef.current += 1;
      setDlCount(dlCountRef.current);
      
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        if (state === "receiving") {
          logger.debug("⏱️ DL stream idle → auto-completing");
          handleProtocolLine("END");
        }
      }, BLE_TIMEOUTS.PROTOCOL_IDLE_TIMEOUT);
      
      return true;
    }

    if (trimmed.startsWith("END")) {
      logger.info(`📊 END: ${dlCountRef.current} logs received`);
      setState("idle");
      
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      
      callbacks?.onDataComplete?.(dlCountRef.current);
      return true;
    }
    if (trimmed === "ACK") {
      if (awaitingGoalAckRef.current) {
        logger.info("✅ ACK: GOAL confirmed");
        awaitingGoalAckRef.current = false;
        callbacks?.onGoalAck?.();
        return true;
      }

      if (awaitingSyncAckRef.current) {
        logger.info("✅ ACK: SYNC confirmed");
        awaitingSyncAckRef.current = false;
        setState("complete");
        callbacks?.onSyncAck?.();
        return true;
      }

      logger.info("ℹ️ ACK: (no pending command)");
      return true;
    }

    if (trimmed.startsWith("ERR")) {
      const message = line.substring(3).trim() || "Unknown error";
      logger.error(`❌ ERR: ${message}`);
      setState("error");
      setLastError(message);
      callbacks?.onError?.(message);
      return true;
    }

    return false;
  }, [state, callbacks]);

  const expectGoalAck = useCallback(() => {
    awaitingGoalAckRef.current = true;
    logger.debug("⏳ Waiting for GOAL ACK...");
  }, []);

  const expectSyncAck = useCallback(() => {
    awaitingSyncAckRef.current = true;
    setState("syncing");
    logger.debug("⏳ Waiting for SYNC ACK...");
  }, []);



  const startDataTransfer = useCallback(() => {
    setState("requesting");
    dlCountRef.current = 0;
    setDlCount(0);
    logger.debug("📥 Starting data transfer...");
  }, []);


  const reset = useCallback(() => {
    setState("idle");
    setDlCount(0);
    setLastError(null);
    dlCountRef.current = 0;
    awaitingGoalAckRef.current = false;
    awaitingSyncAckRef.current = false;
    
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