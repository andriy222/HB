import { useEffect, useState, useRef, useCallback } from "react";
import { BleManager, Device, Subscription } from "react-native-ble-plx";
import { Platform } from "react-native";
import {
  clearLastDeviceId,
  getLastDeviceId,
  setLastDeviceId,
} from "../utils/storage";

export const useBleScan = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [noTargetFound, setNoTargetFound] = useState(false);

  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [linkUp, setLinkUp] = useState(false); // true when BLE link is established
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(
    null
  );
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Permission handling lives in UI (Connection.tsx)
  const managerRef = useRef<BleManager | null>(null);
  const disconnectSubRef = useRef<Subscription | null>(null);
  const foundTargetRef = useRef(false);
  const userInitiatedDisconnectRef = useRef(false);
  const autoReconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<any>(null);
  const reconnectActiveRef = useRef(false);

  // Target device/service identifiers
  const TARGET_NAME = "Hybit NeuraFlow";
  const TARGET_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"; // Nordic UART Service

  useEffect(() => {
    managerRef.current = new BleManager();
    return () => {
      disconnectSubRef.current?.remove();
      if (reconnectTimerRef.current) {
        try {
          clearTimeout(reconnectTimerRef.current);
        } catch {}
        reconnectTimerRef.current = null;
      }
      managerRef.current?.destroy();
    };
  }, []);

  const startScan = useCallback(() => {
    if (!managerRef.current) return;
    // Stop any auto-reconnect loop when user starts an active scan
    reconnectActiveRef.current = false;
    if (reconnectTimerRef.current) {
      try {
        clearTimeout(reconnectTimerRef.current);
      } catch {}
      reconnectTimerRef.current = null;
    }
    setDevices([]);
    setIsScanning(true);
    setNoTargetFound(false);
    foundTargetRef.current = false;

    managerRef.current.startDeviceScan(null, null, (error, device) => {
      if (error) {
        setIsScanning(false);
        return;
      }
      if (device) {
        const nameMatches = (device.name ?? "").trim() === TARGET_NAME;
        const svcMatches = (device.serviceUUIDs || [])
          .map((u) => u.toLowerCase())
          .includes(TARGET_SERVICE);
        if (nameMatches || svcMatches) {
          foundTargetRef.current = true;
          setDevices((prev) =>
            prev.some((d) => d.id === device.id) ? prev : [...prev, device]
          );
        }
      }
    });

    setTimeout(() => {
      managerRef.current?.stopDeviceScan();
      setIsScanning(false);
      setNoTargetFound(!foundTargetRef.current);
    }, 10000);
  }, []);

  const stopScan = useCallback(() => {
    managerRef.current?.stopDeviceScan();
    setIsScanning(false);
    setNoTargetFound(false);
  }, []);

  const disconnect = useCallback(async () => {
    disconnectSubRef.current?.remove();
    disconnectSubRef.current = null;

    if (connectedDevice) {
      try {
        userInitiatedDisconnectRef.current = true;
        await connectedDevice.cancelConnection();
      } catch (e) {
        console.warn("Failed to disconnect:", e);
      }
    }
    setConnectedDevice(null);
    setLinkUp(false);
    // User initiated disconnect – don't auto-reconnect next launch
    clearLastDeviceId();
    autoReconnectAttemptsRef.current = 0;
    userInitiatedDisconnectRef.current = false;
    setIsReconnecting(false);
    // Stop any ongoing reconnect timers
    reconnectActiveRef.current = false;
    if (reconnectTimerRef.current) {
      try {
        clearTimeout(reconnectTimerRef.current);
      } catch {}
      reconnectTimerRef.current = null;
    }
  }, [connectedDevice]);

  const connectToDevice = useCallback(
    async (deviceId: string) => {
      if (!managerRef.current) return null;

      setConnectError(null);
      setIsConnecting(true);
      setConnectingDeviceId(deviceId);

      try {
        stopScan();

        // Work around Android BLE PLX native crash when native timeout fires
        // by handling timeout on JS side and cancelling connection ourselves.
        const mgr = managerRef.current;
        let finished = false;
        const connectPromise = mgr.connectToDevice(
          deviceId,
          Platform.OS === "android" ? { autoConnect: true } : undefined
        );
        const timeoutMs = 10000;
        const withTimeout = Promise.race([
          connectPromise.then((d) => {
            finished = true;
            return d;
          }),
          new Promise((_, reject) => {
            const t = setTimeout(async () => {
              if (!finished) {
                try {
                  await mgr.cancelDeviceConnection(deviceId);
                } catch {}
                reject(new Error("Connection timeout"));
              }
            }, timeoutMs);
            // If connectPromise resolves/rejects first, clear the timer
            connectPromise.finally(() => clearTimeout(t));
          }),
        ]) as Promise<Device>;

        const device = await withTimeout;
        const ready = await device.discoverAllServicesAndCharacteristics();

        // Verify the required service exists
        const svcs = await ready.services();
        const hasTarget = svcs.some(
          (s) => s.uuid.toLowerCase() === TARGET_SERVICE
        );
        if (!hasTarget) {
          setConnectError(
            `Required service ${TARGET_SERVICE} not found on device`
          );
          try {
            await ready.cancelConnection();
          } catch {}
          return null;
        }

        setConnectedDevice(ready);
        setLinkUp(true);
        setIsReconnecting(false);
        autoReconnectAttemptsRef.current = 0; // reset on success
        reconnectActiveRef.current = false;
        if (reconnectTimerRef.current) {
          try {
            clearTimeout(reconnectTimerRef.current);
          } catch {}
          reconnectTimerRef.current = null;
        }
        // Persist last connected device id for auto-reconnect
        setLastDeviceId(deviceId).catch(() => {});

        disconnectSubRef.current?.remove();
        disconnectSubRef.current = managerRef.current.onDeviceDisconnected(
          deviceId,
          () => {
            // Keep the device reference so UI can persist, but mark link as down
            setLinkUp(false);
            setIsConnecting(false);
            setConnectingDeviceId(null);

            // Auto-reconnect on unexpected drops (e.g., <420 logs/no SYNC)
            if (!userInitiatedDisconnectRef.current) {
              const tries = autoReconnectAttemptsRef.current;
              if (tries < 3) {
                autoReconnectAttemptsRef.current = tries + 1;
                setIsReconnecting(true);
                reconnectActiveRef.current = true;
                const delay = Math.min(30000, 1000 * Math.pow(2, tries));
                if (reconnectTimerRef.current) {
                  try {
                    clearTimeout(reconnectTimerRef.current);
                  } catch {}
                }
                reconnectTimerRef.current = setTimeout(() => {
                  if (!reconnectActiveRef.current) return;
                  connectToDevice(deviceId).then((d) => {
                    if (!d && reconnectActiveRef.current) {
                      // schedule another try
                      const next = autoReconnectAttemptsRef.current;
                      const nextDelay = Math.min(
                        30000,
                        1000 * Math.pow(2, next)
                      );
                      if (reconnectTimerRef.current) {
                        try {
                          clearTimeout(reconnectTimerRef.current);
                        } catch {}
                      }
                      reconnectTimerRef.current = setTimeout(() => {
                        if (reconnectActiveRef.current)
                          connectToDevice(deviceId);
                      }, nextDelay);
                    }
                  });
                }, delay);
              } else {
                // give up after a few attempts; keep last device id for later
                setIsReconnecting(false);
              }
            } else {
              autoReconnectAttemptsRef.current = 0;
              setIsReconnecting(false);
              reconnectActiveRef.current = false;
              if (reconnectTimerRef.current) {
                try {
                  clearTimeout(reconnectTimerRef.current);
                } catch {}
                reconnectTimerRef.current = null;
              }
            }
          }
        );

        return ready;
      } catch (e: any) {
        setConnectError(e?.message ?? String(e));

        return null;
      } finally {
        setIsConnecting(false);
        setConnectingDeviceId(null);
      }
    },
    [stopScan]
  );

  // Auto-reconnect to last device if available
  useEffect(() => {
    let cancelled = false;
    const tryReconnect = async () => {
      const lastId = await getLastDeviceId();
      if (!lastId || cancelled) return;
      await connectToDevice(lastId);
    };
    const t = setTimeout(tryReconnect, 100);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [connectToDevice]);

  return {
    devices,
    isScanning,
    connectedDevice,
    linkUp,
    isConnecting,
    connectingDeviceId,
    connectError,
    isReconnecting,
    startScan,
    stopScan,
    connectToDevice,
    disconnect,
    noTargetFound,
  };
};
