import { useEffect, useRef, useState, useCallback } from "react";
import { Device } from "react-native-ble-plx";
import { base64Decode, base64Encode } from "../../utils/base64";
import { captureBLEError, trackBLEEvent } from "../../utils/sentry";

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
      console.warn("Failed to decode base64:", e);
      return "";
    }
  }, []);

  /**
   * Parse DL line: "DL <index> <ml>"
   */
  const parseDLLine = useCallback((line: string): ParsedDLLine | null => {
    if (!line.startsWith("DL")) return null;

    const indexMatch = /^DL\s+(\d+)/.exec(line);
    if (!indexMatch) return null;
    
    const index = parseInt(indexMatch[1], 10);
    if (!Number.isFinite(index)) return null;

    let ml = NaN;
    const afterIndex = /^DL\s+\d+\s+([0-9]+(?:\.[0-9]+)?)/.exec(line);
    if (afterIndex) {
      ml = parseFloat(afterIndex[1]);
    }
    
    if (!Number.isFinite(ml)) {
      const lastNumber = /(\d+(?:\.\d+)?)\s*(?:ml)?\s*$/i.exec(line);
      if (lastNumber) {
        ml = parseFloat(lastNumber[1]);
      }
    }

    if (!Number.isFinite(ml)) return null;

    return { index, ml, raw: line };
  }, []);

  const parseDEVLine = useCallback((line: string): number | null => {
    if (!line.startsWith("DEV")) return null;
    const match = /^DEV\s+(\d{1,3})/.exec(line);
    if (!match) return null;
    const level = parseInt(match[1], 10);
    return Number.isFinite(level) ? Math.max(0, Math.min(100, level)) : null;
  }, []);

  const handleLine = useCallback((line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    console.log("📥 BLE:", trimmed);

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
          console.warn("Failed to remove BLE subscription:", error);
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
            console.warn("BLE RX error:", error);
            captureBLEError("subscribe", error, device.id);
            return;
          }

          if (!characteristic?.value) return;

          const chunk = decodeBase64(characteristic.value);
          if (!chunk) return;

          lineBufferRef.current += chunk;
          const lines = lineBufferRef.current.split(/\r\n|\n|\r/);
          lineBufferRef.current = lines.pop() || "";

          lines.forEach(handleLine);
        }
      );

      subscriptionRef.current = subscription;
      setIsReady(true);

      trackBLEEvent("rx_subscribed", { deviceId: device.id });
      console.log("✅ BLE RX subscribed");
    } catch (e) {
      console.error("Subscribe failed:", e);
      captureBLEError("subscribe", e as Error, device?.id);
      setIsReady(false);
    }
  }, [device, isConnected, targetService, rxCharacteristic, decodeBase64, handleLine]);

  const sendCommand = useCallback(async (command: string): Promise<boolean> => {
    if (!device || !isConnected) {
      console.warn("Cannot send: not connected");
      return false;
    }

    try {
      const base64 = base64Encode(command);
      
      try {
        await device.writeCharacteristicWithResponseForService(
          targetService,
          txCharacteristic,
          base64
        );
      } catch (e1) {
        await device.writeCharacteristicWithoutResponseForService(
          targetService,
          txCharacteristic,
          base64
        );
      }
      
      console.log("📤 BLE TX:", command.trim());
      return true;
    } catch (e) {
      console.error("Send failed:", e);
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
          console.warn("Failed to remove BLE subscription:", error);
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