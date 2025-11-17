import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Droplet, Home, Users } from "lucide-react-native";
import { useRouter, usePathname } from "expo-router";
import NavigationButton from "../../UI/NavigationButton/NavigationButton";
import { styles } from "./BottomNavigation.styles";

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 12 }]}>
      <NavigationButton
        icon={Droplet}
        isActive={pathname.includes("/coaster")}
        onPress={() => router.push("/coaster")}
      />

      <NavigationButton
        icon={Home}
        isActive={pathname.includes("/race")}
        onPress={() => router.push("/(main)/race")}
      />

      <NavigationButton
        icon={Users}
        isActive={pathname.includes("/profile")}
        onPress={() => router.push("/profile")}
      />
    </View>
  );
}
