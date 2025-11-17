import { StyleSheet } from "react-native";
import { colors } from "../../theme";

export const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderBottomWidth: 4,
    borderLeftWidth: 4
  },
  activeContainer: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.black,
  },
});

