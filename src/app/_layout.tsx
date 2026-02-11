import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
} from '@expo-google-fonts/sora';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { colors, fontConfig } from '../theme';
import SplashScreen from '../UI/layout/SplashScreen/SplashScreen';
import { logger } from '../utils/logger';
import { initSentry } from '../utils/sentry';

// Initialize Sentry as early as possible
initSentry("https://421ae2812236ac7533a9a98f6c5a5eae@o4510822396264448.ingest.de.sentry.io/4510869647130704");

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    error: colors.error,
    background: colors.white,
    surface: colors.white,
  },
  fonts: fontConfig,
};

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    async function prepare() {
      try {
        if (fontsLoaded || fontError) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          setIsAppReady(true);
          await ExpoSplashScreen.hideAsync();
        }
      } catch (e) {
        logger.warn(e);
      }
    }

    prepare();
  }, [fontsLoaded, fontError]);

  if (!isAppReady) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="(on-boarding)" />
          <Stack.Screen name="(main)" />
        </Stack>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
