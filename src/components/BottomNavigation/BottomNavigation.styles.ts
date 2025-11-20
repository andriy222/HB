import { StyleSheet } from "react-native";
import { colors } from "../../theme";

export const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    position: "absolute",
    bottom: -20,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: colors.transparent, 
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
});