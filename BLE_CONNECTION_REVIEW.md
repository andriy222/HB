# BLE Connection Review — Hybit NeuraFlow

## Architecture Overview

```
BleProvider (React Context — single BleManager for entire app)
│
├── useScanDevices.ts          — BLE scanning, connecting, reconnecting
│   ├── onStateChange          — monitors BLE adapter (PoweredOn/Off)
│   ├── checkAlreadyConnected  — picks up OS-level bonded devices
│   ├── startScan              — scan + auto-connect on target found
│   ├── connectToDevice        — connect + service discovery + disconnect listener
│   └── scheduleReconnect      — exponential backoff (1s→2s→4s, max 3 attempts)
│
├── useBLEConnection.ts        — low-level RX/TX over Nordic UART Service
│   ├── subscribe              — monitorCharacteristicForService (RX)
│   ├── sendCommand            — writeCharacteristic (TX) with dedup
│   ├── handleLine             — line buffer → parse DL / BATT / forward to protocol
│   └── parseDLLine / parseBATTLine
│
├── useProtocolHandler.ts      — protocol state machine
│   ├── States: idle → requesting → receiving → idle → syncing → complete
│   ├── Handles: SDT, DL, END, ACK, ERR, BATT, READY
│   └── Idle timeout: 3s of no DL → auto-END
│
├── useCoasterSession.ts       — coordinator (BLE + protocol + session)
│   ├── startProtocolSequence  — GET BATT → 300ms → GET ALL
│   ├── sendGoalAndSync        — GOAL → wait ACK → SYNC → wait ACK
│   ├── keep-alive             — GET BATT every 20s
│   └── reconnect handling     — reset state, re-run protocol
│
├── useMasterCoordinator.ts    — top-level status + control
│
└── useBLEWrapper.tsx          — auto-switch real/mock BLE
```

## Connection Flow (Step by Step)

### 1. App Launch

```
BleProvider mounts
  └── useBleScan() initializes
        ├── new BleManager()
        ├── onStateChange(listener, emitCurrentState=true)
        │     └── if PoweredOn → setTimeout 1000ms → auto-reconnect to saved device
        └── checkAlreadyConnected()
              └── wait 500ms → check connectedDevices([NUS_UUID])
                    └── if found → set connectedDevice, linkUp=true, subscribe disconnect
```

### 2. User Presses "Connect"

```
ConnectedCoasterScreen.handleConnect()
  └── startScan()
        ├── startDeviceScan(null, null, callback)
        │     └── on each device:
        │           ├── name matches "Hybit NeuraFlow"? OR service UUID matches?
        │           └── YES → auto-connect immediately (no manual pairing dialog)
        │                 ├── stopDeviceScan()
        │                 └── connectToDevice(device.id)
        └── scanTimeout = 10s → noTargetFound if nothing found

ConnectedCoasterScreen watches linkUp via useEffect:
  └── linkUp && connectedDevice → setConnectionState("success") → onConnect()
```

### 3. connectToDevice(deviceId)

```
connectToDevice(deviceId)
  ├── isDeviceConnected(deviceId)? → skip if already connected
  ├── stopScan()
  ├── mgr.connectToDevice(deviceId, {autoConnect: true} on Android)
  │     └── JS-side timeout (10s) with cancelDeviceConnection on timeout
  ├── discoverAllServicesAndCharacteristics()
  ├── verify NUS service UUID exists
  ├── setConnectedDevice(ready), setLinkUp(true)
  ├── setLastDeviceId(deviceId) → MMKV persistence
  └── onDeviceDisconnected(deviceId, callback)
        └── if unexpected → scheduleReconnect(deviceId, 0)
```

### 4. Protocol Sequence (after connection)

```
useCoasterSession main connection handler useEffect
  triggers when: isConnected && device && ble.isReady

  ├── Initial connection:
  │     ├── session.start(gender) if no restored session
  │     └── waitingForReady = true
  │           ├── if READY arrives → startProtocolSequence()
  │           └── fallback 500ms timeout → startProtocolSequence()
  │
  └── Reconnect:
        ├── reset protocol state, seenIndices
        └── same READY / timeout → startProtocolSequence()

startProtocolSequence():
  1. GET BATT\r\n  → firmware responds: BATT <mV>
  2. wait 300ms     (firmware needs time to process)
  3. GET ALL\r\n   → firmware responds: SDT → [DL lines] → END

onDataComplete(count):
  4. wait 250ms (AUTO_SYNC_DELAY)
  5. GOAL 37 5\r\n → firmware responds: ACK

onGoalAck:
  6. SYNC YYMMDDhhmmss\r\n → firmware responds: ACK

onSyncAck:
  7. Protocol complete. Keep-alive continues (GET BATT every 20s).
```

### 5. Keep-Alive

```
setInterval every 20s → GET BATT\r\n
  └── firmware disconnects after 25s without messages
  └── BATT response parsed → batteryLevel state (mV → 0-100%)
```

### 6. Unexpected Disconnect

