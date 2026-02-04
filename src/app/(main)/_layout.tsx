import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="coaster/index" />
      <Stack.Screen name="race/index" />
      <Stack.Screen name="test-ble/index" />
    </Stack>
  );
}
