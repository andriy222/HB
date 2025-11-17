/**
 * Adaptive BLE Scan Hook
 *
 * Покращена версія useScanDevices з адаптивним сканування та реактивним реконектом
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { BleManager, Device, Subscription } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import {
  clearLastDeviceId,
  getLastDeviceId,
  setLastDeviceId,
} from '../utils/storage';
import { BLE_DEVICE } from '../constants/bleConstants';
import { useAdaptiveConnectionManager } from './useAdaptiveConnectionManager';
import { ConnectionQuality } from '../config/adaptiveConnectionConfig';

export interface AdaptiveBleDevice extends Device {
  rssi: number;
  quality: ConnectionQuality;
  lastSeen: number;
}

export interface AdaptiveBleScanResult {
  // Пристрої
  devices: AdaptiveBleDevice[];
  connectedDevice: AdaptiveBleDevice | null;

  // Статуси
  isScanning: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  linkUp: boolean;

  // Якість підключення
  connectionQuality: ConnectionQuality;
  rssi: number | null;

  // Помилки
  connectError: string | null;
  noTargetFound: boolean;

  // Дії
  startScan: () => void;
  stopScan: () => void;
  connectToDevice: (deviceId: string) => Promise<Device | null>;
  disconnect: () => Promise<void>;

  // Реконект інфо
  reconnectAttempt: number;
  reconnectDelay: number | null;
  maxReconnectAttempts: number;

  // Адаптивні параметри
  currentScanDuration: number;
}

export function useAdaptiveBleScan(): AdaptiveBleScanResult {
  const [devices, setDevices] = useState<AdaptiveBleDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [noTargetFound, setNoTargetFound] = useState(false);

  const [connectedDevice, setConnectedDevice] = useState<AdaptiveBleDevice | null>(null);
  const [linkUp, setLinkUp] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const managerRef = useRef<BleManager | null>(null);
  const disconnectSubRef = useRef<Subscription | null>(null);
  const foundTargetRef = useRef(false);
  const userInitiatedDisconnectRef = useRef(false);
  const reconnectTimerRef = useRef<any>(null);
  const reconnectActiveRef = useRef(false);
  const scanStartTimeRef = useRef<number>(0);

  // Адаптивний менеджер підключень
  const connectionManager = useAdaptiveConnectionManager();
  const { currentProfile, trackBleScanStart, trackBleScanComplete, trackBleScanFailed,
    trackBleConnected, trackBleDisconnected, scheduleReconnect: scheduleReconnectTracking } = connectionManager;

  const TARGET_NAME = BLE_DEVICE.TARGET_NAME;
  const TARGET_SERVICE = BLE_DEVICE.SERVICE_UUID;

  // Ініціалізація BLE Manager
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

  /**
   * Читання RSSI пристрою
   */
  const readRssi = useCallback(async (device: Device): Promise<number> => {
    try {
      const rssi = await device.readRSSI();
      return rssi;
    } catch (error) {
      console.warn('Failed to read RSSI:', error);
      return -100; // дефолтне слабке значення
    }
  }, []);

  /**
   * Визначення якості на основі RSSI
   */
  const getRssiQuality = useCallback((rssi: number): ConnectionQuality => {
    if (rssi >= -60) return 'excellent';
    if (rssi >= -70) return 'good';
    if (rssi >= -80) return 'fair';
    if (rssi >= -90) return 'poor';
    return 'critical';
  }, []);

  /**
   * Адаптивне сканування BLE пристроїв
   */
  const startScan = useCallback(() => {
    if (!managerRef.current) return;

    // Зупиняємо реконект якщо він активний
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

    // Отримуємо адаптивну тривалість сканування
    const scanDuration = trackBleScanStart();
    scanStartTimeRef.current = Date.now();

    console.log(`🔍 Starting adaptive BLE scan for ${scanDuration}ms`);

    managerRef.current.startDeviceScan(null, null, async (error, device) => {
      if (error) {
        console.error('BLE scan error:', error);
        setIsScanning(false);
        trackBleScanFailed(error.message);
        return;
      }

      if (device) {
        // Перевірка чи це наш пристрій
        const nameMatches = (device.name ?? '').trim() === TARGET_NAME;
        const svcMatches = (device.serviceUUIDs || [])
          .map((u) => u.toLowerCase())
          .includes(TARGET_SERVICE);

        if (nameMatches || svcMatches) {
          foundTargetRef.current = true;

          // Читаємо RSSI якщо можливо
          const rssi = device.rssi ?? -100;
          const quality = getRssiQuality(rssi);

          const adaptiveDevice: AdaptiveBleDevice = {
            ...device,
            rssi,
            quality,
            lastSeen: Date.now(),
          };

          setDevices((prev) => {
            const exists = prev.some((d) => d.id === device.id);
            if (exists) {
              // Оновлюємо існуючий
              return prev.map((d) =>
                d.id === device.id ? adaptiveDevice : d
              );
            }
            // Додаємо новий
            return [...prev, adaptiveDevice];
          });

          console.log(
            `📱 Found target device: ${device.name || device.id} (RSSI: ${rssi} dBm, Quality: ${quality})`
          );
        }
      }
    });

    // Автоматично зупиняємо сканування через адаптивну тривалість
    setTimeout(() => {
      managerRef.current?.stopDeviceScan();
      setIsScanning(false);
      setNoTargetFound(!foundTargetRef.current);

      const scanTime = Date.now() - scanStartTimeRef.current;
      const devicesFound = devices.length;

      trackBleScanComplete(devicesFound, scanTime);

      console.log(
        `✅ BLE scan completed: ${devicesFound} devices found in ${scanTime}ms`
      );
    }, scanDuration);
  }, [trackBleScanStart, trackBleScanComplete, trackBleScanFailed, getRssiQuality, devices.length]);

  /**
   * Зупинка сканування
   */
  const stopScan = useCallback(() => {
    managerRef.current?.stopDeviceScan();
    setIsScanning(false);
    setNoTargetFound(false);

    if (scanStartTimeRef.current > 0) {
      const scanTime = Date.now() - scanStartTimeRef.current;
      trackBleScanComplete(devices.length, scanTime);
      scanStartTimeRef.current = 0;
    }
  }, [devices.length, trackBleScanComplete]);

  /**
   * Відключення від пристрою
   */
  const disconnect = useCallback(async () => {
    disconnectSubRef.current?.remove();
    disconnectSubRef.current = null;

    if (connectedDevice) {
      try {
        userInitiatedDisconnectRef.current = true;
        await connectedDevice.cancelConnection();
        trackBleDisconnected('User initiated disconnect');
      } catch (e) {
        console.warn('Failed to disconnect:', e);
      }
    }

    setConnectedDevice(null);
    setLinkUp(false);
    await clearLastDeviceId();
    userInitiatedDisconnectRef.current = false;
    setIsReconnecting(false);

    // Зупиняємо реконект
    reconnectActiveRef.current = false;
    if (reconnectTimerRef.current) {
      try {
        clearTimeout(reconnectTimerRef.current);
      } catch {}
      reconnectTimerRef.current = null;
    }
  }, [connectedDevice, trackBleDisconnected]);

  /**
   * Планування спроби реконекту з адаптивною затримкою
   */
  const scheduleReconnect = useCallback(
    (deviceId: string, attemptNumber: number) => {
      if (!reconnectActiveRef.current) return;

      const maxAttempts = currentProfile.ble.reconnectMaxAttempts;

      if (attemptNumber >= maxAttempts) {
        console.log(`⚠️ Max reconnect attempts (${maxAttempts}) reached`);
        setIsReconnecting(false);
        return;
      }

      // Отримуємо адаптивну затримку з jitter
      const delay = scheduleReconnectTracking();

      console.log(
        `🔄 Scheduling reconnect attempt ${attemptNumber + 1}/${maxAttempts} in ${delay}ms`
      );

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      reconnectTimerRef.current = setTimeout(async () => {
        if (!reconnectActiveRef.current) return;

        console.log(`🔄 Reconnect attempt ${attemptNumber + 1}/${maxAttempts}`);
        const device = await connectToDevice(deviceId);

        if (!device && reconnectActiveRef.current) {
          // Retry з наступною спробою
          scheduleReconnect(deviceId, attemptNumber + 1);
        }
      }, delay);
    },
    [currentProfile.ble.reconnectMaxAttempts, scheduleReconnectTracking]
  );

  /**
   * Підключення до пристрою
   */
  const connectToDevice = useCallback(
    async (deviceId: string) => {
      if (!managerRef.current) return null;

      setConnectError(null);
      setIsConnecting(true);
      setConnectingDeviceId(deviceId);

      try {
        stopScan();

        const mgr = managerRef.current;
        let finished = false;

        // Використовуємо адаптивний таймаут підключення
        const timeoutMs = currentProfile.ble.connectionTimeout;

        const connectPromise = mgr.connectToDevice(
          deviceId,
          Platform.OS === 'android' ? { autoConnect: true } : undefined
        );

        const withTimeout = Promise.race([
          connectPromise.then((d) => {
            finished = true;
            return d;
          }),
          new Promise<Device>((_, reject) => {
            const t = setTimeout(async () => {
              if (!finished) {
                try {
                  await mgr.cancelDeviceConnection(deviceId);
                } catch {}
                reject(new Error(`Connection timeout (${timeoutMs}ms)`));
              }
            }, timeoutMs);
            connectPromise.finally(() => clearTimeout(t));
          }),
        ]);

        const device = await withTimeout;
        const ready = await device.discoverAllServicesAndCharacteristics();

        // Верифікація сервісів
        const svcs = await ready.services();
        const hasTarget = svcs.some(
          (s) => s.uuid.toLowerCase() === TARGET_SERVICE
        );

        if (!hasTarget) {
          const error = `Required service ${TARGET_SERVICE} not found`;
          setConnectError(error);
          try {
            await ready.cancelConnection();
          } catch {}
          trackBleScanFailed(error);
          return null;
        }

        // Читаємо RSSI
        const rssi = await readRssi(ready);
        const quality = getRssiQuality(rssi);

        const adaptiveDevice: AdaptiveBleDevice = {
          ...ready,
          rssi,
          quality,
          lastSeen: Date.now(),
        };

        setConnectedDevice(adaptiveDevice);
        setLinkUp(true);
        setIsReconnecting(false);

        // Трекаємо успішне підключення
        trackBleConnected(deviceId, ready.name || null, rssi);

        // Зупиняємо реконект
        reconnectActiveRef.current = false;
        if (reconnectTimerRef.current) {
          try {
            clearTimeout(reconnectTimerRef.current);
          } catch {}
          reconnectTimerRef.current = null;
        }

        // Зберігаємо для auto-reconnect
        await setLastDeviceId(deviceId);

        console.log(
          `✅ Connected to ${ready.name || deviceId} (RSSI: ${rssi} dBm, Quality: ${quality})`
        );

        // Підписка на відключення
        disconnectSubRef.current?.remove();
        disconnectSubRef.current = mgr.onDeviceDisconnected(deviceId, () => {
          setLinkUp(false);
          setIsConnecting(false);
          setConnectingDeviceId(null);

          // Auto-reconnect на несподівані відключення
          if (!userInitiatedDisconnectRef.current) {
            console.log('🔌 Unexpected disconnect, starting reconnect sequence');
            trackBleDisconnected('Unexpected disconnect');

            setIsReconnecting(true);
            reconnectActiveRef.current = true;
            scheduleReconnect(deviceId, 0);
          } else {
            console.log('🔌 User-initiated disconnect');
            trackBleDisconnected('User initiated');

            setIsReconnecting(false);
            reconnectActiveRef.current = false;
            if (reconnectTimerRef.current) {
              clearTimeout(reconnectTimerRef.current);
              reconnectTimerRef.current = null;
            }
          }
        });

        return ready;
      } catch (e: any) {
        const errorMsg = e?.message ?? String(e);
        setConnectError(errorMsg);
        trackBleScanFailed(errorMsg);
        console.error('Connection error:', errorMsg);
        return null;
      } finally {
        setIsConnecting(false);
        setConnectingDeviceId(null);
      }
    },
    [
      stopScan,
      currentProfile.ble.connectionTimeout,
      readRssi,
      getRssiQuality,
      trackBleConnected,
      trackBleDisconnected,
      trackBleScanFailed,
      scheduleReconnect,
    ]
  );

  // Auto-reconnect до останнього пристрою при запуску
  useEffect(() => {
    const tryReconnect = () => {
      const lastId = getLastDeviceId();
      if (!lastId) return;
      console.log(`🔄 Auto-reconnecting to last device: ${lastId}`);
      connectToDevice(lastId);
    };

    const t = setTimeout(tryReconnect, 100);
    return () => {
      clearTimeout(t);
    };
  }, [connectToDevice]);

  // Періодичне оновлення RSSI для підключеного пристрою
  useEffect(() => {
    if (!linkUp || !connectedDevice) return;

    const updateRssi = async () => {
      try {
        const rssi = await readRssi(connectedDevice);
        const quality = getRssiQuality(rssi);

        setConnectedDevice((prev) =>
          prev
            ? {
                ...prev,
                rssi,
                quality,
                lastSeen: Date.now(),
              }
            : null
        );

        // Оновлюємо в менеджері
        trackBleConnected(connectedDevice.id, connectedDevice.name || null, rssi);
      } catch (error) {
        console.warn('Failed to update RSSI:', error);
      }
    };

    // Оновлюємо RSSI кожні 10 секунд
    const interval = setInterval(updateRssi, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [linkUp, connectedDevice, readRssi, getRssiQuality, trackBleConnected]);

  return {
    // Пристрої
    devices,
    connectedDevice,

    // Статуси
    isScanning,
    isConnecting,
    isReconnecting,
    linkUp,

    // Якість
    connectionQuality: connectedDevice?.quality || 'good',
    rssi: connectedDevice?.rssi || null,

    // Помилки
    connectError,
    noTargetFound,

    // Дії
    startScan,
    stopScan,
    connectToDevice,
    disconnect,

    // Реконект інфо
    reconnectAttempt: connectionManager.status.ble.reconnectAttempt,
    reconnectDelay: connectionManager.status.ble.nextReconnectDelay,
    maxReconnectAttempts: currentProfile.ble.reconnectMaxAttempts,

    // Адаптивні параметри
    currentScanDuration: connectionManager.getAdaptiveScanDuration(),
  };
}
