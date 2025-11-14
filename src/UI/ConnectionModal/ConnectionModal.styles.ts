import { colors } from "../../theme";
import { StyleSheet, Dimensions } from "react-native";
const { width, height } = Dimensions.get("window");
export const styles = StyleSheet.create({
  modal: {
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    width: width * 0.9,
    height: height * 0.75,
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: colors.black,
    paddingHorizontal: 24,
    paddingVertical: 20,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  content: {
    flex: 1,
    paddingTop: 40,
  },
  textSection: {
    flex: 0.25,
    justifyContent: "center",
    alignItems: "center",
  },
});
