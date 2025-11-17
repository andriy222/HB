import React, { useEffect } from "react";
import { View, StyleSheet, Alert, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useConnectionStatus } from "../../hooks/useConnectionStatus/useConectionStatus";
import ConnectionAlert from "./ ConnectionAlert";

export default function ConnectionAlerts() {
  const router = useRouter();
  const status = useConnectionStatus();

  const handleCoasterConnect = () => {
    router.push("/(on-boarding)/start");
  };

  const handleBluetoothConnect = () => {
    Alert.alert(
      "Enable Bluetooth",
      "Please enable Bluetooth in your device settings",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ]
    );
  };

  const handleInternetConnect = () => {
    Alert.alert(
      "No Internet Connection",
      "Please check your WiFi or mobile data connection",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ]
    );
  };

  const hasIssues =
    !status.coaster.isConnected ||
    !status.bluetooth.isEnabled ||
    !status.internet.isConnected;

  if (!hasIssues) {
    return null;
  }

  return (
    <View style={styles.container}>
      {!status.coaster.isConnected && (
        <ConnectionAlert
          type="coaster"
          title="Coaster is OFF"
          message={status.coaster.message}
          onConnect={handleCoasterConnect}
        />
      )}

      {!status.bluetooth.isEnabled && (
        <ConnectionAlert
          type="bluetooth"
          title="Bluetooth is OFF"
          message={status.bluetooth.message}
          onConnect={handleBluetoothConnect}
        />
      )}

      {!status.internet.isConnected && (
        <ConnectionAlert
          type="internet"
          title="Internet is OFF"
          message={status.internet.message}
          onConnect={handleInternetConnect}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
