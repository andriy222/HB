import React, { useState } from "react";
import { View } from "react-native";
import { Modal, Portal } from "react-native-paper";
import StayConnectedScreen from "../../components/StayConnectedScreen/StayConnectedScreen";
import ConnectCoasterScreen from "../../components/ConnectedCoasterScreen/ConnectedCoasterScreen";
import CircleButton from "../../UI/CircleButton/CircleButton";
import { styles } from "./ConnectionModal.styles";

interface ConnectionModalProps {
  visible: boolean;
  onDismiss: () => void;
  onComplete: () => void;
}

export default function ConnectionModal({
  visible,
  onDismiss,
  onComplete,
}: ConnectionModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep === 0) {
      setCurrentStep(1);
    } else {
      onComplete();
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleClose}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.container}>
          <View style={styles.closeButton}>
            <CircleButton direction="close" onPress={handleClose} />
          </View>

          <View style={styles.content}>
            {currentStep === 0 && <StayConnectedScreen onAccept={handleNext} />}
            {currentStep === 1 && (
              <ConnectCoasterScreen onConnect={handleNext} />
            )}
          </View>
        </View>
      </Modal>
    </Portal>
  );
}
