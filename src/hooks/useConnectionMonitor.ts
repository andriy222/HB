<<<<<<< HEAD
=======
/**
 * Centralized Connection Monitor
 *
 * Простий централізований реактивний моніторинг всіх підключень
 * БЕЗ якості - просто чи є підключення чи ні
 *
 * Uses Zustand for state management
 */
>>>>>>> dea98cf6b74339d65687593ed7f3aeb226b3b44e

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
<<<<<<< HEAD
  canStartRace: boolean; 
=======
  canStartRace: boolean;
>>>>>>> dea98cf6b74339d65687593ed7f3aeb226b3b44e
}


/**
<<<<<<< HEAD
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
=======
 * Хук для моніторингу всіх підключень
 * Використовує Zustand store для централізованого стану
>>>>>>> dea98cf6b74339d65687593ed7f3aeb226b3b44e
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
<<<<<<< HEAD
    // Підписуємось на зміни
    const unsubscribe = connectionStore.subscribe((newState) => {
      setState(newState);
    });

    const unsubscribeNet = NetInfo.addEventListener((netState) => {
=======
    const unsubscribe = NetInfo.addEventListener((netState) => {
>>>>>>> dea98cf6b74339d65687593ed7f3aeb226b3b44e
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
<<<<<<< HEAD
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
=======
  }, [updateInternet]);
>>>>>>> dea98cf6b74339d65687593ed7f3aeb226b3b44e

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