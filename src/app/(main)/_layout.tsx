import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="coaster" />
      <Stack.Screen name="race" />
      <Stack.Screen name="test-ble" />
    </Stack>
  );
}
