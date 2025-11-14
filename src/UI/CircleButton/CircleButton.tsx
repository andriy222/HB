import React from "react";
import { Pressable } from "react-native";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { colors } from "../../theme";
import { styles } from "./CircleButton.styles";

interface CircleButtonProps {
  direction?: "left" | "right" | "close";
  onPress: () => void;
  disabled?: boolean;
}

export default function CircleButton({
  direction = "left",
  onPress,
  disabled = false,
}: CircleButtonProps) {
  const Icon =
    direction === "left"
      ? ChevronLeft
      : direction === "right"
      ? ChevronRight
      : X;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Icon
        size={28}
        color={disabled ? colors.text.gray : colors.black}
        strokeWidth={2.5}
      />
    </Pressable>
  );
}
