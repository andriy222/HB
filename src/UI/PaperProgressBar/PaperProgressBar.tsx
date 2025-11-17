import { ProgressBar } from "react-native-paper";
import { Dimensions, StyleSheet, View } from "react-native";
import { colors } from "../../theme";
const { width } = Dimensions.get("window");

const PaperProgressBar = () => (
  <View style={styles.progressContainer}>
    <ProgressBar style={styles.progress} progress={1} color={colors.progress} />

    <View></View>
  </View>
);

const styles = StyleSheet.create({
  progressContainer: {
    width: width * 0.5,
    height: 20,
  },
  progress: {
    width: "100%",
    height: "100%",
    borderWidth: 2,
    borderColor: colors.border.progress,
    borderRadius: 12,
  },
});
export default PaperProgressBar;
