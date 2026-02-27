import { ProgressBar } from 'react-native-paper';
import { Dimensions, StyleSheet, View, Text } from 'react-native';
import { colors } from '../../theme';
const { width } = Dimensions.get('window');

interface PaperProgressBarProps {
  progress: number;
}
const PaperProgressBar = ({ progress }: PaperProgressBarProps) => (
  <View style={styles.progressContainer}>
    <ProgressBar
      style={styles.progress}
      progress={progress}
      color={colors.progress}
    />
    <View>
      <Text style={styles.progressText}>{progress} / 300</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  progressContainer: {
    position: 'relative',
    maxWidth: width * 0.5,
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: {
    maxWidth: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: colors.border.progress,
    borderRadius: 12,
  },
  progressText: {
    position: 'absolute',
    top: -6,
    left: 10,
    color: colors.border.progress,
  },
});
export default PaperProgressBar;
