import React from "react";
import { Alert, View } from "react-native";
import { Text } from "react-native-paper";
import { Bluetooth, Droplet, Wifi } from "lucide-react-native";
import { colors } from "../../theme";
import PaperButton from "../../UI/PaperButton/PaperButton";
import { styles } from "./StayConnectedScreen.styles";
import { usePermissions } from "../../hooks/usePermissions";

interface StayConnectedScreenProps {
  onAccept: () => void;
}

export default function StayConnectedScreen({
  onAccept,
}: StayConnectedScreenProps) {
  const { hasPermission, request } = usePermissions();

  const handleAccept = async () => {
    if (!hasPermission) {
      const granted = await request();

      if (!granted) {
        Alert.alert(
          "Permissions Required",
          "Please enable Bluetooth permissions in Settings to continue.",
          [{ text: "OK" }]
        );
        return;
      }
    }

    onAccept();
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stay connected</Text>

      <View style={styles.iconsRow}>
        <View style={styles.iconCircle}>
          <Bluetooth size={32} color={colors.black} strokeWidth={2} />
        </View>
        <View style={styles.iconCircle}>
          <Droplet size={32} color={colors.black} strokeWidth={2} />
        </View>
        <View style={styles.iconCircle}>
          <Wifi size={32} color={colors.black} strokeWidth={2} />
        </View>
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.bodyText}>
          If you don't have Bluetooth, Internet or Coaster connected, the app
          won't be able to update or function properly.
        </Text>

        <Text style={styles.bodyText}>
          Please stay connected for the best experience with Hybit.
        </Text>
      </View>

      <PaperButton onPress={handleAccept} variant="primary">
        Accept
      </PaperButton>
    </View>
  );
}
