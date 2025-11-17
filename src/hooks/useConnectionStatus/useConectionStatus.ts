import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { useBleScanWithMock } from '../MockBleProvider/useBleScanWithMock';
import { useInternetConnection } from '../useInternetConnection';

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
  const internetConnected = useInternetConnection();
  const [bluetoothEnabled, setBluetoothEnabled] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setBluetoothEnabled(true);
    }
  }, []);

  return {
    coaster: {
      isConnected: linkUp && !!connectedDevice,
      message: 'Please connect your Coaster',
    },
    bluetooth: {
      isEnabled: bluetoothEnabled,
      message: 'Please connect your bluetooth',
    },
    internet: {
      isConnected: internetConnected ?? false,
      message: 'Please connect your internet',
    },
  };
}