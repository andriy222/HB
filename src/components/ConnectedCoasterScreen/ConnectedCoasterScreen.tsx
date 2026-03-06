import React, { useState, useEffect, useRef } from "react";
import { View, Image, Alert } from "react-native";
import { Text } from "react-native-paper";
import PaperButton from "../../UI/PaperButton/PaperButton";
import { styles } from "./ConnectedCoasterScreen.styles";
import { usePermissions } from "../../hooks/usePermissions";
import { useBle } from "../../providers/BleProvider";
import { logger } from "../../utils/logger";

const coasterImage = require("../../../assets/coaster.png");

type ConnectionState = "idle" | "scanning" | "connecting" | "success";

interface ConnectCoasterScreenProps {
  onConnect: () => void;
}

export default function ConnectCoasterScreen({
  onConnect,
}: ConnectCoasterScreenProps) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const {
    startScan,
    connectedDevice,
    linkUp,
    isConnecting,
    connectError,
    noTargetFound,
  } = useBle();
  const { hasPermission, request } = usePermissions();
  const onConnectCalledRef = useRef(false);
  // Track whether user initiated the connection (to ignore background auto-reconnect errors)
  const userInitiatedRef = useRef(false);

  // Auto-navigate when connected (from scan auto-connect or background auto-reconnect)
  useEffect(() => {
    if (linkUp && connectedDevice && !onConnectCalledRef.current) {
      onConnectCalledRef.current = true;
      logger.info("Connected successfully:", connectedDevice.id);
      setConnectionState("success");
      setTimeout(() => {
        onConnect();
      }, 2000);
    }
  }, [linkUp, connectedDevice, onConnect]);

  // Update connection state when BLE starts connecting
  useEffect(() => {
    if (isConnecting && connectionState === "scanning") {
      setConnectionState("connecting");
    }
  }, [isConnecting, connectionState]);

  // Handle scan timeout - no device found
  useEffect(() => {
    if (noTargetFound && connectionState === "scanning") {
      Alert.alert(
        "Device Not Found",
        "Could not find Hybit coaster. Make sure it's powered on and in pairing mode (press Bluetooth button for 3 seconds).",
        [{ text: "OK", onPress: () => setConnectionState("idle") }]
      );
    }
  }, [noTargetFound, connectionState]);

  // Handle connection errors (only for user-initiated connections)
  useEffect(() => {
    if (
      connectError &&
      userInitiatedRef.current &&
      (connectionState === "scanning" || connectionState === "connecting")
    ) {
      userInitiatedRef.current = false;
      Alert.alert(
        "Connection Failed",
        "Could not connect to the device. Please try again.",
        [{ text: "OK", onPress: () => setConnectionState("idle") }]
      );
    }
  }, [connectError, connectionState]);

  const handleConnect = async () => {
    if (!hasPermission) {
      const granted = await request();

      if (!granted) {
        Alert.alert(
          "Permissions Required",
          "Bluetooth permissions are required to connect to your coaster.",
          [{ text: "OK" }]
        );
        return;
      }
    }

    userInitiatedRef.current = true;
    setConnectionState("scanning");
    startScan();
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleSection}>
        <Text style={styles.title}>Please connect your{"\n"}hybit coaster</Text>
      </View>

      <View style={styles.imageSection}>
        <Image
          source={coasterImage}
          style={styles.coasterImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.buttonSection}>
        {connectionState === "idle" && (
          <PaperButton onPress={handleConnect} variant="primary">
            Connect
          </PaperButton>
        )}

        {(connectionState === "scanning" || connectionState === "connecting") && (
          <View style={styles.dot} />
        )}

        {connectionState === "success" && <View style={styles.successCircle} />}
      </View>
    </View>
  );
}
