/**
 * Centralized Connection Monitor
 *
 * Простий централізований реактивний моніторинг всіх підключень
 * БЕЗ якості - просто чи є підключення чи ні
 */

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
  canStartRace: boolean; // чи можна починати гонку
}

/**
 * Централізований хук для моніторингу всіх підключень
 */
export function useConnectionMonitor(): ConnectionMonitorHook {
  const [state, setState] = useState<ConnectionState>({
    ble: {
      isConnected: false,
      isReconnecting: false,
    },
    internet: {
      isConnected: false,
    },
    coaster: {
      isConnected: false,
    },
  });

  // Моніторинг інтернету
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState) => {
      const isOnline = netState.isConnected ?? false;

      setState((prev) => ({
        ...prev,
        internet: {
          isConnected: isOnline,
        },
      }));
    });

    // Initial check
    NetInfo.fetch().then((netState) => {
      const isOnline = netState.isConnected ?? false;
      setState((prev) => ({
        ...prev,
        internet: {
          isConnected: isOnline,
        },
      }));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Методи для оновлення стану BLE/Coaster (викликаються з інших хуків)
  const updateBleState = useCallback((isConnected: boolean, isReconnecting: boolean) => {
    setState((prev) => ({
      ...prev,
      ble: {
        isConnected,
        isReconnecting,
      },
    }));
  }, []);

  const updateCoasterState = useCallback((isConnected: boolean) => {
    setState((prev) => ({
      ...prev,
      coaster: {
        isConnected,
      },
    }));
  }, []);

  // Перевірка чи всі підключення є
  const hasAllConnections =
    state.ble.isConnected &&
    state.internet.isConnected &&
    state.coaster.isConnected;

  // Список відсутніх підключень
  const missingConnections: string[] = [];
  if (!state.internet.isConnected) missingConnections.push('internet');
  if (!state.ble.isConnected) missingConnections.push('bluetooth');
  if (!state.coaster.isConnected) missingConnections.push('coaster');

  // Чи можна починати гонку
  const canStartRace = hasAllConnections;

  return {
    state,
    hasAllConnections,
    missingConnections,
    canStartRace,
  };
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
    // Створюємо повністю новий стан з новими вкладеними об'єктами
    this.state = {
      ble: { isConnected, isReconnecting },
      internet: { ...this.state.internet },
      coaster: { ...this.state.coaster },
    };
    this.notify();
  }

  updateInternet(isConnected: boolean) {
    // Створюємо повністю новий стан з новими вкладеними об'єктами
    this.state = {
      ble: { ...this.state.ble },
      internet: { isConnected },
      coaster: { ...this.state.coaster },
    };
    this.notify();
  }

  updateCoaster(isConnected: boolean) {
    // Створюємо повністю новий стан з новими вкладеними об'єктами
    this.state = {
      ble: { ...this.state.ble },
      internet: { ...this.state.internet },
      coaster: { isConnected },
    };
    this.notify();
  }

  private notify() {
    // Створюємо НОВИЙ об'єкт щоб React побачив зміну
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
export function useGlobalConnectionMonitor(): ConnectionMonitorHook {
  const [state, setState] = useState<ConnectionState>(
    connectionStore.getState()
  );

  useEffect(() => {
    // Підписуємось на зміни
    const unsubscribe = connectionStore.subscribe((newState) => {
      setState(newState);
    });

    // Моніторинг інтернету
    const unsubscribeNet = NetInfo.addEventListener((netState) => {
      const isOnline = netState.isConnected ?? false;
      connectionStore.updateInternet(isOnline);
    });

    // Initial internet check
    NetInfo.fetch().then((netState) => {
      const isOnline = netState.isConnected ?? false;
      connectionStore.updateInternet(isOnline);
    });

    return () => {
      unsubscribe();
      unsubscribeNet();
    };
  }, []);

  // Перевірка чи всі підключення є
  const hasAllConnections =
    state.ble.isConnected &&
    state.internet.isConnected &&
    state.coaster.isConnected;

  // Список відсутніх підключень
  const missingConnections: string[] = [];
  if (!state.internet.isConnected) missingConnections.push('internet');
  if (!state.ble.isConnected) missingConnections.push('bluetooth');
  if (!state.coaster.isConnected) missingConnections.push('coaster');

  // Чи можна починати гонку
  const canStartRace = hasAllConnections;

  return {
    state,
    hasAllConnections,
    missingConnections,
    canStartRace,
  };
}
