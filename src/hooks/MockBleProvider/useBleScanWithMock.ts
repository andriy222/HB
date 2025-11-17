import { Platform } from 'react-native';
import { useMockBleScan } from './MockBleProvider';
import { useBleScan } from '../useScanDevices';


const isSimulator = Platform.OS === 'ios' 
  ? !__DEV__ ? false : true
  : Platform.OS === 'android' 
  ? false 
  : true;

const USE_MOCK = true;

export const useBleScanWithMock = () => {
  const shouldUseMock = USE_MOCK || isSimulator;
  
  console.log(`🔧 Using ${shouldUseMock ? 'MOCK' : 'REAL'} BLE`);
  
  if (shouldUseMock) {
    return useMockBleScan();
  }
  
  return useBleScan();
};