

import { useEffect } from 'react';
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
  const hasAllConnections = useConnectionStore((state) => state.hasAllConnections());
  const missingConnections = useConnectionStore((state) => state.missingConnections());
  const canStartRace = useConnectionStore((state) => state.canStartRace());

  // Моніторинг інтернету
  useEffect(() => {

    const unsubscribe = NetInfo.addEventListener((netState) => {
      const isOnline = netState.isConnected ?? false;
      updateInternet(isOnline);
    });

    NetInfo.fetch().then((netState) => {
      const isOnline = netState.isConnected ?? false;
      connectionStore.updateInternet(isOnline);
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