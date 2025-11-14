import { View, StyleSheet, Dimensions } from "react-native";
import { colors } from "../../theme";
const { width } = Dimensions.get("window");
export default function Podium() {
  return (
    <View style={styles.container}>
      <View style={styles.whiteLine}></View>
      <View style={styles.whiteLineSecond}></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: width,
    height: 76,
    backgroundColor: colors.podium.primary,
  },
  whiteLine: {
    position: "absolute",
    top: 10,
    width: width,
    height: 8,
    backgroundColor: colors.podium.secondary,
  },
  whiteLineSecond: {
    position: "absolute",
    bottom: 10,
    width: width,
    height: 8,
    backgroundColor: colors.podium.secondary,
  },
});
