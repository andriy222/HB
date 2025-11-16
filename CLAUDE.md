# CLAUDE.md - HyBit Test Application

## Project Overview

**HyBit Test** is a React Native mobile application built with Expo that connects to Bluetooth Low Energy (BLE) devices, specifically targeting the "Hybit NeuraFlow" device. The app features sprite-based character animations and an onboarding flow for device pairing.

### Tech Stack

- **Framework**: React Native 0.81.4 with Expo SDK ~54.0.12
- **Language**: TypeScript (strict mode enabled)
- **Routing**: Expo Router ~6.0.14 (file-based routing)
- **State Management**: Zustand ~5.0.8
- **UI Library**: React Native Paper ~5.14.5
- **BLE**: react-native-ble-plx ~3.5.0
- **Storage**:
  - AsyncStorage (primary)
  - MMKV (available but not actively used)
- **Fonts**:
  - Sora (400, 500, 600, 700)
  - Inter (400, 500, 600, 700)
- **Icons**: Lucide React Native

### Key Features

1. **Bluetooth Device Management**: Scan, connect, and maintain connections to BLE devices
2. **Sprite-based Animations**: Custom sprite animator using Aseprite JSON format
3. **Character System**: Male/Female avatar selection with multiple animation states
4. **Auto-reconnection**: Automatic reconnection to last connected device
5. **Onboarding Flow**: First-time user experience with avatar selection

---

## Directory Structure

```
/home/user/HB/
├── assets/                          # Static assets
│   ├── exported_animations/         # Sprite animations (Aseprite format)
│   │   ├── male/                   # Male character animations
│   │   └── female/                 # Female character animations
│   ├── icons/                      # SVG icons
│   └── images/                     # Static images
├── src/
│   ├── app/                        # Expo Router pages (file-based routing)
│   │   ├── (on-boarding)/         # Onboarding route group
│   │   │   ├── choose/            # Avatar selection screen
│   │   │   └── start/             # Start screen
│   │   ├── welcome/               # Welcome screen
│   │   ├── main/                  # Main app screen
│   │   ├── _layout.tsx            # Root layout (providers, fonts)
│   │   └── index.ts               # Entry route (redirects)
│   ├── components/                # Feature components
│   │   ├── AvatarSlider/          # Avatar selection slider
│   │   ├── ConnectedCoasterScreen/ # BLE connection screen
│   │   ├── Podium/                # Podium display component
│   │   ├── SpriteAnimator/        # Sprite animation engine
│   │   └── StayConnectedScreen/   # Connection status screen
│   ├── UI/                        # Reusable UI components
│   │   ├── CircleButton/
│   │   ├── ConnectionModal/
│   │   ├── Label/
│   │   ├── PaperButton/
│   │   └── layout/                # Layout components
│   │       ├── SplashScreen/
│   │       └── backgrounds/
│   ├── hooks/                     # Custom React hooks
│   │   ├── MockBleProvider/       # BLE mock provider for testing
│   │   ├── useBleScanWithMock.ts
│   │   ├── usePermissions.tsx     # Permission handling
│   │   └── useScanDevices.tsx     # BLE scanning logic
│   ├── storage/                   # Storage utilities
│   │   └── appStorage.ts          # AsyncStorage wrapper
│   ├── store/                     # Zustand stores
│   │   └── bleStore.ts            # BLE state management
│   ├── theme/                     # Theming system
│   │   ├── colors.ts              # Color palette
│   │   ├── typography.ts          # Font definitions
│   │   ├── fontConfig.ts          # React Native Paper font config
│   │   ├── textPresets.ts         # Text style presets
│   │   ├── mixins.ts              # Reusable style mixins
│   │   └── index.ts               # Theme exports
│   └── utils/                     # Utility functions
│       ├── constants.ts           # App constants
│       └── storage.ts             # Storage helpers
├── app.json                       # Expo configuration
├── eas.json                       # EAS Build configuration
├── package.json
├── tsconfig.json
└── index.ts                       # App entry point

```

---

## Architecture Patterns

### 1. Routing (Expo Router)

The app uses **file-based routing** with Expo Router:

