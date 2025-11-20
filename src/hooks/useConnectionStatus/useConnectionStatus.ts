import { useState, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { useBleScanWithMock } from '../MockBleProvider/useBleScanWithMock';
import { useGlobalConnectionMonitor } from '../useConnectionMonitor';
import { useConnectionStore } from '../../store/connectionStore';

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

export function useConnectionStatus(): ConnectionStatus {
  const updateCoaster = useConnectionStore((state) => state.updateCoaster);
  const { linkUp, connectedDevice } = useBleScanWithMock();
  const monitor = useGlobalConnectionMonitor();
  const [bluetoothEnabled, setBluetoothEnabled] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setBluetoothEnabled(true);
    }
  }, []);

  useEffect(() => {
    const isCoasterConnected = linkUp && !!connectedDevice;
    updateCoaster(isCoasterConnected);
  }, [linkUp, connectedDevice, updateCoaster]);

  // Memoize the return object to prevent recreating on every render
  return useMemo(() => ({
    coaster: {
      isConnected: monitor.state.coaster.isConnected,
      message: 'Please connect your Coaster',
    },
    bluetooth: {
      isEnabled: bluetoothEnabled,
      message: 'Please connect your bluetooth',
    },
    internet: {
      isConnected: monitor.state.internet.isConnected,
      message: 'Please connect your internet',
    },
  }), [monitor.state.coaster.isConnected, monitor.state.internet.isConnected, bluetoothEnabled]);
}