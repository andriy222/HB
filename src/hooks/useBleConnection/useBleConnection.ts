import { useEffect, useRef, useState, useCallback } from 'react';
import { Device } from 'react-native-ble-plx';
import { base64Decode, base64Encode } from '../../utils/base64';
import { logger } from '../../utils/logger';
import { REGEX_PATTERNS, VALIDATION, PROTOCOL_COMMANDS } from '../../constants/appConstants';

/** Minimum interval between identical commands (ms) to prevent duplicates */
const COMMAND_DEDUP_WINDOW = 500;

interface BLEConfig {
  targetService: string;
  rxCharacteristic: string;
  txCharacteristic: string;
}

interface ParsedDLLine {
  index: number;
  ml: number;
  /** Timestamp from coaster in YYMMDDhhmmss format */
  timestamp?: string;
  /** Parsed timestamp as Date object */
  timestampDate?: Date;
  raw: string;
}

export function useBLEConnection(
  device: Device | null,
  isConnected: boolean,
  config: BLEConfig,
  onDataReceived?: (data: ParsedDLLine) => void,
  onLineReceived?: (line: string) => void,  // ✅ NEW: for protocol handler
) {
  const [isReady, setIsReady] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  const lineBufferRef = useRef<string>('');
  const subscriptionRef = useRef<any>(null);
  const seenIndicesRef = useRef<Set<number>>(new Set());

  // Command deduplication: track last command and timestamp
  const lastCommandRef = useRef<{ cmd: string; time: number } | null>(null);

  const { targetService, rxCharacteristic, txCharacteristic } = config;

  /**
   * Base64 → UTF-8 decoder (cross-platform with fallback)
   */
  const decodeBase64 = useCallback((b64: string): string => {
    try {
      return base64Decode(b64);
    } catch (e) {
      logger.warn('Failed to decode base64', e);
      return '';
    }
  }, []);

  /**
   * Parse coaster timestamp (YYMMDDhhmmss) to Date
   */
  const parseCoasterTimestamp = useCallback((ts: string): Date | undefined => {
    if (!ts || ts.length !== 12) {return undefined;}

    const year = 2000 + parseInt(ts.slice(0, 2), 10);
    const month = parseInt(ts.slice(2, 4), 10) - 1; // 0-indexed
    const day = parseInt(ts.slice(4, 6), 10);
    const hour = parseInt(ts.slice(6, 8), 10);
    const minute = parseInt(ts.slice(8, 10), 10);
    const second = parseInt(ts.slice(10, 12), 10);

    const date = new Date(year, month, day, hour, minute, second);
    return isNaN(date.getTime()) ? undefined : date;
  }, []);

  /**
   * Parse DL line: "DL <index> <ml> [timestamp]"
   * Timestamp format: YYMMDDhhmmss (e.g., 241121143000 = 2024-11-21 14:30:00)
   */
  const parseDLLine = useCallback((line: string): ParsedDLLine | null => {
    if (!line.startsWith(PROTOCOL_COMMANDS.DL)) {return null;}

    const indexMatch = REGEX_PATTERNS.DL_INDEX.exec(line);
    if (!indexMatch) {return null;}

    const index = parseInt(indexMatch[1], 10);
    if (!Number.isFinite(index)) {return null;}

    let ml = NaN;
    const afterIndex = REGEX_PATTERNS.DL_VALUE.exec(line);
    if (afterIndex) {
      ml = parseFloat(afterIndex[1]);
    }

    if (!Number.isFinite(ml)) {
      const lastNumber = REGEX_PATTERNS.DL_LAST_NUMBER.exec(line);
      if (lastNumber) {
        ml = parseFloat(lastNumber[1]);
      }
    }

    if (!Number.isFinite(ml)) {return null;}

    // Parse timestamp if present (YYMMDDhhmmss format)
    let timestamp: string | undefined;
    let timestampDate: Date | undefined;
    const tsMatch = REGEX_PATTERNS.DL_TIMESTAMP.exec(line);
    if (tsMatch) {
      timestamp = tsMatch[1];
      timestampDate = parseCoasterTimestamp(timestamp);
    }

    return { index, ml, timestamp, timestampDate, raw: line };
  }, [parseCoasterTimestamp]);

  /**
   * Parse BATT line: "BATT <millivolts>"
   * Firmware responds to GET BATT with battery voltage in mV.
   * Convert mV to percentage (3000mV=0%, 4200mV=100%).
   */
  const parseBATTLine = useCallback((line: string): number | null => {
    if (!line.startsWith(PROTOCOL_COMMANDS.BATT)) {return null;}
    const match = REGEX_PATTERNS.BATT_LEVEL.exec(line);
    if (!match) {return null;}
    const mV = parseInt(match[1], 10);
    if (!Number.isFinite(mV)) {return null;}

    // Convert mV to percentage (lithium battery: 3000mV=0%, 4200mV=100%)
    const pct = Math.round(((mV - 3000) / (4200 - 3000)) * 100);
    return Math.max(VALIDATION.BATTERY_MIN, Math.min(VALIDATION.BATTERY_MAX, pct));
  }, []);

  const handleLine = useCallback((line: string) => {
    const trimmed = line.trim();
    if (!trimmed) {return;}

    logger.ble(`RX: ${trimmed}`);

    onLineReceived?.(trimmed);

    const dlData = parseDLLine(trimmed);
    if (dlData) {
      if (!seenIndicesRef.current.has(dlData.index)) {
        seenIndicesRef.current.add(dlData.index);
        onDataReceived?.(dlData);
      }
      return;
    }

    const battery = parseBATTLine(trimmed);
    if (battery !== null) {
      setBatteryLevel(battery);
      return;
    }
  }, [parseDLLine, parseBATTLine, onDataReceived, onLineReceived]);

  const subscribe = useCallback(async () => {
    if (!device || !isConnected) {return;}

    try {
      if (subscriptionRef.current) {
        try {
          // Remove subscription on all platforms to prevent memory leak
          subscriptionRef.current.remove();
        } catch (error) {
          logger.warn('Failed to remove BLE subscription', error);
        }
        subscriptionRef.current = null;
      }

      lineBufferRef.current = '';
      seenIndicesRef.current.clear();

      const subscription = device.monitorCharacteristicForService(
        targetService,
        rxCharacteristic,
        (error, characteristic) => {
          if (error) {
            logger.warn('BLE RX error', error);
            return;
          }

          if (!characteristic?.value) {return;}

          const chunk = decodeBase64(characteristic.value);
          if (!chunk) {return;}

          lineBufferRef.current += chunk;
          const lines = lineBufferRef.current.split(REGEX_PATTERNS.LINE_SEPARATORS);
          lineBufferRef.current = lines.pop() || '';

          lines.forEach(handleLine);
        },
      );

      subscriptionRef.current = subscription;
      setIsReady(true);

      logger.ble('RX subscribed successfully');
    } catch (e) {
      logger.error('Subscribe failed', e);
      setIsReady(false);
    }
  }, [device, isConnected, targetService, rxCharacteristic, decodeBase64, handleLine]);

  const sendCommand = useCallback(async (command: string): Promise<boolean> => {
    if (!device || !isConnected) {
      logger.warn('Cannot send: not connected');
      return false;
    }

    // Command deduplication: skip if same command sent within window
    const now = Date.now();
    const cmdKey = command.trim();
    if (lastCommandRef.current) {
      const elapsed = now - lastCommandRef.current.time;
      if (lastCommandRef.current.cmd === cmdKey && elapsed < COMMAND_DEDUP_WINDOW) {
        logger.warn(`⏭️ Duplicate command blocked: "${cmdKey}" (${elapsed}ms ago)`);
        return true; // Return true to avoid triggering error handlers
      }
    }
    lastCommandRef.current = { cmd: cmdKey, time: now };

    try {
      const base64 = base64Encode(command);

      // Nordic UART Service (NUS) TX characteristic typically uses Write Without Response
      // for better throughput. Try without response first, then fallback to with response.
      try {
        await device.writeCharacteristicWithoutResponseForService(
          targetService,
          txCharacteristic,
          base64,
        );
        logger.ble(`TX: ${command.trim()}`);
        return true;
      } catch (e1) {
        // Fallback to with-response if without-response fails
        const error = e1 as Error;
        const needsResponse =
          error?.message?.includes('with response') ||
          error?.message?.includes('WRITE_TYPE');

        if (needsResponse) {
          logger.debug('Without response not supported, trying with response');
          await device.writeCharacteristicWithResponseForService(
            targetService,
            txCharacteristic,
            base64,
          );
          logger.ble(`TX (with response): ${command.trim()}`);
          return true;
        } else {
          // For other errors (disconnect, timeout, etc) - throw to outer catch
          throw e1;
        }
      }
    } catch (e) {
      logger.error('Send failed', e);
      return false;
    }
  }, [device, isConnected, targetService, txCharacteristic]);

  useEffect(() => {
    if (isConnected && device) {
      subscribe();
    }

    return () => {
      if (subscriptionRef.current) {
        try {
          // Remove subscription on all platforms to prevent memory leak
          subscriptionRef.current.remove();
        } catch (error) {
          logger.warn('Failed to remove BLE subscription', error);
        }
        subscriptionRef.current = null;
      }
      setIsReady(false);
    };
  }, [isConnected, device, subscribe]);

  return {
    isReady,
    batteryLevel,
    sendCommand,
    resetSeenIndices: () => seenIndicesRef.current.clear(),
  };
}
