import React from "react";
import { View, StyleSheet, Alert, Linking, Text } from "react-native";
import { useRouter } from "expo-router";
import { useGlobalConnectionMonitor } from "../../hooks/useConnectionMonitor";
import ConnectionAlert from "./ConnectionAlert";

export default function ConnectionAlerts() {
  const router = useRouter();
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
    !monitor.state.coaster.isConnected ||
    !monitor.state.ble.isConnected ||
    !monitor.state.internet.isConnected;

  if (!hasIssues) {
    return null;
  }

  return (
    <View style={styles.container}>
      {!monitor.state.coaster.isConnected && (
        <View>
          <ConnectionAlert
            type="coaster"
            title="Coaster is OFF"
            message="Please connect your Coaster"
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

      {!monitor.state.ble.isConnected && (
        <ConnectionAlert
          type="bluetooth"
          title="Bluetooth is OFF"
          message="Please connect your bluetooth"
          onConnect={handleBluetoothConnect}
        />
      )}

      {!monitor.state.internet.isConnected && (
        <ConnectionAlert
          type="internet"
          title="Internet is OFF"
          message="Please connect your internet"
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
    backgroundColor: "#f59e0b",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginHorizontal: 16,
  },
  reconnectingText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
