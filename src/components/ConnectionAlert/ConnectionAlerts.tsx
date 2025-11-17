import React, { useEffect } from "react";
import { View, StyleSheet, Alert, Linking, Text } from "react-native";
import { useRouter } from "expo-router";
import { useConnectionStatus } from "../../hooks/useConnectionStatus/useConnectionStatus";
import { useGlobalConnectionMonitor } from "../../hooks/useConnectionMonitor";
import ConnectionAlert from "./ConnectionAlert";

export default function ConnectionAlerts() {
  const router = useRouter();
  const status = useConnectionStatus();
  const monitor = useGlobalConnectionMonitor();

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
        <View>
          <ConnectionAlert
            type="coaster"
            title="Coaster is OFF"
            message={status.coaster.message}
            onConnect={handleCoasterConnect}
          />
          {monitor.state.ble.isReconnecting && (
            <View style={styles.reconnectingBanner}>
              <Text style={styles.reconnectingText}>
                🔄 Переконнект до Bluetooth...
              </Text>
            </View>
          )}
        </View>
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
  reconnectingBanner: {
    backgroundColor: '#f59e0b',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginHorizontal: 16,
  },
  reconnectingText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
