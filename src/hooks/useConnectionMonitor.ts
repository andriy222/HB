import { useEffect, useMemo } from 'react';
import NetInfo from '@react-native-community/netinfo';
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

  // Compute derived values
  const hasAllConnections = useConnectionStore((state) =>
    state.ble.isConnected && state.internet.isConnected && state.coaster.isConnected
  );

  // Memoize missing connections array to prevent recreating on every render
  const missingConnections = useMemo(() => {
    const missing: string[] = [];
    if (!internet.isConnected) missing.push('internet');
    if (!ble.isConnected) missing.push('bluetooth');
    if (!coaster.isConnected) missing.push('coaster');
    return missing;
  }, [internet.isConnected, ble.isConnected, coaster.isConnected]);

  const canStartRace = useConnectionStore((state) =>
    state.ble.isConnected && state.internet.isConnected && state.coaster.isConnected
  );

  // Моніторинг інтернету
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState) => {
      const isOnline = netState.isConnected ?? false;
      updateInternet(isOnline);
    });

    NetInfo.fetch().then((netState) => {
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