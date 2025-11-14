import { Platform } from 'react-native';
import { useMockBleScan } from './MockBleProvider';
import { useBleScan } from '../useScanDevices';




const isSimulator = Platform.OS === 'ios' 
  ? !__DEV__ ? false : true  
  : Platform.OS === 'android' 
  ? false 
  : true;

// Можна також додати ручний перемикач
const USE_MOCK = true; // ← Змініть на false для реального пристрою

export const useBleScanWithMock = () => {
  const shouldUseMock = USE_MOCK || isSimulator;
  
  console.log(`🔧 Using ${shouldUseMock ? 'MOCK' : 'REAL'} BLE`);
  
  if (shouldUseMock) {
    return useMockBleScan();
  }
  
  return useBleScan();
};