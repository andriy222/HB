// components/BluetoothPairingModal/BluetoothPairingModal.tsx
import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Modal, Portal, Text } from "react-native-paper";
import { colors } from "../../theme";

interface BluetoothPairingModalProps {
  visible: boolean;
  onPair: () => void;
  onCancel: () => void;
  deviceName: string;
}

export default function BluetoothPairingModal({
  visible,
  onPair,
  onCancel,
  deviceName,
}: BluetoothPairingModalProps) {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onCancel}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Bluetooth Pairing Request</Text>

          <Text style={styles.message}>
            "{deviceName}" would like to pair with your iPhone.
          </Text>

          <View style={styles.buttonsRow}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable style={styles.pairButton} onPress={onPair}>
              <Text style={styles.pairText}>Pair</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    width: "80%",
    maxWidth: 320,
    backgroundColor: "#2C2C2E",
    borderRadius: 14,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.white,
    textAlign: "center",
  },
  message: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 18,
  },
  buttonsRow: {
    flexDirection: "row",
    marginTop: 8,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
  },
  pairButton: {
    flex: 1,
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 17,
    fontWeight: "400",
    color: "#0A84FF",
    textAlign: "center",
  },
  pairText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0A84FF",
    textAlign: "center",
  },
});
