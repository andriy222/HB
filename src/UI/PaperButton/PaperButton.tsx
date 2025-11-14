import React from "react";
import {
  Pressable,
  Text,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from "react-native";

import { styles } from "./PaperButton.styles";
import { colors } from "../../theme";

type ButtonVariant = "primary" | "secondary" | "outline" | "big";

interface ButtonProps {
  children: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  children,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? colors.black : colors.black}
        />
      ) : (
        <View style={variant === "big" && styles.textWrapper}>
          <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>
            {children}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
