
import { Dimensions, StyleSheet } from "react-native";
import { colors, textPresets } from "../../../theme";

const { height } = Dimensions.get("window");

export const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  titleContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: height * 0.08,
  },
  title: {
    ...textPresets.logo,
    color: colors.black,
  },
  titleContainerSecondary: {
    alignItems: "center",
    justifyContent: "center",
  },
  titleSecondary: {
    ...textPresets.titleSecondary,
  },
  subTitleSecondary: {
    ...textPresets.subTitleSecondary,
  },
  titlePurple: {
    color: colors.logoColor,
  },
  contentContainer: {
    width: "100%",
  },
});