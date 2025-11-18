import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus/useOnboardingStatus";
export default function Index() {
  const router = useRouter()
  const { nextRoute, isComplete } = useOnboardingStatus();

  useEffect(() => {
    checkInitialRoute();
  }, [nextRoute]);

  const checkInitialRoute = async () => {
    try {
      if (isComplete) {
        console.log("🏠 Redirecting to", nextRoute);
        router.replace(nextRoute);
      } else {
        console.log("👋 First time or incomplete onboarding, going to", nextRoute);
        router.replace(nextRoute);
      }
    } catch (error) {
      console.error("Error checking route:", error);
      router.replace("/welcome");
    }
  };

  return null;
}

