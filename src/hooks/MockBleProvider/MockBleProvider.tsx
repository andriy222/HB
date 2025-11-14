import { useState } from "react";
import { Device } from "react-native-ble-plx";

const MOCK_DEVICE: Partial<Device> = {
  id: "mock-device-id",
  name: "Hybit NeuraFlow (Mock)",
};

export const useMockBleScan = () => {
  const [devices, setDevices] = useState<Partial<Device>[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] =
    useState<Partial<Device> | null>(null);
  const [linkUp, setLinkUp] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(
    null
  );
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [noTargetFound, setNoTargetFound] = useState(false);

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

    return new Promise<Partial<Device> | null>((resolve) => {
      setTimeout(() => {
        console.log("📱 [MOCK] Connected!");
        setConnectedDevice(MOCK_DEVICE);
        setLinkUp(true);
        setIsConnecting(false);
        setConnectingDeviceId(null);
        resolve(MOCK_DEVICE as Device);
      }, 1500);
    });
  };

  const disconnect = async () => {
    console.log("📱 [MOCK] Disconnecting");
    setConnectedDevice(null);
    setLinkUp(false);
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
