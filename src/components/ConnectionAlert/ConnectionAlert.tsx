import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { BluetoothOff, WifiOff, CircleOff } from "lucide-react-native";
import { colors } from "../../theme";

type AlertType = "coaster" | "bluetooth" | "internet";
const { width } = Dimensions.get("window");
interface ConnectionAlertProps {
  type: AlertType;
  title: string;
  message: string;
  onConnect: () => void;
}

const getIcon = (type: AlertType) => {
  switch (type) {
    case "coaster":
      return CircleOff;
    case "bluetooth":
      return BluetoothOff;
    case "internet":
      return WifiOff;
  }
};

export default function ConnectionAlert({
  type,
  title,
  message,
  onConnect,
}: ConnectionAlertProps) {
  const Icon = getIcon(type);

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Icon size={32} color={colors.black} strokeWidth={2} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={onConnect}>
        <Text style={styles.buttonText}>Connect</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "absolute",
    backgroundColor: "#FFFFFF4F",
    borderRadius: 32,
    left: 20,
    borderWidth: 2,
    borderColor: colors.black,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    zIndex: 3,
    width: width * 0.9,
    height: 62,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.black,
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  button: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.black,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.black,
  },
});
