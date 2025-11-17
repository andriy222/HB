/**
 * Centralized Connection Monitor
 *
 * Простий централізований реактивний моніторинг всіх підключень
 * БЕЗ якості - просто чи є підключення чи ні
 *
 * Uses Zustand for state management
 */

import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { shallow } from 'zustand/shallow';
import { useConnectionStore } from '../store/connectionStore';

export interface ConnectionMonitorHook {
  state: {
    ble: {
      isConnected: boolean;
      isReconnecting: boolean;
    };
    internet: {
      isConnected: boolean;
    };
    coaster: {
      isConnected: boolean;
    };
  };
  hasAllConnections: boolean;
  missingConnections: string[];
  canStartRace: boolean;
}

/**
 * Хук для моніторингу всіх підключень
 * Використовує Zustand store для централізованого стану
 */
export function useConnectionMonitor(): ConnectionMonitorHook {
  const updateInternet = useConnectionStore((state) => state.updateInternet);
  const ble = useConnectionStore((state) => state.ble);
  const internet = useConnectionStore((state) => state.internet);
  const coaster = useConnectionStore((state) => state.coaster);

  // Compute derived values inline to avoid creating new objects on every render
  const hasAllConnections = useConnectionStore((state) =>
    state.ble.isConnected && state.internet.isConnected && state.coaster.isConnected
  );

  // Compute missing connections with shallow equality check
  // to avoid array reference issues that cause infinite re-renders
  const missingConnections = useConnectionStore((state) => {
    const missing: string[] = [];
    if (!state.internet.isConnected) missing.push('internet');
    if (!state.ble.isConnected) missing.push('bluetooth');
    if (!state.coaster.isConnected) missing.push('coaster');
    return missing;
  }, shallow);

  const canStartRace = useConnectionStore((state) =>
    state.ble.isConnected && state.internet.isConnected && state.coaster.isConnected
  );

  // Моніторинг інтернету
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState) => {
      const isOnline = netState.isConnected ?? false;
      updateInternet(isOnline);
    });

    return () => {
      unsubscribe();
    };
  }, [updateInternet]);

  return {
    state: {
      ble,
      internet,
      coaster,
    },
    hasAllConnections,
    missingConnections,
    canStartRace,
  };
}

/**
 * Alias for backwards compatibility
 * @deprecated Use useConnectionMonitor instead
 */
export const useGlobalConnectionMonitor = useConnectionMonitor;