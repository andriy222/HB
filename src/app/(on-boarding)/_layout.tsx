import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="choose/index" />
      <Stack.Screen name="start/index" />
    </Stack>
  );
}
