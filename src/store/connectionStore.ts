/**
 * Connection State Store (Zustand)
 *
 * Manages all connection states (BLE, Internet, Coaster) using Zustand
 * Replaces the custom pub/sub implementation with Zustand's optimized state management
 */

import { create } from 'zustand';

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

interface ConnectionStore extends ConnectionState {
  // Actions
  updateBle: (isConnected: boolean, isReconnecting: boolean) => void;
  updateInternet: (isConnected: boolean) => void;
  updateCoaster: (isConnected: boolean) => void;
  reset: () => void;

  // Computed
  hasAllConnections: () => boolean;
  missingConnections: () => string[];
  canStartRace: () => boolean;
}

const initialState: ConnectionState = {
  ble: { isConnected: false, isReconnecting: false },
  internet: { isConnected: false },
  coaster: { isConnected: false },
};

/**
 * Connection Store
 */
export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  ...initialState,

  // Actions - with guards to prevent unnecessary updates
  updateBle: (isConnected, isReconnecting) => {
    const current = get().ble;
    if (current.isConnected !== isConnected || current.isReconnecting !== isReconnecting) {
      set({ ble: { isConnected, isReconnecting } });
    }
  },

  updateInternet: (isConnected) => {
    const current = get().internet;
    if (current.isConnected !== isConnected) {
      set({ internet: { isConnected } });
    }
  },

  updateCoaster: (isConnected) => {
    const current = get().coaster;
    if (current.isConnected !== isConnected) {
      set({ coaster: { isConnected } });
    }
  },

  reset: () => set(initialState),

  // Computed values
  hasAllConnections: () => {
    const state = get();
    return (
      state.ble.isConnected &&
      state.internet.isConnected &&
      state.coaster.isConnected
    );
  },

  missingConnections: () => {
    const state = get();
    const missing: string[] = [];
    if (!state.internet.isConnected) missing.push('internet');
    if (!state.ble.isConnected) missing.push('bluetooth');
    if (!state.coaster.isConnected) missing.push('coaster');
    return missing;
  },

  canStartRace: () => get().hasAllConnections(),
}));

/**
 * Selector hooks for specific parts of the state
 * These prevent unnecessary re-renders
 */
export const useBleConnection = () =>
  useConnectionStore((state) => state.ble);

export const useInternetConnection = () =>
  useConnectionStore((state) => state.internet);

export const useCoasterConnection = () =>
  useConnectionStore((state) => state.coaster);

export const useAllConnectionsStatus = () =>
  useConnectionStore((state) => state.hasAllConnections());
