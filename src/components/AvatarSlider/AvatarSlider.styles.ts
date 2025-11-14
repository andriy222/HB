import { StyleSheet, Dimensions } from "react-native";
import { colors } from "../../theme";
import { AVATAR_SIZE } from "../../utils/constants";

const { width, height } = Dimensions.get("window");

export const styles = StyleSheet.create({
  container: {
    width: width,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: height * 0.05,
    position: "relative",
  },
  avatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  leftButton: {
    position: "absolute",
    left: width * 0.05,
  },
  rightButton: {
    position: "absolute",
    right: width * 0.05,


  },
  headCircle: {
    position: "absolute",
    width: AVATAR_SIZE * 0.56,
    height: AVATAR_SIZE * 0.56,
    borderRadius: AVATAR_SIZE * 0.28,
    backgroundColor: colors.avatarBG.primary,
    top: -10 ,
  },
  footRingOuter: {
    position: "absolute",
    width: AVATAR_SIZE * 0.72, 
    height: AVATAR_SIZE * 0.17,
    borderRadius: AVATAR_SIZE * 0.36,
    backgroundColor: colors.avatarBG.secondary,
    bottom: -30,
  },
  footRingInner: {
    position: "absolute",
    width: AVATAR_SIZE * 0.44,
    height: AVATAR_SIZE * 0.09, 
    borderRadius: AVATAR_SIZE * 0.22,
    backgroundColor: colors.avatarBG.primary,
    bottom: -10,
    zIndex: 1,
  },
});