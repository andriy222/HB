import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { useBleScanWithMock } from '../MockBleProvider/useBleScanWithMock';
import { useGlobalConnectionMonitor, connectionStore } from '../useConnectionMonitor';

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
    connectionStore.updateCoaster(isCoasterConnected);
  }, [linkUp, connectedDevice]);

  return {
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
  };
}