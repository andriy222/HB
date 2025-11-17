
import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

export interface ConnectionState {
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
}

export interface ConnectionMonitorHook {
  state: ConnectionState;
  hasAllConnections: boolean;
  missingConnections: string[];
  canStartRace: boolean; 
}


/**
 * Глобальний стор для стану підключень
 * Використовується для синхронізації між різними хуками
 */
class ConnectionStateStore {
  private listeners: Set<(state: ConnectionState) => void> = new Set();
  private state: ConnectionState = {
    ble: { isConnected: false, isReconnecting: false },
    internet: { isConnected: false },
    coaster: { isConnected: false },
  };

  subscribe(listener: (state: ConnectionState) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): ConnectionState {
    return this.state;
  }

  updateBle(isConnected: boolean, isReconnecting: boolean) {

    this.state = {
      ble: { isConnected, isReconnecting },
      internet: { ...this.state.internet },
      coaster: { ...this.state.coaster },
    };
    this.notify();
  }

  updateInternet(isConnected: boolean) {

    this.state = {
      ble: { ...this.state.ble },
      internet: { isConnected },
      coaster: { ...this.state.coaster },
    };
    this.notify();
  }

  updateCoaster(isConnected: boolean) {
    this.state = {
      ble: { ...this.state.ble },
      internet: { ...this.state.internet },
      coaster: { isConnected },
    };
    this.notify();
  }

  private notify() {
    const newState = { ...this.state };
    this.listeners.forEach((listener) => {
      listener(newState);
    });
  }
}

export const connectionStore = new ConnectionStateStore();

/**
 * Хук що використовує глобальний стор
 * Це забезпечує синхронізацію стану між всіма компонентами
 */
export function useConnectionMonitor(): ConnectionMonitorHook {
  const [state, setState] = useState<ConnectionState>(
    connectionStore.getState()
  );

  useEffect(() => {
    // Підписуємось на зміни
    const unsubscribe = connectionStore.subscribe((newState) => {
      setState(newState);
    });

    const unsubscribeNet = NetInfo.addEventListener((netState) => {
      const isOnline = netState.isConnected ?? false;
      connectionStore.updateInternet(isOnline);
    });

    NetInfo.fetch().then((netState) => {
      const isOnline = netState.isConnected ?? false;
      connectionStore.updateInternet(isOnline);
    });

    return () => {
      unsubscribe();
      unsubscribeNet();
    };
  }, []);

  const hasAllConnections =
    state.ble.isConnected &&
    state.internet.isConnected &&
    state.coaster.isConnected;

  const missingConnections: string[] = [];
  if (!state.internet.isConnected) missingConnections.push('internet');
  if (!state.ble.isConnected) missingConnections.push('bluetooth');
  if (!state.coaster.isConnected) missingConnections.push('coaster');

  const canStartRace = hasAllConnections;

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
