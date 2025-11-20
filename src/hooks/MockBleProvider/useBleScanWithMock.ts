import { Platform } from 'react-native';
import { useMockBleScan } from './MockBleProvider';
import { useBleScan } from '../useScanDevices';
import { BLE_CONFIG } from '../../constants/sessionConstants';

const isSimulator = Platform.OS === 'ios'
  ? !__DEV__ ? false : true
  : Platform.OS === 'android'
  ? false
  : true;

export const useBleScanWithMock = () => {
  const shouldUseMock = BLE_CONFIG.USE_MOCK_BLE || isSimulator;

  if (shouldUseMock) {
    return useMockBleScan();
  }

  return useBleScan();
};