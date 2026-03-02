import { useEffect, useState, useRef, useCallback } from 'react';
import { BleManager, Device, Subscription } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import {
  clearLastDeviceId,
  getLastDeviceId,
  setLastDeviceId,
} from '../utils/storage';
import { BLE_DEVICE, BLE_TIMEOUTS } from '../constants/bleConstants';
import { useConnectionStore } from '../store/connectionStore';
import { logger } from '../utils/logger';

export const useBleScan = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [noTargetFound, setNoTargetFound] = useState(false);

  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [linkUp, setLinkUp] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(
    null,
  );
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const managerRef = useRef<BleManager | null>(null);
  const disconnectSubRef = useRef<Subscription | null>(null);
  const foundTargetRef = useRef(false);
  const userInitiatedDisconnectRef = useRef(false);
  const autoReconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<any>(null);
  const reconnectActiveRef = useRef(false);
  const scanTimeoutRef = useRef<any>(null);
  const autoConnectingRef = useRef(false);
  const connectToDeviceRef = useRef<any>(null);
  const bleStateRef = useRef<string>('Unknown');

  const TARGET_NAME = BLE_DEVICE.TARGET_NAME;
  const TARGET_SERVICE = BLE_DEVICE.SERVICE_UUID.toLowerCase();

  useEffect(() => {
    managerRef.current = new BleManager();

    // Monitor BLE adapter state for auto-reconnect when BLE powers on
    const stateSub = managerRef.current.onStateChange((state) => {
      logger.info(`[BLE] Adapter state: ${state}`);
      bleStateRef.current = state;

      if (state === 'PoweredOn') {
        setTimeout(() => {
          // Skip if reconnect sequence is already active
          if (reconnectActiveRef.current) return;
          const lastId = getLastDeviceId();
          if (lastId && connectToDeviceRef.current) {
            logger.info(`[BLE] BLE powered on, auto-reconnecting to ${lastId}`);
            connectToDeviceRef.current(lastId);
          }
        }, 1000);
      }
    }, true);

    // Check for already-connected devices (e.g., from OS-level auto-reconnect after bonding)
    const checkAlreadyConnected = async () => {
      if (!managerRef.current) return;
      try {
        // Wait a moment for BLE stack to initialize
        await new Promise(resolve => setTimeout(resolve, 500));

        const connected = await managerRef.current.connectedDevices([TARGET_SERVICE]);
        logger.info(`[BLE] Already connected devices: ${connected.length}`);

        if (connected.length > 0) {
          const device = connected[0];
          logger.info(`[BLE] Found already-connected device: ${device.name} (${device.id})`);

          // Discover services if not already done
          const ready = await device.discoverAllServicesAndCharacteristics();
          const svcs = await ready.services();
          const hasTarget = svcs.some(s => s.uuid.toLowerCase() === TARGET_SERVICE);

          if (hasTarget) {
            logger.info('[BLE] Already-connected device has NUS service, using it');
            setConnectedDevice(ready);
            setLinkUp(true);
            await setLastDeviceId(device.id);

            // Set up disconnect listener
            disconnectSubRef.current?.remove();
            disconnectSubRef.current = managerRef.current.onDeviceDisconnected(
              device.id,
              () => {
                setLinkUp(false);
                if (!userInitiatedDisconnectRef.current) {
                  logger.info('🔌 Unexpected disconnect from already-connected device');
                  setIsReconnecting(true);
                  reconnectActiveRef.current = true;
                  scheduleReconnect(device.id, 0);
                }
              },
            );
          }
        }
      } catch (e) {
        logger.warn('[BLE] Error checking already-connected devices:', e);
      }
    };

    checkAlreadyConnected();

    return () => {
      stateSub.remove();
      disconnectSubRef.current?.remove();
      if (reconnectTimerRef.current) {
        try { clearTimeout(reconnectTimerRef.current); } catch {}
        reconnectTimerRef.current = null;
      }
      if (scanTimeoutRef.current) {
        try { clearTimeout(scanTimeoutRef.current); } catch {}
        scanTimeoutRef.current = null;
      }
      managerRef.current?.destroy();
    };
  }, []);

  const startScan = useCallback(() => {
    if (!managerRef.current) {return;}
    reconnectActiveRef.current = false;
    autoConnectingRef.current = false;
    if (reconnectTimerRef.current) {
      try { clearTimeout(reconnectTimerRef.current); } catch {}
      reconnectTimerRef.current = null;
    }
    if (scanTimeoutRef.current) {
      try { clearTimeout(scanTimeoutRef.current); } catch {}
      scanTimeoutRef.current = null;
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
        const nameMatches = (device.name ?? '').trim() === TARGET_NAME;
        const svcMatches = (device.serviceUUIDs || [])
          .map((u) => u.toLowerCase())
          .includes(TARGET_SERVICE);
        if (nameMatches || svcMatches) {
          foundTargetRef.current = true;
          setDevices((prev) =>
            prev.some((d) => d.id === device.id) ? prev : [...prev, device],
          );

          // Auto-connect to first matching target device
          if (!autoConnectingRef.current && connectToDeviceRef.current) {
            autoConnectingRef.current = true;
            logger.info(`[BLE] Target found, auto-connecting: ${device.name} (${device.id})`);
            managerRef.current?.stopDeviceScan();
            if (scanTimeoutRef.current) {
              clearTimeout(scanTimeoutRef.current);
              scanTimeoutRef.current = null;
            }
            setIsScanning(false);
            connectToDeviceRef.current(device.id);
          }
        }
      }
    });

    scanTimeoutRef.current = setTimeout(() => {
      managerRef.current?.stopDeviceScan();
      setIsScanning(false);
      setNoTargetFound(!foundTargetRef.current);
    }, BLE_TIMEOUTS.SCAN_DURATION);
  }, []);

  const stopScan = useCallback(() => {
    managerRef.current?.stopDeviceScan();
    setIsScanning(false);
    setNoTargetFound(false);
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(async () => {
    disconnectSubRef.current?.remove();
    disconnectSubRef.current = null;

    if (connectedDevice) {
      try {
        userInitiatedDisconnectRef.current = true;
        await connectedDevice.cancelConnection();
      } catch (e) {
        logger.warn('Failed to disconnect:', e);
      }
    }
    setConnectedDevice(null);
    setLinkUp(false);

    await clearLastDeviceId();
    autoReconnectAttemptsRef.current = 0;
    userInitiatedDisconnectRef.current = false;
    setIsReconnecting(false);
    // Stop any ongoing reconnect timers
    reconnectActiveRef.current = false;
    if (reconnectTimerRef.current) {
      try { clearTimeout(reconnectTimerRef.current); } catch {}
      reconnectTimerRef.current = null;
    }
  }, [connectedDevice]);

  /**
   * Schedule reconnect attempt with exponential backoff
   */
  const scheduleReconnect = useCallback((deviceId: string, attemptNumber: number) => {
    // Double-check reconnect is still active
    if (!reconnectActiveRef.current) {
      logger.debug('🔄 Reconnect cancelled - not active');
      return;
    }

    if (attemptNumber >= BLE_TIMEOUTS.MAX_RECONNECT_ATTEMPTS) {
      logger.warn(`⚠️ Max reconnect attempts (${BLE_TIMEOUTS.MAX_RECONNECT_ATTEMPTS}) reached`);
      setIsReconnecting(false);
      reconnectActiveRef.current = false;
      return;
    }

    const delay = Math.min(
      BLE_TIMEOUTS.RECONNECT_MAX_DELAY,
      BLE_TIMEOUTS.RECONNECT_INITIAL_DELAY * Math.pow(2, attemptNumber),
    );

    logger.debug(`🔄 Scheduling reconnect attempt ${attemptNumber + 1} in ${delay}ms`);

    // Clear any existing timer before creating a new one
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    reconnectTimerRef.current = setTimeout(async () => {
      // Check again before attempting to connect
      if (!reconnectActiveRef.current) {
        logger.debug('🔄 Reconnect cancelled - not active anymore');
        return;
      }

      logger.debug(`🔄 Reconnect attempt ${attemptNumber + 1}/${BLE_TIMEOUTS.MAX_RECONNECT_ATTEMPTS}`);
      const device = await connectToDevice(deviceId);

      // Only schedule next attempt if still active and connection failed
      if (!device && reconnectActiveRef.current) {
        autoReconnectAttemptsRef.current = attemptNumber + 1;
        scheduleReconnect(deviceId, attemptNumber + 1);
      } else if (device) {
        // Connection successful - clear reconnect state
        logger.info('✅ Reconnect successful');
        reconnectActiveRef.current = false;
        setIsReconnecting(false);
        autoReconnectAttemptsRef.current = 0;
      }
    }, delay);
  }, []);

  const connectToDevice = useCallback(
    async (deviceId: string) => {
      if (!managerRef.current) {return null;}

      // Skip if already connected to this device
      try {
        const isAlreadyConnected = await managerRef.current.isDeviceConnected(deviceId);
        if (isAlreadyConnected) {
          logger.debug(`[BLE] Already connected to ${deviceId}, skipping`);
          return null;
        }
      } catch {}

      setConnectError(null);
      setIsConnecting(true);
      setConnectingDeviceId(deviceId);

      try {
        stopScan();

        // Work around Android BLE PLX native crash when native timeout fires
        // by handling timeout on JS side and cancelling connection ourselves.
        const mgr = managerRef.current;
        let finished = false;
        // iOS: pass undefined for default behavior
        // Android: use autoConnect: true for more reliable background reconnection
        const connectPromise = mgr.connectToDevice(
          deviceId,
          Platform.OS === 'android' ? { autoConnect: true } : undefined,
        );
        const timeoutMs = BLE_TIMEOUTS.CONNECTION_TIMEOUT;
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
                reject(new Error('Connection timeout'));
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
          (s) => s.uuid.toLowerCase() === TARGET_SERVICE,
        );
        if (!hasTarget) {
          setConnectError(
            `Required service ${TARGET_SERVICE} not found on device`,
          );
          try { await ready.cancelConnection(); } catch {}
          return null;
        }

        setConnectedDevice(ready);
        setLinkUp(true);
        setIsReconnecting(false);
        autoReconnectAttemptsRef.current = 0; // reset on success
        reconnectActiveRef.current = false;
        if (reconnectTimerRef.current) {
          try { clearTimeout(reconnectTimerRef.current); } catch {}
          reconnectTimerRef.current = null;
        }
        // Persist last connected device id for auto-reconnect
        await setLastDeviceId(deviceId);

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
              logger.info('🔌 Unexpected disconnect, starting reconnect sequence');
              autoReconnectAttemptsRef.current = 0;
              setIsReconnecting(true);
              reconnectActiveRef.current = true;
              scheduleReconnect(deviceId, 0);
            } else {
              // User-initiated disconnect - reset all reconnect state
              logger.debug('🔌 User-initiated disconnect');
              autoReconnectAttemptsRef.current = 0;
              setIsReconnecting(false);
              reconnectActiveRef.current = false;
              if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
              }
            }
          },
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
    [stopScan, scheduleReconnect],
  );

  // Keep ref updated for use in closures (scan callback, BLE state handler)
  connectToDeviceRef.current = connectToDevice;

  // Оновлення глобального стору підключень
  useEffect(() => {
    useConnectionStore.getState().updateBle(linkUp, isReconnecting);
  }, [linkUp, isReconnecting]);

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
