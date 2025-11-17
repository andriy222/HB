import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus/useOnboardingStatus";
export default function Index() {
  const router = useRouter()
  const { nextRoute } = useOnboardingStatus();
  useEffect(() => {
    checkInitialRoute();
  }, []);

  const checkInitialRoute = async () => {
    try {
      const isFirstTime =  true
      if (isFirstTime) {
        console.log("👋 First time, going to /welcome");
        router.replace("/welcome");
      } else {
        console.log("🏠 Redirecting to", nextRoute);
        router.replace(nextRoute);
      }
    } catch (error) {
      console.error("Error checking route:", error);
      router.replace("/welcome");
    }
  };

  return null;
}