```
onDeviceDisconnected fires
  ├── setLinkUp(false)
  ├── setIsReconnecting(true)
  └── scheduleReconnect(deviceId, attempt=0)
        ├── attempt 0: wait 1s → connectToDevice
        ├── attempt 1: wait 2s → connectToDevice
        ├── attempt 2: wait 4s → connectToDevice
        └── max 3 attempts → give up, setIsReconnecting(false)
```

### 7. BLE Adapter State Change

```
onStateChange fires (e.g., user toggles Bluetooth)
  └── PoweredOn:
        └── setTimeout 1000ms:
              ├── skip if reconnectActive (ongoing reconnect sequence)
              └── getLastDeviceId() → connectToDevice(lastId)
```

## Data Flow (RX path)

```
BLE notification (base64 chunk)
  → base64Decode
  → append to lineBuffer
  → split by \r\n|\n|\r
  → for each complete line:
      ├── onLineReceived(line) → useProtocolHandler.handleProtocolLine()
      │     ├── SDT → state = receiving
      │     ├── DL  → dlCount++, reset idle timer (3s)
      │     ├── END → onDataComplete(count)
      │     ├── ACK → onGoalAck or onSyncAck (based on awaiting flags)
      │     ├── ERR → onError
      │     ├── BATT → no-op (handled below)
      │     └── READY → onDeviceReady
      │
      ├── parseDLLine → if new index → onDataReceived(index, ml, timestamp)
      └── parseBATTLine → setBatteryLevel(percentage)
```

## Data Flow (TX path)

```
sendCommand(command)
  ├── dedup check: same command within 500ms? → skip (return true)
  │     ├── global dedup (module-level, catches cross-instance)
  │     └── per-instance dedup (catches same hook rapid-fire)
  ├── base64Encode(command)
  ├── writeCharacteristicWithoutResponseForService (preferred for NUS)
  │     └── fallback: writeCharacteristicWithResponseForService
  └── return true/false
```

## Key Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| TARGET_NAME | "Hybit NeuraFlow" | Device name to match during scan |
| SERVICE_UUID | 6e400001-... | Nordic UART Service |
| RX_CHARACTERISTIC | 6e400003-... | Receive from device |
| TX_CHARACTERISTIC | 6e400002-... | Send to device |
| SCAN_DURATION | 10s | Scan timeout |
| CONNECTION_TIMEOUT | 10s | JS-side connect timeout |
| RECONNECT_INITIAL_DELAY | 1s | First reconnect delay |
| RECONNECT_MAX_DELAY | 30s | Max reconnect delay |
| MAX_RECONNECT_ATTEMPTS | 3 | Give up after 3 |
| BACKFILL_STABILIZATION_DELAY | 500ms | Wait before protocol after connect |
| PROTOCOL_IDLE_TIMEOUT | 3s | Auto-END if no DL for 3s |
| AUTO_SYNC_DELAY | 250ms | Delay before GOAL after END |
| KEEP_ALIVE_INTERVAL | 20s | GET BATT ping interval |
| COMMAND_DEDUP_WINDOW | 500ms | Dedup same command |
| COASTER_GOAL_ML | 37 | ml per 5min |
| COASTER_GOAL_INTERVAL_MIN | 5 | minutes per goal period |

## File Map

| File | Lines | Role |
|------|-------|------|
| `src/providers/BleProvider.tsx` | 83 | Context provider, real/mock switch |
| `src/hooks/useScanDevices.ts` | 418 | Scan, connect, reconnect, BLE state |
| `src/hooks/useBleConnection/useBleConnection.ts` | 312 | RX/TX, base64, line buffer, DL/BATT parse |
| `src/hooks/useBleConnection/useProtocolHandler.ts` | 199 | Protocol state machine |
| `src/hooks/useBleConnection/useCoasterSession.ts` | 469 | Coordinator: protocol + session |
| `src/hooks/useBleConnection/useMasterCoordinator.ts` | 96 | Top-level status |
| `src/hooks/useBleConnection/useSession.ts` | ~80 | Session state (stamina, distance) |
| `src/hooks/useBleConnection/useTimeSync.ts` | 189 | NTP time sync |
| `src/hooks/useBleConnection/useRecconectHandler.ts` | 131 | **DEAD CODE** — not imported anywhere |
| `src/hooks/MockBleProvider/useBleWrapper.tsx` | 59 | Real/mock BLE switch |
| `src/hooks/MockBleProvider/MockBleProvider.tsx` | ~80 | Mock scan |
| `src/hooks/MockBleProvider/useMockBle.tsx` | ~100 | Mock BLE connection |
| `src/hooks/MockBleProvider/MockCoaster.tsx` | ~80 | Mock device simulator |
| `src/constants/bleConstants.ts` | 82 | BLE config & timeouts |
| `src/constants/appConstants.ts` | 98 | Regex, validation, protocol commands |
| `src/constants/sessionConstants.ts` | ~40 | Session config, USE_MOCK_BLE flag |
| `src/utils/storage.ts` | 57 | MMKV storage (device ID, gender, goals) |
| `src/utils/base64.ts` | 136 | Base64 encode/decode with fallbacks |
| `src/store/connectionStore.ts` | 97 | Zustand store for connection states |

