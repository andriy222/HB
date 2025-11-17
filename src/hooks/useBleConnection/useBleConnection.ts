import { useEffect, useRef, useState, useCallback } from "react";
import { Device } from "react-native-ble-plx";
import { base64Decode, base64Encode } from "../../utils/base64";
import { captureBLEError, trackBLEEvent } from "../../utils/sentry";
import { logger } from "../../utils/logger";
import { REGEX_PATTERNS, VALIDATION, PROTOCOL_COMMANDS, BLE_ERROR_KEYWORDS } from "../../constants/appConstants";

interface BLEConfig {
  targetService: string;
  rxCharacteristic: string;
  txCharacteristic: string;
}

interface ParsedDLLine {
  index: number;
  ml: number;
  timestamp?: string;
  raw: string;
}

export function useBLEConnection(
  device: Device | null,
  isConnected: boolean,
  config: BLEConfig,
  onDataReceived?: (data: ParsedDLLine) => void,
  onLineReceived?: (line: string) => void  // ✅ NEW: for protocol handler
) {
  const [isReady, setIsReady] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  
  const lineBufferRef = useRef<string>("");
  const subscriptionRef = useRef<any>(null);
  const seenIndicesRef = useRef<Set<number>>(new Set());

  const { targetService, rxCharacteristic, txCharacteristic } = config;

  /**
   * Base64 → UTF-8 decoder (cross-platform with fallback)
   */
  const decodeBase64 = useCallback((b64: string): string => {
    try {
      return base64Decode(b64);
    } catch (e) {
      logger.warn("Failed to decode base64", e);
      return "";
    }
  }, []);

  /**
   * Parse DL line: "DL <index> <ml>"
   */
  const parseDLLine = useCallback((line: string): ParsedDLLine | null => {
    if (!line.startsWith(PROTOCOL_COMMANDS.DL)) return null;

    const indexMatch = REGEX_PATTERNS.DL_INDEX.exec(line);
    if (!indexMatch) return null;

    const index = parseInt(indexMatch[1], 10);
    if (!Number.isFinite(index)) return null;

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

    if (!Number.isFinite(ml)) return null;

    return { index, ml, raw: line };
  }, []);

  const parseDEVLine = useCallback((line: string): number | null => {
    if (!line.startsWith(PROTOCOL_COMMANDS.DEV)) return null;
    const match = REGEX_PATTERNS.DEV_BATTERY.exec(line);
    if (!match) return null;
    const level = parseInt(match[1], 10);
    return Number.isFinite(level)
      ? Math.max(VALIDATION.BATTERY_MIN, Math.min(VALIDATION.BATTERY_MAX, level))
      : null;
  }, []);

  const handleLine = useCallback((line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

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

    const battery = parseDEVLine(trimmed);
    if (battery !== null) {
      setBatteryLevel(battery);
      return;
    }
  }, [parseDLLine, parseDEVLine, onDataReceived, onLineReceived]);

  const subscribe = useCallback(async () => {
    if (!device || !isConnected) return;

    try {
      if (subscriptionRef.current) {
        try {
          // Remove subscription on all platforms to prevent memory leak
          subscriptionRef.current.remove();
        } catch (error) {
          logger.warn("Failed to remove BLE subscription", error);
        }
        subscriptionRef.current = null;
      }

      lineBufferRef.current = "";
      seenIndicesRef.current.clear();

      const subscription = device.monitorCharacteristicForService(
        targetService,
        rxCharacteristic,
        (error, characteristic) => {
          if (error) {
            logger.warn("BLE RX error", error);
            captureBLEError("subscribe", error, device.id);
            return;
          }

          if (!characteristic?.value) return;

          const chunk = decodeBase64(characteristic.value);
          if (!chunk) return;

          lineBufferRef.current += chunk;
          const lines = lineBufferRef.current.split(REGEX_PATTERNS.LINE_SEPARATORS);
          lineBufferRef.current = lines.pop() || "";

          lines.forEach(handleLine);
        }
      );

      subscriptionRef.current = subscription;
      setIsReady(true);

      trackBLEEvent("rx_subscribed", { deviceId: device.id });
      logger.ble("RX subscribed successfully");
    } catch (e) {
      logger.error("Subscribe failed", e);
      captureBLEError("subscribe", e as Error, device?.id);
      setIsReady(false);
    }
  }, [device, isConnected, targetService, rxCharacteristic, decodeBase64, handleLine]);

  const sendCommand = useCallback(async (command: string): Promise<boolean> => {
    if (!device || !isConnected) {
      logger.warn("Cannot send: not connected");
      return false;
    }

    try {
      const base64 = base64Encode(command);

      // Try with response first (more reliable)
      try {
        await device.writeCharacteristicWithResponseForService(
          targetService,
          txCharacteristic,
          base64
        );
        logger.ble(`TX (with response): ${command.trim()}`);
        return true;
      } catch (e1) {
        // Only fallback to without-response if characteristic doesn't support response
        // Check if error is about unsupported operation
        const error = e1 as Error;
        const isUnsupportedOperation =
          error?.message?.includes(BLE_ERROR_KEYWORDS.WITHOUT_RESPONSE) ||
          error?.message?.includes(BLE_ERROR_KEYWORDS.NOT_SUPPORTED) ||
          error?.message?.includes(BLE_ERROR_KEYWORDS.GATT);

        if (isUnsupportedOperation) {
          logger.warn("Response not supported, trying without response");
          await device.writeCharacteristicWithoutResponseForService(
            targetService,
            txCharacteristic,
            base64
          );
          logger.ble(`TX (without response): ${command.trim()}`);
          return true;
        } else {
          // For other errors (disconnect, timeout, etc) - throw to outer catch
          throw e1;
        }
      }
    } catch (e) {
      logger.error("Send failed", e);
      captureBLEError("send_command", e as Error, device?.id);
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
          logger.warn("Failed to remove BLE subscription", error);
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