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
    console.log('🌐 Setting up NetInfo listener...');

    const unsubscribe = NetInfo.addEventListener((netState) => {
      const isOnline = netState.isConnected ?? false;
      console.log('🌐 NetInfo event received:', {
        isConnected: netState.isConnected,
        isInternetReachable: netState.isInternetReachable,
        type: netState.type,
        details: netState.details,
        computedOnline: isOnline
      });
      updateInternet(isOnline);
    });

    // Initial fetch
    NetInfo.fetch().then((netState) => {
      const isOnline = netState.isConnected ?? false;
      console.log('🌐 NetInfo initial fetch:', {
        isConnected: netState.isConnected,
        isInternetReachable: netState.isInternetReachable,
        type: netState.type,
        computedOnline: isOnline
      });
      updateInternet(isOnline);
    });

    // Fallback polling every 3 seconds to catch missed NetInfo events
    // This is especially important on iOS simulator where NetInfo can be unreliable
    const pollInterval = setInterval(() => {
      NetInfo.fetch().then((netState) => {
        const isOnline = netState.isConnected ?? false;
        console.log('🌐 NetInfo polling check:', {
          isConnected: netState.isConnected,
          computedOnline: isOnline
        });
        updateInternet(isOnline);
      });
    }, 3000);

    return () => {
      console.log('🌐 Cleaning up NetInfo listener');
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [updateInternet]);

  // Memoize state object to prevent unnecessary re-renders
  const state = useMemo(() => ({
    ble,
    internet,
    coaster,
  }), [ble, internet, coaster]);

  return {
    state,
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