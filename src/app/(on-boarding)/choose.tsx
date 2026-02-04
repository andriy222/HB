import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "react-native-paper";
import { useState, useEffect } from "react";
import AuthBackground from "../../UI/layout/backgrounds/AuthBackground";
import PaperButton from "../../UI/PaperButton/PaperButton";
import Label from "../../UI/Label/Label";
import { textPresets } from "../../theme";
import AvatarSlider from "../../components/AvatarSlider/AvatarSlider";
import {
  Gender,
  getSelectedGender,
  setSelectedGender,
} from "../../utils/storage";

export default function OnBoarding() {
  const router = useRouter();
  const [selectedGender, setGender] = useState<Gender>("male");

  useEffect(() => {
    getSelectedGender();
  }, []);

  const handleGenderChange = (gender: Gender) => {
    setGender(gender);
  };

  const handleContinue = () => {
    setSelectedGender(selectedGender);
    router.push("/(on-boarding)/start");
  };

  return (
    <AuthBackground isSecondary={false}>
      <View style={styles.container}>
        <View style={styles.textContent}>
          <Label />
          <Text style={styles.bdText}>
            Choose your avatar to join the community
          </Text>
        </View>

        <AvatarSlider
          initialGender={selectedGender}
          onGenderChange={handleGenderChange}
        />

        <PaperButton onPress={handleContinue}>Choose</PaperButton>
      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bdText: {
    ...textPresets.onBoardingBodyText,
  },
  textContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    gap: 20,
  },
});
