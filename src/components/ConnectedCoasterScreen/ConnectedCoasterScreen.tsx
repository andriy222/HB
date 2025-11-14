import React, { useState } from "react";
import { View, Image, Alert } from "react-native";
import { Text } from "react-native-paper";
import PaperButton from "../../UI/PaperButton/PaperButton";
import { styles } from "./ConnectedCoasterScreen.styles";
import { useBleScan } from "../../hooks/useScanDevices";
import { usePermissions } from "../../hooks/usePermissions";

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
  const { startScan, devices, connectToDevice } = useBleScan();
  const { hasPermission, request } = usePermissions();

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

    setConnectionState("scanning");

    startScan();

    await new Promise((resolve) => setTimeout(resolve, 3000));

    if (devices.length === 0) {
      Alert.alert(
        "Device Not Found",
        "Could not find Hybit coaster. Make sure it's powered on and in pairing mode (press Bluetooth button for 3 seconds).",
        [{ text: "OK", onPress: () => setConnectionState("idle") }]
      );
      return;
    }

    setConnectionState("connecting");

    // Показати pairing request
    Alert.alert(
      "Bluetooth Pairing Request",
      '"Hybit coaster" would like to pair with your iPhone.',
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
            try {
              // Підключитися до першого знайденого пристрою
              const device = await connectToDevice(devices[0].id);

              if (device) {
                setConnectionState("success");

                // Перейти далі через 2 секунди
                setTimeout(() => {
                  onConnect();
                }, 2000);
              } else {
                throw new Error("Connection failed");
              }
            } catch (error) {
              console.error("Connection error:", error);
              Alert.alert(
                "Connection Failed",
                "Could not connect to the device. Please try again.",
                [{ text: "OK", onPress: () => setConnectionState("idle") }]
              );
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

        {connectionState === "connecting" && <View style={styles.dot} />}

        {connectionState === "success" && <View style={styles.successCircle} />}
      </View>
    </View>
  );
}
