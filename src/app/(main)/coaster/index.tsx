import BottomNavigation from "../../../components/BottomNavigation/BottomNavigation";
import AuthBackground from "../../../UI/layout/backgrounds/AuthBackground";
import { Dimensions, StyleSheet, Text, View, Image } from "react-native";
import { colors, textPresets } from "../../../theme";
import { useConnectionStatus } from "../../../hooks/useConnectionStatus/useConectionStatus";

const { width, height } = Dimensions.get("window");
const coaster = require("../../../../assets/coaster.png");

const CoasterStatus = () => {
  const status = useConnectionStatus();
  const isConnected = status.coaster.isConnected;
  return (
    <AuthBackground isSecondary={false} footer={<BottomNavigation />}>
      <View style={styles.container}>
        <Text style={styles.coasterText}>Coaster</Text>
        <View style={styles.drawer} />
        <View style={styles.connectionCard}>
          <Text style={styles.coasterTextSecondary}>Coaster</Text>
          <View style={styles.containerConnection}>
            <View style={styles.imageContainer}>
              <Image
                source={coaster}
                style={styles.coasterImage}
                resizeMode="contain"
              />
            </View>
            <View
              style={[
                styles.label,
                {
                  backgroundColor: isConnected ? colors.success : colors.error,
                },
              ]}
            >
              <Text style={styles.connectionLabel}>
                {isConnected ? "Connected" : "Disconnected"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </AuthBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    flex: 1,
    width: width * 0.9,
    alignItems: "center",
    height: height * 0.5,
    gap: 10,
  },
  coasterText: {
    alignSelf: "flex-start",
    ...textPresets.coasterText,
  },
  connectionCard: {
    width: "100%",
    height: height * 0.3,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderColor: colors.black,
    borderWidth: 2,
    padding: 32,
  },
  drawer: {
    width: "100%",
    height: 2,
    backgroundColor: colors.black,
  },
  coasterTextSecondary: {
    ...textPresets.coasterTextSecondary,
  },
  imageContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  coasterImage: {
    width: 180,
    height: 200,
  },
  containerConnection: {
    flex: 1,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: width * 0.12,
  },
  label: {
    position: "relative",
    bottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 14.5,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 100,
  },
  connectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.white,
    textAlign: "center",
  },
});

export default CoasterStatus;
