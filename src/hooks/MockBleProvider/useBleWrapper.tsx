import { Device } from "react-native-ble-plx";
import { useMockBLE } from "./useMockBle";
import { useBLEConnection } from "../useBleConnection/useBleConnection";
import { mmkvStorage } from "../../storage/appStorage";

/**
 * BLE Connection Wrapper
 *
 * Automatically switches between real BLE and mock
 *
 * Mock mode enabled when:
 * - No device connected
 * - MOCK_MODE flag is set
 * - Running in simulator
 */

interface BLEWrapperConfig {
  device: Device | null;
  isConnected: boolean;
  targetService: string;
  rxCharacteristic: string;
  txCharacteristic: string;
  forceMock?: boolean; // Force mock mode
}

export function useBLEWrapper(
  config: BLEWrapperConfig,
  onDataReceived?: (data: { index: number; ml: number }) => void,
  onLineReceived?: (line: string) => void
) {
  const { device, isConnected, forceMock, ...bleConfig } = config;

  // Check if mock mode should be enabled
  const mockModeEnabled =
    forceMock || mmkvStorage.getBoolean("dev:mockMode") || !device;

  console.log(`🔧 BLE Mode: ${mockModeEnabled ? "MOCK" : "REAL"}`);

  // Real BLE
  const realBLE = useBLEConnection(
    device,
    isConnected && !mockModeEnabled,
    bleConfig,
    onDataReceived,
    onLineReceived
  );

  // Mock BLE
  const mockBLE = useMockBLE(mockModeEnabled, onDataReceived, onLineReceived, {
    autoConnect: true,
    initialLogCount: 100,
  });

  // Return appropriate interface
  return mockModeEnabled ? mockBLE : realBLE;
}

/**
 * Toggle mock mode
 */
export function toggleMockMode() {
  const current = mmkvStorage.getBoolean("dev:mockMode") ?? false;
  mmkvStorage.set("dev:mockMode", !current);
  console.log(`🔧 Mock mode: ${!current ? "ON" : "OFF"}`);
}

/**
 * Check if mock mode is enabled
 */
export function isMockMode(): boolean {
  return mmkvStorage.getBoolean("dev:mockMode") ?? false;
}
