import { useEffect } from "react";
import { appStorage } from "../storage/appStorage";
import { useRouter } from "expo-router";
export default function Index() {
  const router = useRouter()

  useEffect(() => {
    checkInitialRoute();
  }, []);

  const checkInitialRoute = async () => {
    try {
      const isFirstTime = await appStorage.isFirstTime();

      //   const token = await authStorage.getToken();

      if (isFirstTime) {
        await appStorage.setNotFirstTime();
        router.replace("");
      } else {
        // router.replace("/(auth)/login");
        router.replace("/welcome");
      }
    } catch (error) {
      console.error("Error checking initial route:", error);
      router.replace("/welcome")
    }
  };
}
