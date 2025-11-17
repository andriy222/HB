import { StyleSheet, Dimensions } from "react-native";
import { colors } from "../../theme";

const { width } = Dimensions.get("window");
export const styles = StyleSheet.create({
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
  mainContainer: {
    width: width,
    height: 200, 
  },
  raceWay: {
    right: width * 0.06,
    width: "100%",
    height: "100%",
  },
});