## Known Issues & Minor Bugs

### 1. BleProvider isSimulator logic (Medium)
**File**: `BleProvider.tsx:34-41`
```typescript
const isSimulator = Platform.OS === 'ios' ? (!__DEV__ ? false : true) : ...
```
`__DEV__` means development mode, NOT simulator. Physical iOS device in dev mode will use mock BLE instead of real BLE. Should use `expo-device` `isDevice` check or similar.

### 2. SYNC uses local time, not NTP (Medium)
**File**: `useCoasterSession.ts:152-170`

`sendTimeSync()` uses `new Date()` (phone local time). `useTimeSync` hook exists in `useMasterCoordinator` with NTP-corrected `formatForSync()`, but it's not wired to `useCoasterSession`. If phone clock has drift, device gets wrong time.

### 3. useReconnectHandler is dead code (Low)
**File**: `useRecconectHandler.ts` (131 lines)

This file is never imported. Its logic is duplicated in `useCoasterSession` (reconnect detection) and `useScanDevices` (reconnect scheduling). Safe to delete.

### 4. readyTimeoutRef not cleaned up on unmount (Low)
**File**: `useCoasterSession.ts:346-363`

The main connection handler useEffect does not return a cleanup function to clear `readyTimeoutRef`. If component unmounts during the 500ms wait, the timeout fires on an unmounted component.

### 5. Global command dedup persists across sessions (Low)
**File**: `useBleConnection.ts:14`
```typescript
const globalLastCommand = { cmd: '', time: 0 };
```
Module-level singleton. Persists across disconnect/reconnect. On very fast reconnect (<500ms), the first command of the new session could be blocked. Unlikely in practice due to reconnect delays.

### 6. ACK attribution is fragile (Medium)
**File**: `useProtocolHandler.ts:98-116`

ACK is attributed to GOAL or SYNC based on `awaitingGoalAckRef` / `awaitingSyncAckRef` flags. If firmware sends ACK before `expectGoalAck()` is called (race), or sends an unexpected ACK, the chain breaks. No timeout — if ACK never arrives, `goalSyncInProgressRef` stays true forever, blocking future GOAL/SYNC.

**Recommendation**: Add ACK timeout (e.g., 5s). If no ACK, reset flags and retry or report error.

### 7. Stale connectedDevice after max reconnect failure (Low)
**File**: `useScanDevices.ts:229-233`

When max reconnect attempts (3) are reached, `isReconnecting` is set to false but `connectedDevice` is not cleared. UI may show a stale "connected" device that isn't actually connected. `linkUp` is already false so functional impact is minimal.

### 8. Keep-alive runs during protocol sequence (Low)
**File**: `useCoasterSession.ts:374-393`

Keep-alive (GET BATT every 20s) starts immediately when connected. If the protocol sequence (GET BATT → GET ALL → GOAL → SYNC) takes >20s, a keep-alive GET BATT could fire mid-sequence. The firmware handles BATT as a no-op during data transfer, so impact is minimal, but it adds noise.

### 9. Battery conversion assumes linear voltage curve (Low)
**File**: `useBleConnection.ts:132-134`
```typescript
const pct = Math.round(((mV - 3000) / (4200 - 3000)) * 100);
```
Lithium batteries have a non-linear discharge curve. This linear approximation overestimates battery at mid-range and underestimates at low/high ends. Not critical but could be more accurate with a lookup table.

## Protocol Command Reference

| Direction | Command | Response | Description |
|-----------|---------|----------|-------------|
| App → Device | `GET BATT\r\n` | `BATT <mV>\r\n` | Request battery voltage |
| App → Device | `GET ALL\r\n` | `SDT\r\n` + `DL <idx> <ml> [ts]\r\n`... + `END\r\n` | Request all data logs |
| App → Device | `GOAL <ml> <min>\r\n` | `ACK\r\n` | Set hydration goal |
| App → Device | `SYNC <YYMMDDhhmmss>\r\n` | `ACK\r\n` | Sync device clock |
| Device → App | `READY\r\n` | — | Device ready for commands |
| Device → App | `ERR [msg]\r\n` | — | Error response |
| Device → App | `BATT <mV>\r\n` | — | Battery voltage (3000-4200mV) |
| Device → App | `DL <idx> <ml> [YYMMDDhhmmss]\r\n` | — | Data log entry |

## Session & Stamina System

- **Session duration**: 420 min (42 intervals x 10 min)
- **DL logs per interval**: 10 (one per minute)
- **Hydration goal**: 37ml per 5min (GOAL command)
- **Stamina**: starts at 300, reduced by penalties
- **Distance**: 42.195km x (stamina / 300)
- **First interval penalty**: based on absolute ml consumed
- **Regular interval penalty**: based on shortage percentage vs target