- Routes are defined by file structure in `src/app/`
- Groups use parentheses: `(on-boarding)` (doesn't affect URL)
- `_layout.tsx` files define layouts for route segments
- `index.ts` or `index.tsx` files are index routes

**Route Flow:**
```
src/app/index.ts (checks first-time)
  → /welcome
  → /(on-boarding)/choose
  → /(on-boarding)/start
  → /main
```

### 2. Component Structure

Components follow a **co-location pattern**:

```
ComponentName/
├── ComponentName.tsx          # Main component
└── ComponentName.styles.ts    # StyleSheet definitions
```

**Example:**
```typescript
// Component file
import { styles } from './ComponentName.styles';

export default function ComponentName() {
  return <View style={styles.container}>...</View>;
}

// Styles file
import { StyleSheet } from 'react-native';
import { colors, typography } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
});
```

### 3. State Management

**Zustand Store Pattern:**

```typescript
// src/store/someStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StoreState {
  // State properties
  someValue: string;

  // Actions
  setSomeValue: (value: string) => void;
  reset: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      someValue: '',

      setSomeValue: (value) => set({ someValue: value }),
      reset: () => set({ someValue: '' }),
    }),
    {
      name: 'store-name',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

**Usage:**
```typescript
const { someValue, setSomeValue } = useStore();
```

### 4. Storage Pattern

**Two storage layers:**

1. **Generic Storage** (`storage` object in `appStorage.ts`)
   - Generic `setItem`, `getItem`, `removeItem` operations
   - Handles JSON serialization automatically

2. **App-Specific Storage** (`appStorage` object)
   - Domain-specific operations (e.g., `isFirstTime()`, `setNotFirstTime()`)
   - Uses generic storage internally

**Example:**
```typescript
import { appStorage, STORAGE_KEYS } from '../storage/appStorage';

// App-specific
const isFirstTime = await appStorage.isFirstTime();
await appStorage.setNotFirstTime();

// Generic
await storage.setItem(STORAGE_KEYS.USER_DATA, userData);
const userData = await storage.getItem<UserData>(STORAGE_KEYS.USER_DATA);
```

### 5. Bluetooth (BLE) Architecture

**Key Hook:** `useScanDevices.tsx` (or `useBleScan`)

**BLE Flow:**
```
1. Initialize BleManager
2. Start scanning for devices
   - Filter by name: "Hybit NeuraFlow"
   - Filter by service UUID: "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
3. Connect to device
4. Discover services/characteristics
5. Monitor disconnection
6. Auto-reconnect on unexpected drops (up to 3 attempts with exponential backoff)
```

**Key States:**
- `devices`: Array of discovered devices
- `isScanning`: Scanning state
- `connectedDevice`: Currently connected device
- `linkUp`: BLE link established
- `isConnecting`: Connection in progress
- `isReconnecting`: Auto-reconnection in progress

**Important:** Uses `setLastDeviceId()` to persist last connected device for auto-reconnect on app restart.

---

## Theming System

### Colors (`src/theme/colors.ts`)

```typescript
colors.primary         // #C4B2F9 (lavender)
colors.logoColor       // #7657CE (purple)
colors.white           // #FFFFFF
colors.black           // #000000
colors.text.primary    // Main text color
colors.text.secondary  // Secondary text
colors.error           // #FF0000
colors.success         // #04B100
```

### Typography (`src/theme/typography.ts`)

**Font Families:**
- **Sora**: Primary UI font (regular, medium, semiBold, bold)
- **Inter**: Secondary font (regular, medium, semiBold, bold)

**Font Sizes:**
```typescript
xs: 10, sm: 12, md: 14, base: 16, lg: 18, xl: 20
'2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48
```

**Usage:**
```typescript
import { colors, typography } from '../theme';

const styles = StyleSheet.create({
  title: {
    fontFamily: typography.fontFamily.sora.bold,
    fontSize: typography.fontSize['2xl'],
    color: colors.text.primary,
  },
});
```

### React Native Paper Theme

Theme configuration in `src/app/_layout.tsx`:
```typescript
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
```

---

## Animation System

### Sprite Animator

The app uses a custom sprite animator (`src/components/SpriteAnimator/SpriteAnimator.tsx`) that plays **Aseprite** exported sprite sheets.

**Aseprite JSON Format:**
```typescript
interface AsepriteJSON {
  frames: Array<{
    filename: string;
    frame: { x: number; y: number; w: number; h: number };
    duration: number;
  }>;
  meta: {
    size: { w: number; h: number };
  };
}
```

**Usage:**
```typescript
import SpriteAnimator from '../components/SpriteAnimator/SpriteAnimator';
import { MALE, FEMALE } from '../utils/constants';

<SpriteAnimator
  source={MALE.frontPoseSprite}
  spriteData={MALE.frontPoseData}
  size={200}
  loop={true}
/>
```

**Animation States:**
- Standing (normal, frontal pose)
- Running (normal, tired)
- Tired (standing, running)
- Exhausted (standing, to tired)
- Transitions between states

**Assets Location:** `assets/exported_animations/[male|female]/[State_Name]/`

---

## Development Workflows

### Scripts

```bash
npm start              # Start Expo development server
npm run android        # Run on Android
npm run ios            # Run on iOS
npm run web            # Run on web
npm run tunnel         # Start with tunnel (for physical devices)
npm run update-ios     # Update iOS app via EAS
```

### EAS Build Configuration

**Build Profiles** (`eas.json`):
- **development**: Dev client with internal distribution
- **preview**: Internal distribution (TestFlight/App Tester)
- **production**: Production build with auto-increment

**Build Commands:**
```bash
eas build --profile development
eas build --profile preview
eas build --profile production
```

### TypeScript Configuration

- **Strict mode enabled** (`tsconfig.json`)
- Extends Expo's base TypeScript config
- All code should be type-safe

---

## Permissions

### iOS (`app.json`)

```json
"infoPlist": {
  "NSBluetoothAlwaysUsageDescription": "This app uses Bluetooth to connect to your device.",
  "UIBackgroundModes": ["bluetooth-central"]
}
```

### Android (`app.json`)

```json
"permissions": [
  "BLUETOOTH",
  "BLUETOOTH_ADMIN",
  "BLUETOOTH_SCAN",
  "BLUETOOTH_CONNECT",
  "ACCESS_FINE_LOCATION"
]
```

**Permission Handling:** See `src/hooks/usePermissions.tsx`

---

## Conventions for AI Assistants

### Code Style

1. **TypeScript**: Always use strict TypeScript with proper typing
   ```typescript
   // Good
   interface Props {
     title: string;
     onPress: () => void;
   }

   // Avoid
   const props: any = { ... };
   ```

2. **Functional Components**: Use functional components with hooks
   ```typescript
   export default function ComponentName({ prop1, prop2 }: Props) {
     const [state, setState] = useState<Type>(initialValue);
     return <View>...</View>;
   }
   ```

3. **Imports**: Group imports logically
   ```typescript
   // React & React Native
   import React, { useState, useEffect } from 'react';
   import { View, Text, StyleSheet } from 'react-native';

   // Third-party libraries
   import { useRouter } from 'expo-router';

   // Local imports
   import { colors, typography } from '../theme';
   import { styles } from './Component.styles';
   ```

4. **Styles**: Keep styles in separate `.styles.ts` files
   - Use theme values (colors, typography)
   - Avoid magic numbers (use theme spacing/sizes)

5. **Naming Conventions**:
   - **Components**: PascalCase (`UserProfile.tsx`)
   - **Hooks**: camelCase with "use" prefix (`useBleScan.tsx`)
   - **Constants**: UPPER_SNAKE_CASE (`TARGET_SERVICE`)
   - **Variables/Functions**: camelCase (`handlePress`, `isLoading`)

### File Organization

1. **New Components**: Create in appropriate directory:
   - UI components → `src/UI/ComponentName/`
   - Feature components → `src/components/ComponentName/`
   - Include both `.tsx` and `.styles.ts` files

2. **New Routes**: Add to `src/app/` following Expo Router conventions
   - Use route groups `(group-name)` for logical grouping
   - Always include `_layout.tsx` if needed

3. **New Hooks**: Add to `src/hooks/`
   - Name with `use` prefix
   - Document hook purpose and return values

4. **State Management**:
   - Global state → Zustand store in `src/store/`
   - Persistent data → Use AsyncStorage via `src/storage/appStorage.ts`
   - Component state → `useState` hook

### BLE Development

1. **Target Device**: "Hybit NeuraFlow"
2. **Service UUID**: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
3. **Connection Flow**:
   - Always stop scanning before connecting
   - Use timeout wrapper for Android (10s)
   - Verify service exists after connection
   - Persist device ID for auto-reconnect

4. **Auto-Reconnect**:
   - Max 3 attempts with exponential backoff
   - Only on unexpected disconnections
   - Clear device ID on user-initiated disconnect

### Common Patterns

**1. Navigation:**
```typescript
import { useRouter } from 'expo-router';

const router = useRouter();
router.push('/route-name');
router.replace('/route-name');
```

**2. Storage:**
```typescript
import { appStorage } from '../storage/appStorage';

const isFirstTime = await appStorage.isFirstTime();
await appStorage.setNotFirstTime();
```

**3. Theming:**
```typescript
import { colors, typography } from '../theme';

const styles = StyleSheet.create({
  text: {
    color: colors.text.primary,
    fontFamily: typography.fontFamily.sora.regular,
    fontSize: typography.fontSize.base,
  },
});
```

**4. BLE Operations:**
```typescript
const {
  devices,
  isScanning,
  connectedDevice,
  linkUp,
  startScan,
  connectToDevice,
  disconnect,
} = useBleScan();

// Start scanning
startScan();

// Connect to device
await connectToDevice(device.id);

// Disconnect
await disconnect();
```

---

## Testing & Debugging

### Mock BLE Provider

For testing without physical devices:
- `src/hooks/MockBleProvider/MockBleProvider.tsx`
- `src/hooks/MockBleProvider/useBleScanWithMock.ts`

**Usage:** Wrap app with `MockBleProvider` for testing

### Logging

- Console logs are used throughout for debugging
- BLE operations log connection/disconnection events
- Error handling with try/catch blocks

---

## Important Notes

### 1. BLE Connection Stability

- **Android**: Uses `autoConnect: true` option
- **Connection timeout**: 10 seconds (handled in JS to avoid native crashes)
- **Auto-reconnect**: Up to 3 attempts with exponential backoff (1s, 2s, 4s)
- **Persistence**: Last device ID saved for app restart reconnection

### 2. Font Loading

- Fonts are loaded in `_layout.tsx`
- App shows `SplashScreen` until fonts load (minimum 2 seconds)
- Uses Expo Google Fonts packages

### 3. Splash Screen Behavior

- Custom splash screen component
- Minimum display time: 2 seconds
- Waits for fonts to load before hiding

### 4. Platform-Specific Code

When needed, use:
```typescript
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  // Android-specific code
} else if (Platform.OS === 'ios') {
  // iOS-specific code
}
```

### 5. Storage Migration

Note: Code includes commented-out MMKV implementation in `bleStore.ts`. Currently using AsyncStorage for persistence. If switching to MMKV, uncomment that section.

---

## Deployment

### EAS Updates

For iOS OTA updates:
```bash
npm run update-ios
# or
eas update --branch production
```

### Build Version

- **Auto-increment**: Enabled for production builds
- **Version source**: Remote (appVersionSource: "remote")
- **Runtime version policy**: "appVersion"

### Project Identifiers

- **EAS Project ID**: `b4f1d2b2-877e-408f-b345-5635f69c30ce`
- **iOS Bundle ID**: `com.d.yuhymenko.hybittest`
- **Android Package**: `com.d.yuhymenko.hybittest`

---

## Quick Reference

### Adding a New Screen

1. Create route file: `src/app/new-screen/index.tsx`
2. Create component with styles
3. Add navigation from existing screen
4. Update `_layout.tsx` if needed

### Adding a New UI Component

1. Create directory: `src/UI/ComponentName/`
2. Create files:
   - `ComponentName.tsx`
   - `ComponentName.styles.ts`
3. Export from component file
4. Use in screens

### Adding BLE Functionality

1. Extend `useScanDevices.tsx` hook
2. Add new characteristics/services if needed
3. Update connection logic if required
4. Test with mock provider first

### Updating Theme

1. Add colors to `src/theme/colors.ts`
2. Add typography settings to `src/theme/typography.ts`
3. Update Paper theme in `_layout.tsx` if needed
4. Use new theme values in components

---

## Troubleshooting

### BLE Connection Issues

- **Check permissions**: Verify Bluetooth permissions are granted
- **Check device name**: Ensure device broadcasts "Hybit NeuraFlow"
- **Check service UUID**: Verify device has Nordic UART service
- **Android timeout**: Uses custom timeout to prevent native crashes
- **Auto-reconnect**: May take up to 30 seconds (3 attempts with backoff)

### Font Loading Issues

- Ensure fonts are loaded before rendering (handled in `_layout.tsx`)
- Check Expo Google Fonts installation
- Verify font names match typography definitions

### Routing Issues

- Check file structure in `src/app/`
- Verify `_layout.tsx` stack screen names
- Use proper navigation methods (`push`, `replace`, `back`)

---

## Resources

- **Expo Documentation**: https://docs.expo.dev/
- **Expo Router**: https://docs.expo.dev/router/introduction/
- **React Native Paper**: https://callstack.github.io/react-native-paper/
- **Zustand**: https://github.com/pmndrs/zustand
- **React Native BLE PLX**: https://github.com/dotintent/react-native-ble-plx

---

**Last Updated**: 2025-11-16
**Version**: 1.0.0
**Maintained for**: AI Assistants (Claude, etc.)
