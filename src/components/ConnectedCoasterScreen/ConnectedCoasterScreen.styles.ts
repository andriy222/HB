import { StyleSheet } from "react-native";
import { colors } from "../../theme";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 20,
  },
  titleSection: {
    flex: 0.15,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 32,
  },
  imageSection: {
    flex: 0.5,
    justifyContent: "center",
    alignItems: "center",
  },
  coasterImage: {
    width: "70%",
    height: "100%",
  },
  statusSection: {
    flex: 0.15,
    justifyContent: "center",
    alignItems: "center",
  },
  progressDots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.black,
  },
  buttonSection: {
    flex: 0.1,
    justifyContent: "center",
    alignItems:"center"
  },
  successCircle: {
    width: 56.9,
    height: 56.9,
    borderRadius: 31.5,
    borderWidth: 4,
    borderColor: colors.black,
    backgroundColor: colors.successDot,
    alignItems: "center",
    justifyContent: "center",
  },
});