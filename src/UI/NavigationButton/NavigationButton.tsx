import React from "react";
import { Pressable, View } from "react-native";
import { LucideIcon } from "lucide-react-native";
import { colors } from "../../theme";
import { styles } from "./NavigationButton.style";

interface NavigationButtonProps {
  icon: LucideIcon;
  isActive?: boolean;
  onPress: () => void;
}

export default function NavigationButton({
  icon: Icon,
  isActive = false,
  onPress,
}: NavigationButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View style={[styles.iconContainer, isActive && styles.activeContainer]}>
        <Icon size={24} color={colors.black} strokeWidth={2} />
      </View>
    </Pressable>
  );
}
