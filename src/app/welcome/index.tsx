import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import AuthBackground from "../../UI/layout/backgrounds/AuthBackground";
import PaperButton from "../../UI/PaperButton/PaperButton";

export default function Welcome() {
  const router = useRouter();

  const handleContinue = () => {
    router.push("/(on-boarding)/choose");
  };

  return (
    <AuthBackground isSecondary={true}>
      <View style={styles.container}>
        <PaperButton onPress={handleContinue} children="Continue" />
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
});
