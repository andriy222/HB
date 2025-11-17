/**
 * Adaptive Connection Manager Hook
 *
 * Централізований менеджер для реактивного управління всіма підключеннями
 * (Internet, Bluetooth, Coaster)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import {
  AdaptiveConnectionState,
  ConnectionProfile,
  ConnectionQuality,
  NetworkType,
  INITIAL_ADAPTIVE_STATE,
  CONNECTION_PROFILES,
  ProfileName,
  selectOptimalProfile,
  getRssiQuality,
  calculateReconnectDelay,
  calculateAdaptiveScanDuration,
} from '../config/adaptiveConnectionConfig';

/**
 * Події менеджера підключень для підписки
 */
export type ConnectionEvent =
  | { type: 'ble_scan_started'; scanDuration: number }
  | { type: 'ble_scan_completed'; devicesFound: number; duration: number }
  | { type: 'ble_scan_failed'; reason: string }
  | { type: 'ble_connected'; deviceId: string; rssi: number }
  | { type: 'ble_disconnected'; reason: string }
  | { type: 'ble_reconnect_scheduled'; attempt: number; delay: number }
  | { type: 'internet_online'; networkType: NetworkType; quality: ConnectionQuality }
  | { type: 'internet_offline'; downtime: number }
  | { type: 'coaster_command_success'; latency: number }
  | { type: 'coaster_command_failed'; error: string }
  | { type: 'profile_switched'; from: string; to: string; reason: string };

export type ConnectionEventListener = (event: ConnectionEvent) => void;

/**
 * Розширений статус підключення
 */
export interface EnhancedConnectionStatus {
  ble: {
    isScanning: boolean;
    isConnected: boolean;
    isReconnecting: boolean;
    quality: ConnectionQuality;
    rssi: number | null;
    deviceName: string | null;
    nextReconnectDelay: number | null;
    reconnectAttempt: number;
  };
  internet: {
    isOnline: boolean;
    quality: ConnectionQuality;
    networkType: NetworkType;
    lastCheckTime: number;
    totalDowntime: number;
  };
  coaster: {
    isConnected: boolean;
    commandSuccessRate: number;
    averageLatency: number | null;
    lastError: string | null;
  };
  profile: {
    current: string;
    auto: boolean;
    canSwitch: boolean;
  };
}

/**
 * Хук для адаптивного управління підключеннями
 */
