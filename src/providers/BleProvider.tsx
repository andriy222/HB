import React, { createContext, useContext } from 'react';
import { Device } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import { useBleScan } from '../hooks/useScanDevices';
import { useMockBleScan } from '../hooks/MockBleProvider/MockBleProvider';
import { BLE_CONFIG } from '../constants/sessionConstants';

/**
 * Shared BLE Context
 *
 * Single BleManager instance for the entire app.
 * All screens share the same connection state.
 */

export interface BleContextValue {
  devices: Device[];
  isScanning: boolean;
  connectedDevice: Device | null;
  linkUp: boolean;
  isConnecting: boolean;
  connectingDeviceId: string | null;
  connectError: string | null;
  isReconnecting: boolean;
  noTargetFound: boolean;
  startScan: () => void;
  stopScan: () => void;
  connectToDevice: (deviceId: string) => Promise<Device | null>;
  disconnect: () => Promise<void>;
}

const BleContext = createContext<BleContextValue | null>(null);

// Determine mock mode once at module level (never changes at runtime)
const isSimulator =
  Platform.OS === 'ios'
    ? !__DEV__
      ? false
      : true
    : Platform.OS === 'android'
      ? false
      : true;

const SHOULD_USE_MOCK = BLE_CONFIG.USE_MOCK_BLE || isSimulator;

/**
 * Provider that uses real BLE (production)
 */
function RealBleProvider({ children }: { children: React.ReactNode }) {
  const ble = useBleScan();
  return <BleContext.Provider value={ble}>{children}</BleContext.Provider>;
}

/**
 * Provider that uses mock BLE (simulator/dev)
 */
function MockBleProvider({ children }: { children: React.ReactNode }) {
  const ble = useMockBleScan();
  return <BleContext.Provider value={ble}>{children}</BleContext.Provider>;
}

/**
 * Root BLE Provider — wrap your app with this.
 * Creates ONE BleManager for the entire app.
 */
export function BleProvider({ children }: { children: React.ReactNode }) {
  if (SHOULD_USE_MOCK) {
    return <MockBleProvider>{children}</MockBleProvider>;
  }
  return <RealBleProvider>{children}</RealBleProvider>;
}

/**
 * Hook to access BLE state from any screen.
 * Drop-in replacement for useBleScanWithMock().
 */
export function useBle(): BleContextValue {
  const context = useContext(BleContext);
  if (!context) {
    throw new Error('useBle must be used within <BleProvider>');
  }
  return context;
}
