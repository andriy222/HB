import { useEffect, useState, useCallback } from "react";
import * as ExpoDevice from "expo-device";
import { PermissionsAndroid, Platform } from "react-native";

const requestAndroid31Permissions = async () => {
  const bluetoothScanPermission = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    {
      title: "Bluetooth Permission",
      message: "Bluetooth Low Energy requires Bluetooth Scan permission",
      buttonPositive: "OK",
    }
  );

  const bluetoothConnectPermission = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    {
      title: "Bluetooth Permission",
      message: "Bluetooth Low Energy requires Bluetooth Connect permission",
      buttonPositive: "OK",
    }
  );

  const fineLocationPermission = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: "Location Permission",
      message: "Bluetooth Low Energy requires Location access",
      buttonPositive: "OK",
    }
  );

  return (
    bluetoothScanPermission === PermissionsAndroid.RESULTS.GRANTED &&
    bluetoothConnectPermission === PermissionsAndroid.RESULTS.GRANTED &&
    fineLocationPermission === PermissionsAndroid.RESULTS.GRANTED
  );
};

const requestPermissions = async () => {
  if (Platform.OS === "android") {
    if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "Bluetooth Low Energy requires Location access",
          buttonPositive: "OK",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      return await requestAndroid31Permissions();
    }
  }
  return true; // iOS handles permissions via Info.plist
};

export const usePermissions = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // manual request (for button)
  const request = useCallback(async () => {
    const granted = await requestPermissions();
    setHasPermission(granted);
    return granted;
  }, []);

  // check on mount once
  useEffect(() => {
    request();
  }, [request]);

  return { hasPermission, request };
};
