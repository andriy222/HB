import { useState, useEffect } from "react";
import { Device } from "react-native-ble-plx";
import {
  clearLastDeviceId,
  getLastDeviceId,
  setLastDeviceId,
} from "../../utils/storage";
import { useConnectionStore } from "../../store/connectionStore";
import { useBleStore } from "../../store/bleStore";

let mockCoaster: any = null;
try {
  const module = require("./MockCoaster");
  mockCoaster = module.mockCoaster;
} catch (e) {
  console.warn("⚠️ mockCoaster not found, using basic mock");
}

const MOCK_DEVICE: Device = {
  id: "mock-device-id",
  name: "Hybit NeuraFlow (Mock)",
} as Device;

export const useMockBleScan = () => {
  const updateBle = useConnectionStore((state) => state.updateBle);
  const { hasCompletedOnboarding } = useBleStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [linkUp, setLinkUp] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(
    null
  );
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [noTargetFound, setNoTargetFound] = useState(false);

  useEffect(() => {
    const savedDeviceId = getLastDeviceId();
    console.log("📱 [MOCK] Checking saved device:", savedDeviceId);
    console.log("📱 [MOCK] Onboarding completed:", hasCompletedOnboarding);

    // Only auto-restore connection if onboarding is complete
    if (savedDeviceId === MOCK_DEVICE.id && hasCompletedOnboarding) {
      console.log("📱 [MOCK] Restoring connection");
      setConnectedDevice(MOCK_DEVICE);
      setLinkUp(true);

      if (mockCoaster && !mockCoaster.getState().connected) {
        mockCoaster.generateLogs(100);
        console.log("📊 [MOCK] Generated 100 initial logs");
      }
    } else if (savedDeviceId && !hasCompletedOnboarding) {
      console.log("📱 [MOCK] Device saved but onboarding not complete, skipping auto-connect");
    }
  }, [hasCompletedOnboarding]);

  const startScan = () => {
    console.log("📱 [MOCK] Starting scan...");
    setIsScanning(true);

    setTimeout(() => {
      console.log("📱 [MOCK] Device found");
      setDevices([MOCK_DEVICE]);
      setIsScanning(false);
    }, 2000);
  };

  const stopScan = () => {
    console.log("📱 [MOCK] Stopping scan");
    setIsScanning(false);
  };

  const connectToDevice = async (deviceId: string) => {
    console.log("📱 [MOCK] Connecting to:", deviceId);
    setIsConnecting(true);
    setConnectingDeviceId(deviceId);

    return new Promise<Device | null>((resolve) => {
      setTimeout(async () => {
        console.log("📱 [MOCK] Connected!");

        // Setup mockCoaster with data
        if (mockCoaster) {
          mockCoaster.generateLogs(100);
          console.log("📊 [MOCK] Generated 100 logs");
        }

        setConnectedDevice(MOCK_DEVICE);
        setLinkUp(true);
        setIsConnecting(false);
        setConnectingDeviceId(null);

        setLastDeviceId(MOCK_DEVICE.id);
        console.log("💾 [MOCK] Saved device ID");

        resolve(MOCK_DEVICE);
      }, 1500);
    });
  };

  const disconnect = async () => {
    console.log("📱 [MOCK] Disconnecting");

    if (mockCoaster) {
      mockCoaster.disconnect();
    }

    setConnectedDevice(null);
    setLinkUp(false);

    clearLastDeviceId();
    console.log("💾 [MOCK] Cleared device ID");
  };

  useEffect(() => {
    updateBle(linkUp, isReconnecting);
  }, [linkUp, isReconnecting, updateBle]);

  return {
    devices,
    isScanning,
    connectedDevice,
    linkUp,
    isConnecting,
    connectingDeviceId,
    connectError,
    isReconnecting,
    noTargetFound,
    startScan,
    stopScan,
    connectToDevice,
    disconnect,
  };
};
