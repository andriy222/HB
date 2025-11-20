import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus/useOnboardingStatus";
import { logger } from "../utils/logger";
export default function Index() {
  const router = useRouter()
  const { nextRoute, isComplete } = useOnboardingStatus();

  useEffect(() => {
    logger.info("🔍 Initial route check - isComplete:", isComplete, "nextRoute:", nextRoute);
    router.replace(nextRoute);
  }, [nextRoute]);

  return null;
}