export function useAdaptiveConnectionManager() {
  const [state, setState] = useState<AdaptiveConnectionState>(INITIAL_ADAPTIVE_STATE);
  const [status, setStatus] = useState<EnhancedConnectionStatus>({
    ble: {
      isScanning: false,
      isConnected: false,
      isReconnecting: false,
      quality: 'good',
      rssi: null,
      deviceName: null,
      nextReconnectDelay: null,
      reconnectAttempt: 0,
    },
    internet: {
      isOnline: false,
      quality: 'good',
      networkType: 'unknown',
      lastCheckTime: 0,
      totalDowntime: 0,
    },
    coaster: {
      isConnected: false,
      commandSuccessRate: 1,
      averageLatency: null,
      lastError: null,
    },
    profile: {
      current: 'standard',
      auto: true,
      canSwitch: true,
    },
  });

  const listenersRef = useRef<Set<ConnectionEventListener>>(new Set());
  const internetDowntimeStartRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);

  /**
   * Підписка на події
   */
  const addEventListener = useCallback((listener: ConnectionEventListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  /**
   * Надіслати подію всім слухачам
   */
  const emitEvent = useCallback((event: ConnectionEvent) => {
    listenersRef.current.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in connection event listener:', error);
      }
    });
  }, []);

  /**
   * Моніторинг інтернет-підключення
   */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState: NetInfoState) => {
      const isOnline = netState.isConnected ?? false;
      const networkType = getNetworkType(netState);
      const quality = getNetworkQuality(netState);

      // Трек downtime
      if (!isOnline && internetDowntimeStartRef.current === null) {
        internetDowntimeStartRef.current = Date.now();
      }

      let downtime = 0;
      if (isOnline && internetDowntimeStartRef.current !== null) {
        downtime = Date.now() - internetDowntimeStartRef.current;
        internetDowntimeStartRef.current = null;

        emitEvent({
          type: 'internet_online',
          networkType,
          quality,
        });
      } else if (!isOnline) {
        downtime = internetDowntimeStartRef.current
          ? Date.now() - internetDowntimeStartRef.current
          : 0;

        emitEvent({
          type: 'internet_offline',
          downtime,
        });
      }

      // Оновлюємо стан
      setState((prev) => ({
        ...prev,
        stats: {
          ...prev.stats,
          internet: {
            isOnline,
            networkType,
            lastCheckTime: Date.now(),
            connectionQuality: quality,
            downtime: prev.stats.internet.downtime + downtime,
          },
        },
      }));

      setStatus((prev) => ({
        ...prev,
        internet: {
          isOnline,
          quality,
          networkType,
          lastCheckTime: Date.now(),
          totalDowntime: prev.internet.totalDowntime + downtime,
        },
      }));
    });

    // Initial check
    NetInfo.fetch().then((netState) => {
      const isOnline = netState.isConnected ?? false;
      const networkType = getNetworkType(netState);
      const quality = getNetworkQuality(netState);

      setState((prev) => ({
        ...prev,
        stats: {
          ...prev.stats,
          internet: {
            isOnline,
            networkType,
            lastCheckTime: Date.now(),
            connectionQuality: quality,
            downtime: 0,
          },
        },
      }));

      setStatus((prev) => ({
        ...prev,
        internet: {
          isOnline,
          quality,
          networkType,
          lastCheckTime: Date.now(),
          totalDowntime: 0,
        },
      }));
    });

    return () => {
      unsubscribe();
    };
  }, [emitEvent]);

  /**
   * Автоматичне переключення профілю на основі статистики
   */
  useEffect(() => {
    if (!state.adaptive.autoProfileSwitch) return;

    // Не переключаємо занадто часто (мін 30 сек між переключеннями)
    const timeSinceLastSwitch = Date.now() - state.adaptive.lastProfileSwitch;
    if (timeSinceLastSwitch < 30000) return;

    const optimalProfile = selectOptimalProfile(state);

    if (optimalProfile.name !== state.currentProfile.name) {
      const reason = `Auto-switch based on stats: BLE quality=${state.stats.ble.lastConnectionQuality}, drops=${state.stats.ble.connectionDrops}`;

      console.log(`🔄 Profile switch: ${state.currentProfile.name} → ${optimalProfile.name}`);
      console.log(`   Reason: ${reason}`);

      emitEvent({
        type: 'profile_switched',
        from: state.currentProfile.name,
        to: optimalProfile.name,
        reason,
      });

      setState((prev) => ({
        ...prev,
        currentProfile: optimalProfile,
        adaptive: {
          ...prev.adaptive,
          lastProfileSwitch: Date.now(),
        },
      }));

      setStatus((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          current: optimalProfile.name,
        },
      }));
    }
  }, [state, emitEvent]);

  /**
   * Відслідковування BLE сканування
   */
  const trackBleScanStart = useCallback(() => {
    const scanDuration = calculateAdaptiveScanDuration(state);

    emitEvent({
      type: 'ble_scan_started',
      scanDuration,
    });

    setStatus((prev) => ({
      ...prev,
      ble: { ...prev.ble, isScanning: true },
    }));

    return scanDuration;
  }, [state, emitEvent]);

  const trackBleScanComplete = useCallback(
    (devicesFound: number, duration: number) => {
      emitEvent({
        type: 'ble_scan_completed',
        devicesFound,
        duration,
      });

      setState((prev) => {
        const newSuccessful = prev.stats.ble.successfulScans + (devicesFound > 0 ? 1 : 0);
        const newFailed = prev.stats.ble.failedScans + (devicesFound === 0 ? 1 : 0);
        const totalScans = newSuccessful + newFailed;

        // Оновлюємо середній час сканування
        const avgTime =
          (prev.stats.ble.averageScanTime * (totalScans - 1) + duration) / totalScans;

        return {
          ...prev,
          stats: {
            ...prev.stats,
            ble: {
              ...prev.stats.ble,
              successfulScans: newSuccessful,
              failedScans: newFailed,
              averageScanTime: avgTime,
            },
          },
        };
      });

      setStatus((prev) => ({
        ...prev,
        ble: { ...prev.ble, isScanning: false },
      }));
    },
    [emitEvent]
  );

  const trackBleScanFailed = useCallback(
    (reason: string) => {
      emitEvent({
        type: 'ble_scan_failed',
        reason,
      });

      setState((prev) => ({
        ...prev,
        stats: {
          ...prev.stats,
          ble: {
            ...prev.stats.ble,
            failedScans: prev.stats.ble.failedScans + 1,
          },
        },
      }));

      setStatus((prev) => ({
        ...prev,
        ble: { ...prev.ble, isScanning: false },
      }));
    },
    [emitEvent]
  );

  /**
   * Відслідковування BLE підключення
   */
  const trackBleConnected = useCallback(
    (deviceId: string, deviceName: string | null, rssi: number) => {
      const quality = getRssiQuality(rssi);

      emitEvent({
        type: 'ble_connected',
        deviceId,
        rssi,
      });

      setState((prev) => ({
        ...prev,
        stats: {
          ...prev.stats,
          ble: {
            ...prev.stats.ble,
            lastRssi: rssi,
            lastConnectionQuality: quality,
            connectionDrops: 0, // reset on успішне підключення
          },
        },
      }));

      setStatus((prev) => ({
        ...prev,
        ble: {
          ...prev.ble,
          isConnected: true,
          isReconnecting: false,
          quality,
          rssi,
          deviceName,
          reconnectAttempt: 0,
        },
      }));

      reconnectAttemptRef.current = 0;
    },
    [emitEvent]
  );

  const trackBleDisconnected = useCallback(
    (reason: string) => {
      emitEvent({
        type: 'ble_disconnected',
        reason,
      });

      setState((prev) => ({
        ...prev,
        stats: {
          ...prev.stats,
          ble: {
            ...prev.stats.ble,
            connectionDrops: prev.stats.ble.connectionDrops + 1,
          },
        },
      }));

      setStatus((prev) => ({
        ...prev,
        ble: {
          ...prev.ble,
          isConnected: false,
        },
      }));
    },
    [emitEvent]
  );

  /**
   * Розрахунок затримки для наступного реконекту
   */
  const scheduleReconnect = useCallback(() => {
    const attempt = reconnectAttemptRef.current;
    const delay = calculateReconnectDelay(attempt, state.currentProfile, true);

    emitEvent({
      type: 'ble_reconnect_scheduled',
      attempt,
      delay,
    });

    setStatus((prev) => ({
      ...prev,
      ble: {
        ...prev.ble,
        isReconnecting: true,
        nextReconnectDelay: delay,
        reconnectAttempt: attempt,
      },
    }));

    reconnectAttemptRef.current += 1;

    return delay;
  }, [state.currentProfile, emitEvent]);

  /**
   * Відслідковування команд Coaster
   */
  const trackCoasterCommand = useCallback(
    (success: boolean, latency: number | null, error?: string) => {
      if (success && latency !== null) {
        emitEvent({
          type: 'coaster_command_success',
          latency,
        });

        setState((prev) => ({
          ...prev,
          stats: {
            ...prev.stats,
            coaster: {
              ...prev.stats.coaster,
              successfulCommands: prev.stats.coaster.successfulCommands + 1,
              lastCommandLatency: latency,
            },
          },
        }));
      } else {
        emitEvent({
          type: 'coaster_command_failed',
          error: error || 'Unknown error',
        });

        setState((prev) => ({
          ...prev,
          stats: {
            ...prev.stats,
            coaster: {
              ...prev.stats.coaster,
              failedCommands: prev.stats.coaster.failedCommands + 1,
            },
          },
        }));
      }

      // Оновлюємо статус
      setStatus((prev) => {
        const total =
          state.stats.coaster.successfulCommands +
          state.stats.coaster.failedCommands +
          1;
        const successful = state.stats.coaster.successfulCommands + (success ? 1 : 0);
        const successRate = successful / total;

        return {
          ...prev,
          coaster: {
            ...prev.coaster,
            commandSuccessRate: successRate,
            averageLatency: latency,
            lastError: error || null,
          },
        };
      });
    },
    [state.stats.coaster, emitEvent]
  );

  /**
   * Ручне переключення профілю
   */
  const switchProfile = useCallback(
    (profileName: ProfileName) => {
      const newProfile = CONNECTION_PROFILES[profileName];

      if (newProfile.name === state.currentProfile.name) return;

      emitEvent({
        type: 'profile_switched',
        from: state.currentProfile.name,
        to: newProfile.name,
        reason: 'Manual switch',
      });

      setState((prev) => ({
        ...prev,
        currentProfile: newProfile,
        adaptive: {
          ...prev.adaptive,
          lastProfileSwitch: Date.now(),
        },
      }));

      setStatus((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          current: newProfile.name,
        },
      }));
    },
    [state.currentProfile.name, emitEvent]
  );

  /**
   * Увімкнути/вимкнути автоматичне переключення профілів
   */
  const setAutoProfileSwitch = useCallback((enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      adaptive: {
        ...prev.adaptive,
        autoProfileSwitch: enabled,
      },
    }));

    setStatus((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        auto: enabled,
      },
    }));
  }, []);

  return {
    // Поточний стан
    state,
    status,

    // Поточний профіль
    currentProfile: state.currentProfile,

    // Методи для відслідковування подій
    trackBleScanStart,
    trackBleScanComplete,
    trackBleScanFailed,
    trackBleConnected,
    trackBleDisconnected,
    scheduleReconnect,
    trackCoasterCommand,

    // Управління профілями
    switchProfile,
    setAutoProfileSwitch,

    // Підписка на події
    addEventListener,

    // Утиліти
    getAdaptiveScanDuration: () => calculateAdaptiveScanDuration(state),
    getReconnectDelay: (attempt: number) =>
      calculateReconnectDelay(attempt, state.currentProfile, true),
  };
}

