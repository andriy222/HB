/**
 * Enhanced Connection Status Hook
 *
 * Покращена версія useConnectionStatus з підтримкою якості підключення
 * Зберігає зворотну сумісність з оригінальним API
 */

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { useAdaptiveConnectionManager } from './useAdaptiveConnectionManager';
import { useAdaptiveBleScan } from './useAdaptiveBleScan';
import { ConnectionQuality } from '../config/adaptiveConnectionConfig';

/**
 * Оригінальний інтерфейс для зворотної сумісності
 */
export interface ConnectionStatus {
  coaster: {
    isConnected: boolean;
    message: string;
  };
  bluetooth: {
    isEnabled: boolean;
    message: string;
  };
  internet: {
    isConnected: boolean;
    message: string;
  };
}

/**
 * Розширений інтерфейс з новими можливостями
 */
export interface EnhancedConnectionStatus extends ConnectionStatus {
  // Додаткові поля для якості
  quality: {
    ble: ConnectionQuality;
    internet: ConnectionQuality;
    coaster: ConnectionQuality;
  };

  // Детальна інформація
  details: {
    ble: {
      rssi: number | null;
      isReconnecting: boolean;
      reconnectAttempt: number;
      deviceName: string | null;
    };
    internet: {
      networkType: string;
      lastCheckTime: number;
    };
    coaster: {
      commandSuccessRate: number;
      lastError: string | null;
    };
  };

  // Профіль підключення
  profile: {
    current: string;
    auto: boolean;
  };
}

/**
 * Базовий хук (зворотно сумісний)
 */
export function useConnectionStatus(): ConnectionStatus {
  const enhanced = useEnhancedConnectionStatus();

  return {
    coaster: enhanced.coaster,
    bluetooth: enhanced.bluetooth,
    internet: enhanced.internet,
  };
}

/**
 * Покращений хук з усіма новими можливостями
 */
export function useEnhancedConnectionStatus(): EnhancedConnectionStatus {
  const connectionManager = useAdaptiveConnectionManager();
  const bleStatus = useAdaptiveBleScan();

  const [bluetoothEnabled, setBluetoothEnabled] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setBluetoothEnabled(true);
    }
  }, []);

  // Визначення якості для Coaster на основі успішності команд
  const getCoasterQuality = (): ConnectionQuality => {
    const successRate = connectionManager.status.coaster.commandSuccessRate;

    if (successRate >= 0.95) return 'excellent';
    if (successRate >= 0.85) return 'good';
    if (successRate >= 0.7) return 'fair';
    if (successRate >= 0.5) return 'poor';
    return 'critical';
  };

  return {
    // Оригінальні поля (зворотна сумісність)
    coaster: {
      isConnected: bleStatus.linkUp && !!bleStatus.connectedDevice,
      message: 'Please connect your Coaster',
    },
    bluetooth: {
      isEnabled: bluetoothEnabled,
      message: 'Please connect your bluetooth',
    },
    internet: {
      isConnected: connectionManager.status.internet.isOnline,
      message: 'Please connect your internet',
    },

    // Нові поля - якість підключення
    quality: {
      ble: connectionManager.status.ble.quality,
      internet: connectionManager.status.internet.quality,
      coaster: getCoasterQuality(),
    },

    // Детальна інформація
    details: {
      ble: {
        rssi: connectionManager.status.ble.rssi,
        isReconnecting: connectionManager.status.ble.isReconnecting,
        reconnectAttempt: connectionManager.status.ble.reconnectAttempt,
        deviceName: connectionManager.status.ble.deviceName,
      },
      internet: {
        networkType: connectionManager.status.internet.networkType,
        lastCheckTime: connectionManager.status.internet.lastCheckTime,
      },
      coaster: {
        commandSuccessRate: connectionManager.status.coaster.commandSuccessRate,
        lastError: connectionManager.status.coaster.lastError,
      },
    },

    // Профіль
    profile: {
      current: connectionManager.status.profile.current,
      auto: connectionManager.status.profile.auto,
    },
  };
}
