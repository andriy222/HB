import React, { useState } from "react";
import { View, Image, Alert } from "react-native";
import { Text } from "react-native-paper";
import PaperButton from "../../UI/PaperButton/PaperButton";
import { styles } from "./ConnectedCoasterScreen.styles";
import { useBleScan } from "../../hooks/useScanDevices";
import { usePermissions } from "../../hooks/usePermissions";
import { useBleScanWithMock } from "../../hooks/MockBleProvider/useBleScanWithMock";
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
  const { startScan, devices, connectToDevice, stopScan } =
    useBleScanWithMock();
  const { hasPermission, request } = usePermissions();
  const handleConnect = async () => {
    // Перевірити дозволи
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

    setConnectionState("scanning");

    // Почати сканування
    startScan();

    // Почекати для знаходження пристроїв
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Зупинити сканування
    stopScan();

    logger.info("Found devices:", devices.length, devices);

    // Перевірити чи знайшли пристрій
    if (!devices || devices.length === 0) {
      Alert.alert(
        "Device Not Found",
        "Could not find Hybit coaster. Make sure it's powered on and in pairing mode (press Bluetooth button for 3 seconds).",
        [{ text: "OK", onPress: () => setConnectionState("idle") }]
      );
      return;
    }
    const firstDevice = devices[0];
    if (!firstDevice?.id) {
      Alert.alert("Error", "Device ID not found", [
        { text: "OK", onPress: () => setConnectionState("idle") },
      ]);
      return;
    }

    setConnectionState("connecting");

    Alert.alert(
      "Bluetooth Pairing Request",
      `"${
        firstDevice.name || "Hybit coaster"
      }" would like to pair with your iPhone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            setConnectionState("idle");
          },
        },
        {
          text: "Pair",

          onPress: async () => {
            if (!firstDevice.id) {
              throw new Error("Device ID is missing");
            }
            try {
              logger.info("Connecting to device:", firstDevice.id);

              const device = await connectToDevice(firstDevice.id);

              if (device) {
                logger.info("Connected successfully:", device.id);
                setConnectionState("success");

                setTimeout(() => {
                  onConnect();
                }, 2000);
              } else {
                throw new Error("Connection returned null");
              }
            } catch (error) {
              logger.error("Connection error:", error);
              Alert.alert(
                "Connection Failed",
                "Could not connect to the device. Please try again.",
                [{ text: "OK", onPress: () => setConnectionState("idle") }]
              );
              setConnectionState("idle");
            }
          },
        },
      ]
    );
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

        {connectionState === "scanning" && <View style={styles.dot} />}

        {connectionState === "success" && <View style={styles.successCircle} />}
      </View>
    </View>
  );
}