/**
 * Визначення типу мережі з NetInfo
 */
function getNetworkType(netState: NetInfoState): NetworkType {
  if (netState.type === 'wifi') return 'wifi';
  if (netState.type === 'cellular') return 'cellular';
  if (netState.type === 'ethernet') return 'ethernet';
  return 'unknown';
}

/**
 * Визначення якості мережі
 */
function getNetworkQuality(netState: NetInfoState): ConnectionQuality {
  if (!netState.isConnected) return 'critical';

  // Для WiFi можемо дивитися на деталі
  if (netState.type === 'wifi' && netState.details) {
    const details = netState.details as any;
    const strength = details.strength; // 0-100

    if (strength !== undefined) {
      if (strength >= 80) return 'excellent';
      if (strength >= 60) return 'good';
      if (strength >= 40) return 'fair';
      if (strength >= 20) return 'poor';
      return 'critical';
    }
  }

  // Для cellular можемо дивитися на тип
  if (netState.type === 'cellular' && netState.details) {
    const details = netState.details as any;
    const cellularGeneration = details.cellularGeneration;

    if (cellularGeneration === '5g') return 'excellent';
    if (cellularGeneration === '4g') return 'good';
    if (cellularGeneration === '3g') return 'fair';
    return 'poor';
  }

  // За замовчуванням - good якщо підключено
  return netState.isConnected ? 'good' : 'critical';
}
