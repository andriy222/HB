import { useState, useEffect } from "react";
import { Device } from "react-native-ble-plx";
import {
  clearLastDeviceId,
  getLastDeviceId,
  setLastDeviceId,
} from "../../utils/storage";

const MOCK_DEVICE: Device = {
  id: "mock-device-id",
  name: "Hybit NeuraFlow (Mock)",
} as Device;

export const useMockBleScan = () => {
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
    console.log("📱 [MOCK] Saved device ID:", savedDeviceId);

    if (savedDeviceId === MOCK_DEVICE.id) {
      setConnectedDevice(MOCK_DEVICE);
      setLinkUp(true);
      console.log("📱 [MOCK] Restored connection to:", MOCK_DEVICE.name);
    }
  }, []);

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
        setConnectedDevice(MOCK_DEVICE);
        setLinkUp(true);
        setIsConnecting(false);
        setConnectingDeviceId(null);

        await setLastDeviceId(MOCK_DEVICE.id);
        console.log("💾 [MOCK] Saved device ID to storage");

        resolve(MOCK_DEVICE);
      }, 1500);
    });
  };

  const disconnect = async () => {
    console.log("📱 [MOCK] Disconnecting");
    setConnectedDevice(null);
    setLinkUp(false);

    await clearLastDeviceId();
    console.log("💾 [MOCK] Cleared device ID from storage");
  };

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
