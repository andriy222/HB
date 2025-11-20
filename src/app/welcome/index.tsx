import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import AuthBackground from "../../UI/layout/backgrounds/AuthBackground";
import PaperButton from "../../UI/PaperButton/PaperButton";
import { useOnboardingStatus } from "../../hooks/useOnboardingStatus/useOnboardingStatus";
import { logger } from "../../utils/logger";

export default function Welcome() {
  const router = useRouter();
  const { isComplete, nextRoute } = useOnboardingStatus();

  useEffect(() => {
    if (isComplete) {
      logger.info("✅ Onboarding complete, redirecting to", nextRoute);
      router.replace(nextRoute);
    }
  }, [isComplete, nextRoute]);

  const handleContinue = () => {
    logger.debug("▶️ Continue pressed, going to", nextRoute);
    router.push(nextRoute);
  };

  return (
    <AuthBackground isSecondary={true}>
      <View style={styles.container}>
        <PaperButton onPress={handleContinue}>Continue</PaperButton>
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
