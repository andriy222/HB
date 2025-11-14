import { colors, textPresets } from "../../theme";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    labelBox: {
        width: 299,
        height: 49,
        opacity: 1,
        borderRadius: 24.5,
        borderWidth: 2,
        borderColor: colors.border.default,
        backgroundColor: colors.labelBG,
        justifyContent: "center",
        alignItems: "center",
    },
    labelText: {
        ...textPresets.labelText,
        color: colors.text.primary,
        textAlign: "center",
    }
});