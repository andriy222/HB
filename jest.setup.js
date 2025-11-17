// Add custom jest matchers from jest-dom
import '@testing-library/jest-native/extend-expect';

// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
  })),
}));

// Mock expo modules
jest.mock('expo-device', () => ({
  deviceName: 'Test Device',
}));

// Mock AppState for React Native
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  currentState: 'active',
}));

// Silence console warnings in tests
global.console = {
  ...console,
  // Suppress console.warn and console.error during tests
  warn: jest.fn(),
  error: jest.fn(),
};
