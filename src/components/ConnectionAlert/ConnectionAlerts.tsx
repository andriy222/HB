import React, { useEffect } from "react";
import { View, StyleSheet, Alert, Linking, Text } from "react-native";
import { useRouter } from "expo-router";
import { useConnectionStore } from "../../store/connectionStore";
import ConnectionAlert from "./ConnectionAlert";

export default function ConnectionAlerts() {
  const router = useRouter();

  // Subscribe directly to primitive values for reliable updates
  const bleIsConnected = useConnectionStore((state) => state.ble.isConnected);
  const bleIsReconnecting = useConnectionStore((state) => state.ble.isReconnecting);
  const internetIsConnected = useConnectionStore((state) => state.internet.isConnected);
  const coasterIsConnected = useConnectionStore((state) => state.coaster.isConnected);

  // Debug logging
  useEffect(() => {
    console.log('🔔 ConnectionAlerts render - Internet:', internetIsConnected, 'BLE:', bleIsConnected, 'Coaster:', coasterIsConnected);
  }, [internetIsConnected, bleIsConnected, coasterIsConnected]);

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

  const hasIssues = !coasterIsConnected || !bleIsConnected || !internetIsConnected;

  if (!hasIssues) {
    return null;
  }

  return (
    <View style={styles.container}>
      {!coasterIsConnected && (
        <View>
          <ConnectionAlert
            type="coaster"
            title="Coaster is OFF"
            message="Please connect your Coaster"
            onConnect={handleCoasterConnect}
          />
          {bleIsReconnecting && (
            <View style={styles.reconnectingBanner}>
              <Text style={styles.reconnectingText}>
                🔄 Переконнект до Bluetooth...
              </Text>
            </View>
          )}
        </View>
      )}

      {!bleIsConnected && (
        <ConnectionAlert
          type="bluetooth"
          title="Bluetooth is OFF"
          message="Please connect your bluetooth"
          onConnect={handleBluetoothConnect}
        />
      )}

      {!internetIsConnected && (
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
