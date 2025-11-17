import React from "react";
import { View, Text, Modal, StyleSheet, Dimensions } from "react-native";
import PaperButton from "../../UI/PaperButton/PaperButton";
import { textPresets } from "../../theme";

const { width } = Dimensions.get("window");

interface SessionResultProps {
  visible: boolean;
  distance: number;
  stamina: number;
  duration: number;
  isNewBest: boolean;
  onClose: () => void;
}

const SessionResult: React.FC<SessionResultProps> = ({
  visible,
  distance,
  stamina,
  duration,
  isNewBest,
  onClose,
}) => {
  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h}:${m.toString().padStart(2, "0")}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Гонка завершена!</Text>

          {isNewBest && (
            <Text style={styles.newBest}>🏆 Новий рекорд!</Text>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Дистанція:</Text>
              <Text style={styles.statValue}>{distance.toFixed(2)} км</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Стаміна:</Text>
              <Text style={styles.statValue}>{stamina} / 300</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Час:</Text>
              <Text style={styles.statValue}>{formatTime(duration)}</Text>
            </View>
          </View>

          <PaperButton
            onPress={onClose}
            variant="big"
            style={styles.button}
          >
            OK
          </PaperButton>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    width: width * 0.85,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    ...textPresets.progressText,
    fontSize: 28,
    marginBottom: 10,
  },
  newBest: {
    fontSize: 20,
    color: "#FFD700",
    fontWeight: "bold",
    marginBottom: 20,
  },
  statsContainer: {
    width: "100%",
    marginVertical: 20,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statLabel: {
    fontSize: 18,
    color: "#666",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  button: {
    width: 200,
    borderRadius: 32,
    marginTop: 10,
  },
});

export default SessionResult;
