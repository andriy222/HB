import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus/useOnboardingStatus";
import { logger } from "../utils/logger";
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
        logger.info("👋 First time, going to /welcome");
        router.replace("/welcome");
      } else {
        logger.info("🏠 Redirecting to", nextRoute);
        router.replace(nextRoute);
      }
    } catch (error) {
      logger.error("Error checking route:", error);
      router.replace("/welcome");
    }
  };

  return null;
}

