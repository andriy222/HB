import { StyleSheet } from "react-native";
import { colors, textPresets } from "../../theme";

export const styles = StyleSheet.create({
  container: {
    height: "100%",
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "space-around",
  },
  title: {
    ...textPresets.modalTitle,
  },
  iconsRow: {
    width: "70%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconCircle: {
    width: 45,
    height: 45,
    borderRadius: 32,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },

  textContainer: {
    gap: 16,
    marginBottom: 32,
  },
  bodyText: {
    ...textPresets.modalTextPrimary,
    textAlign: "center",
    lineHeight: 20,
  },
});
