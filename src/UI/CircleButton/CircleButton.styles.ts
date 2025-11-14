import { colors } from "../../theme";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  button: {
    width: 39,
    height: 39,
    borderRadius: 23,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  disabled: {
    opacity: 0.4,
  },
});
