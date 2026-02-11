import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
  ScrollView,
} from "react-native";
import {
  Device,
  Service,
  Characteristic,
  Subscription,
} from "react-native-ble-plx";
import { logger } from "../../utils/logger";
import { trackBLEEvent, captureBLEError } from "../../utils/sentry";

// ---- base64 helpers (RN-safe, no Buffer dependency) ----
const base64abc =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const base64EncodeBytes = (bytes: Uint8Array): string => {
  let result = "";
  const l = bytes.length;
  for (let i = 0; i < l; i += 3) {
    const a = bytes[i];
    const b = i + 1 < l ? bytes[i + 1] : 0;
    const c = i + 2 < l ? bytes[i + 2] : 0;
    result += base64abc[a >> 2];
    result += base64abc[((a & 0x03) << 4) | (b >> 4)];
    result += i + 1 < l ? base64abc[((b & 0x0f) << 2) | (c >> 6)] : "=";
    result += i + 2 < l ? base64abc[c & 0x3f] : "=";
  }
  return result;
};

const base64DecodeToBytes = (b64: string): Uint8Array => {
  // sanitize
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, "");
  const len = clean.length;
  if (len === 0) return new Uint8Array(0);
  const placeHolders = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  const bytesLength = ((len * 3) >> 2) - placeHolders;
  const bytes = new Uint8Array(bytesLength);
  let p = 0;
  let i = 0;
  const decode = (ch: string) => base64abc.indexOf(ch);
  while (i < len) {
    const enc1 = decode(clean.charAt(i++));
    const enc2 = decode(clean.charAt(i++));
    const enc3 = decode(clean.charAt(i++));
    const enc4 = decode(clean.charAt(i++));
    const a = (enc1 << 2) | (enc2 >> 4);
    const b = ((enc2 & 15) << 4) | (enc3 >> 2);
    const c = ((enc3 & 3) << 6) | enc4;
    bytes[p++] = a;
    if (enc3 !== 64 && p < bytesLength) bytes[p++] = b;
    if (enc4 !== 64 && p < bytesLength) bytes[p++] = c;
  }
  return bytes;
};

const b64ToBytes = (b64: string) => {
  try {
    if (typeof atob === "function") {
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    }
  } catch {}
  return base64DecodeToBytes(b64);
};

const b64ToHex = (b64: string) =>
  Array.from(b64ToBytes(b64))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");

const utf8BytesToString = (bytes: Uint8Array): string => {
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i++];
    if (b0 < 0x80) {
      out += String.fromCharCode(b0);
    } else if (b0 < 0xe0) {
      const b1 = bytes[i++] & 0x3f;
      out += String.fromCharCode(((b0 & 0x1f) << 6) | b1);
    } else if (b0 < 0xf0) {
      const b1 = bytes[i++] & 0x3f;
      const b2 = bytes[i++] & 0x3f;
      out += String.fromCharCode(((b0 & 0x0f) << 12) | (b1 << 6) | b2);
    } else {
      // 4-byte sequences -> surrogate pairs
      const b1 = bytes[i++] & 0x3f;
      const b2 = bytes[i++] & 0x3f;
      const b3 = bytes[i++] & 0x3f;
      const codepoint = ((b0 & 0x07) << 18) | (b1 << 12) | (b2 << 6) | b3;
      const offset = codepoint - 0x10000;
      out += String.fromCharCode(0xd800 + (offset >> 10));
      out += String.fromCharCode(0xdc00 + (offset & 0x3ff));
    }
  }
  return out;
};

const b64ToUtf8Safe = (b64: string) => {
  try {
    // If Buffer exists (e.g., in Node), use it
    // @ts-ignore
    if (typeof Buffer !== "undefined") {
      // @ts-ignore
      return Buffer.from(b64, "base64").toString("utf8");
    }
  } catch {}
  try {
    if (typeof atob === "function") {
      const bin = atob(b64);
      // decode binary string as UTF-8
      const perc = bin
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("");
      return decodeURIComponent(perc);
    }
  } catch {}
  try {
    const bytes = base64DecodeToBytes(b64);
    return utf8BytesToString(bytes);
  } catch {
    return "(not UTF-8)";
  }
};

const asciiToB64 = (s: string) => {
  try {
    if (typeof btoa === "function") return btoa(s);
  } catch {}
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
  return base64EncodeBytes(bytes);
};

// small async pause helper
const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

// Target service/characteristics (Nordic UART Service)
const TARGET_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_TX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // app -> device (write)
const NUS_RX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // device -> app (notify)

// ---- types ----
type CharRow = {
  uuid: string;
  isReadable: boolean;
  isWritableWithResponse: boolean;
  isWritableWithoutResponse: boolean;
  isNotifiable: boolean;
  isIndicatable: boolean;
  lastValue?: string | null; // base64
  subscribed?: boolean;
};

type EventItem = {
  ts: number; // Date.now()
  base64: string; // raw
  hex: string;
  utf8: string;
};
type RxLine = { ts: number; text: string };

export default function ConnectedDevice({
  connectedDevice,
  disconnect,
  onSessionComplete,
  isConnected = true,
  isReconnecting = false,
  selectedGender = "male",
  hydrationGoalPerPeriod = 37,
  hydrationPeriodMin = 5,
}: {
  connectedDevice: Device;
  disconnect: VoidFunction;
  onSessionComplete?: VoidFunction;
  isConnected?: boolean;
  isReconnecting?: boolean;
  selectedGender?: "male" | "female";
  hydrationGoalPerPeriod?: number;
  hydrationPeriodMin?: number;
}) {
  const [services, setServices] = useState<Service[]>([]);
  const [charsByService, setCharsByService] = useState<
    Record<string, CharRow[]>
  >({});
  const subsRef = useRef<Record<string, Subscription | null>>({}); // key: service|char
  const transRef = useRef<Record<string, string>>({}); // transactionId per key
  const targetTxRef = useRef<{ service: string; char: string } | null>(null);
  const targetRxRef = useRef<{ service: string; char: string } | null>(null);
  const lineBufRef = useRef<string>("");
  const didSyncRef = useRef<boolean>(false);

  // NEW: per-char event log + expand state
  const [eventsByKey, setEventsByKey] = useState<Record<string, EventItem[]>>(
    {}
  );
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [rxLines, setRxLines] = useState<RxLine[]>([]);
  const [showRxLogs, setShowRxLogs] = useState<boolean>(false);
  const [batteryPct, setBatteryPct] = useState<number | null>(null);

  // Operation log and counters
  const [opLogs, setOpLogs] = useState<
    { ts: number; text: string; kind?: "info" | "ok" | "err" }[]
  >([]);
  const [dlCount, setDlCount] = useState(0);
  const dlCountRef = useRef(0);
  // Hydration totals parsed from DL lines (ml consumed per minute)
  const [hydrationMl, setHydrationMl] = useState(0);
    const hydrationMlRef = useRef(0);
    const seenDlKeyRef = useRef<Set<string>>(new Set());
  // Detect whether DL indices from device are 0-based or 1-based.
  // If first DL index is 0, we add +1 offset so displayed count matches number of logs.
  const dlIndexBaseRef = useRef<number | null>(null);
  const dlIdleTimerRef = useRef<any>(null);
  const awaitingSyncAckRef = useRef<boolean>(false);
  const awaitingGoalAckRef = useRef<boolean>(false);
  const isDownloadingRef = useRef<boolean>(false);
  const sawAnyLogRef = useRef<boolean>(false);
  const endReceivedRef = useRef<boolean>(false);
  const SHOW_EXPLORER = false;

  const keyOf = (svc: string, chr: string) => `${svc}|${chr}`;

  // Hydration goals
  const INTERVALS_PER_DAY = 82;
  const MALE_GOAL_ML = 3000;
  const FEMALE_GOAL_ML = 2500;
  const MALE_PER_INTERVAL = Math.round(MALE_GOAL_ML / INTERVALS_PER_DAY); // ~37 ml (for GOAL command)
  const FEMALE_PER_INTERVAL = Math.round(FEMALE_GOAL_ML / INTERVALS_PER_DAY); // ~31 ml (for GOAL command)
    const selectedGoal =
      selectedGender === "male" ? MALE_GOAL_ML : FEMALE_GOAL_ML;
  const defaultPerInterval =
    selectedGender === "male" ? MALE_PER_INTERVAL : FEMALE_PER_INTERVAL;
  const usedGoalPerPeriod =
    hydrationGoalPerPeriod && hydrationGoalPerPeriod > 0
      ? hydrationGoalPerPeriod
      : defaultPerInterval;
  const usedPeriodMin =
    hydrationPeriodMin && hydrationPeriodMin > 0 ? hydrationPeriodMin : 5;
    const selectedConsumed = Math.round(hydrationMl);

  // Cleanup on unmount/prop change
  useEffect(() => {
    return () => {
      try {
        if (Platform.OS !== "android") {
          Object.values(subsRef.current).forEach((s) => s?.remove());
        }
      } catch {}
      subsRef.current = {};
      transRef.current = {};
      setEventsByKey({});
      setExpandedKeys({});
    };
  }, [connectedDevice?.id]);

  const onRead = async (serviceUUID: string, charUUID: string) => {
    try {
      const c = await connectedDevice.readCharacteristicForService(
        serviceUUID,
        charUUID
      );
      setCharsByService((prev) => {
        const rows = prev[serviceUUID] ?? [];
        const next = rows.map((row) =>
          row.uuid === charUUID ? { ...row, lastValue: c.value ?? null } : row
        );
        return { ...prev, [serviceUUID]: next };
      });
    } catch (e) {
      logger.warn("Read failed:", e);
    }
  };

  const onSubscribe = async (serviceUUID: string, charUUID: string) => {
    const key = keyOf(serviceUUID, charUUID);
    if (subsRef.current[key]) return; // already subbed

    // assign an explicit transaction id for clean cancellation
    const txId = `rx:${serviceUUID}:${charUUID}:${Date.now()}:${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const sub = connectedDevice.monitorCharacteristicForService(
      serviceUUID,
      charUUID,
      (error, c) => {
        if (error) {
          logger.warn("Notify error:", error);
          return;
        }
        if (c?.value != null) {
          // 1) update lastValue + subscribed
          setCharsByService((prev) => {
            const rows = prev[serviceUUID] ?? [];
            const next = rows.map((row) =>
              row.uuid === charUUID
                ? { ...row, lastValue: c.value, subscribed: true }
                : row
            );
            return { ...prev, [serviceUUID]: next };
          });
          // 2) append to events (keep last 50)
          setEventsByKey((prev) => {
            const list = prev[key] ?? [];
            const item: EventItem = {
              ts: Date.now(),
              base64: c.value!,
              hex: b64ToHex(c.value!),
              utf8: b64ToUtf8Safe(c.value!),
            };
            const next = [...list, item];
            if (next.length > 50) next.shift();
            return { ...prev, [key]: next };
          });

          // If this is the target RX characteristic, parse ASCII lines
          const isTargetRx =
            serviceUUID.toLowerCase() === TARGET_SERVICE &&
            (charUUID.toLowerCase() === NUS_RX ||
              targetRxRef.current?.char.toLowerCase() ===
                charUUID.toLowerCase());
          if (isTargetRx) {
            const chunk = b64ToUtf8Safe(c.value!);
            if (chunk && chunk.length) {
              lineBufRef.current += chunk;
              // Split on CR or CRLF; keep incomplete at end
              const parts = lineBufRef.current.split(/\r\n|\n|\r/);
              lineBufRef.current = parts.pop() ?? "";
              for (const lineRaw of parts) {
                const line = lineRaw.trim();
                if (!line) continue;
                handleAsciiLine(line);
              }
            }
          }
        }
      },
      txId
    );
    subsRef.current[key] = sub;
    transRef.current[key] = txId;
    // reflect subscribed state immediately
    setCharsByService((prev) => {
      const rows = prev[serviceUUID] ?? [];
      const next = rows.map((row) =>
        row.uuid === charUUID ? { ...row, subscribed: true } : row
      );
      return { ...prev, [serviceUUID]: next };
    });
    // auto-expand the section when first subscribing
    setExpandedKeys((prev) => ({ ...prev, [key]: true }));
  };

  const onUnsubscribe = (serviceUUID: string, charUUID: string) => {
    const key = keyOf(serviceUUID, charUUID);
    if (subsRef.current[key]) {
      try {
        if (Platform.OS !== "android") {
          subsRef.current[key]?.remove();
        }
      } catch {}
    }
    delete subsRef.current[key];
    delete transRef.current[key];
    setCharsByService((prev) => {
      const rows = prev[serviceUUID] ?? [];
      const next = rows.map((row) =>
        row.uuid === charUUID ? { ...row, subscribed: false } : row
      );
      return { ...prev, [serviceUUID]: next };
    });
    // keep history by default; if you want to clear, uncomment:
    // setEventsByKey(prev => ({ ...prev, [key]: [] }));
  };

  // --- High-level ops ---
  // Cap opLogs length to avoid excessive memory/paint work during long sessions
  const log = (text: string, kind: "info" | "ok" | "err" = "info") =>
    setOpLogs((p) => {
      const next = [...p, { ts: Date.now(), text, kind }];
      if (next.length > 500) next.shift();
      return next;
    });

  const clearLogsAndEvents = () => {
    setOpLogs([]);
    setDlCount(0);
    dlCountRef.current = 0;
    dlIndexBaseRef.current = null;
    endReceivedRef.current = false;
    setEventsByKey({});
    setExpandedKeys({});
    setRxLines([]);
    lineBufRef.current = "";
    didSyncRef.current = false;
    isDownloadingRef.current = false;
    sawAnyLogRef.current = false;
    // Reset hydration aggregation and seen indices for a fresh request
    hydrationMlRef.current = 0;
    setHydrationMl(0);
    seenDlKeyRef.current = new Set();
  };

  // Orchestrated flow: discover → find NUS → subscribe RX → GET ALL
  async function runFlow(): Promise<void> {
    try {
      clearLogsAndEvents();
      trackBLEEvent("runFlow_started", { deviceId: connectedDevice?.id, deviceName: connectedDevice?.name });
      log("Discovering services & characteristics…");

      const stillConnected = await connectedDevice.isConnected();
      trackBLEEvent("isConnected_check", { stillConnected, deviceId: connectedDevice?.id });
      if (!stillConnected) {
        log("Device no longer connected", "err");
        captureBLEError("runFlow", "Device not connected at start", connectedDevice?.id);
        return;
      }

      let ready: Device;
      try {
        trackBLEEvent("service_discovery_start", {});
        ready = await connectedDevice.discoverAllServicesAndCharacteristics();
        trackBLEEvent("service_discovery_success", {});
      } catch (e) {
        // transient discovery failure is common; retry once quickly
        trackBLEEvent("service_discovery_retry", { error: String(e) });
        await delay(150);
        ready = await connectedDevice.discoverAllServicesAndCharacteristics();
        trackBLEEvent("service_discovery_retry_success", {});
      }
      // Optional: increase MTU and connection priority on Android to improve stability
      if (Platform.OS === "android") {
        try {
          await ready.requestMTU(185);
        } catch {}
        try {
          await (ready as any).requestConnectionPriority?.(2);
        } catch {}
      }
      const svcs = await ready.services();
      trackBLEEvent("services_found", { count: svcs.length, uuids: svcs.map(s => s.uuid) });
      setServices(svcs);

      let foundSvc: Service | null = null;
      let tx: Characteristic | null = null;
      let rx: Characteristic | null = null;
      const map: Record<string, CharRow[]> = {};
      for (const s of svcs) {
        const chs = await s.characteristics();
        map[s.uuid] = chs.map((c) => ({
          uuid: c.uuid,
          isReadable: c.isReadable,
          isWritableWithResponse: c.isWritableWithResponse,
          isWritableWithoutResponse: c.isWritableWithoutResponse,
          isNotifiable: c.isNotifiable,
          isIndicatable: c.isIndicatable,
          lastValue: undefined,
          subscribed: false,
        }));

        if (!foundSvc && s.uuid.toLowerCase() === TARGET_SERVICE) {
          foundSvc = s;
          trackBLEEvent("NUS_service_found", { serviceUuid: s.uuid });
          const preferredTx = chs.find((c) => c.uuid.toLowerCase() === NUS_TX);
          const preferredRx = chs.find((c) => c.uuid.toLowerCase() === NUS_RX);
          trackBLEEvent("TX_RX_search", {
            preferredTxFound: !!preferredTx,
            preferredRxFound: !!preferredRx,
            charCount: chs.length
          });
          tx =
            preferredTx ||
            chs.find(
              (c) => c.isWritableWithResponse || c.isWritableWithoutResponse
            ) ||
            null;
          rx = preferredRx || chs.find((c) => c.isNotifiable) || null;
        }
      }
      setCharsByService(map);

      if (!foundSvc || !tx || !rx) {
        log("NUS service or TX/RX characteristic not found", "err");
        captureBLEError("runFlow", `NUS/TX/RX not found: svc=${!!foundSvc} tx=${!!tx} rx=${!!rx}`, connectedDevice?.id);
        return;
      }

      targetTxRef.current = { service: foundSvc.uuid, char: tx.uuid };
      targetRxRef.current = { service: foundSvc.uuid, char: rx.uuid };
      trackBLEEvent("TX_RX_set", { txUuid: tx.uuid, rxUuid: rx.uuid });
      log(`NUS found. TX=${tx.uuid} RX=${rx.uuid}`);

      // Prepare subscription to RX; avoid Android cancelTransaction crash
      const rxKey = keyOf(foundSvc.uuid, rx.uuid);
      if (Platform.OS !== "android") {
        Object.values(subsRef.current).forEach((s) => s?.remove());
        subsRef.current = {};
        transRef.current = {};
      }
      if (!subsRef.current[rxKey]) {
        await onSubscribe(foundSvc.uuid, rx.uuid);
        log("Subscribed to RX notifications");
      } else {
        log("RX already subscribed; reusing existing monitor");
      }

      // Give CCCD write a brief moment, then send command
      await delay(150);
      requestLogs();

      // Start keep-alive after connection is fully established
      // Coaster disconnects after 25s without messages, so we ping every 20s
      startKeepAlive();
    } catch (e) {
      captureBLEError("runFlow", String(e), connectedDevice?.id);
      log(`Flow error: ${String(e)}`, "err");
    }
  }

  // Auto-run when device prop changes
  useEffect(() => {
    trackBLEEvent("useEffect_triggered", {
      hasConnectedDevice: !!connectedDevice,
      deviceId: connectedDevice?.id,
      isConnected,
    });
    if (connectedDevice && isConnected) {
      trackBLEEvent("runFlow_starting", { deviceId: connectedDevice?.id });
      runFlow();
    } else {
      trackBLEEvent("runFlow_skipped", { reason: !connectedDevice ? 'no device' : 'not connected' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedDevice?.id, isConnected]);

  // Keep-alive: Coaster disconnects after 25s without messages
  // Send GET BATT every 20s to maintain connection
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startKeepAlive = () => {
    // Clear any existing interval first
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }

    // Start new keep-alive interval
    keepAliveRef.current = setInterval(() => {
      if (targetTxRef.current && !isDownloadingRef.current) {
        sendAsciiCommand("GET BATT\r\n");
      }
    }, 20000); // 20 seconds

    log("Keep-alive started (20s interval)");
  };

  const stopKeepAlive = () => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  };

  // Cleanup keep-alive on unmount or disconnect
  useEffect(() => {
    if (!isConnected) {
      stopKeepAlive();
    }
    return () => stopKeepAlive();
  }, [isConnected]);

  const requestLogs = () => {
    clearLogsAndEvents();
    clearTimeout(dlIdleTimerRef.current as any);
    setDlCount(0);
    if (!isConnected) {
      log("Device offline; cannot request logs", "err");
      return;
    }
    log("Requesting data logs…");
    if (!targetTxRef.current) {
      log("TX characteristic not ready; attempting to rediscover", "err");
      // fire-and-forget try to restart the flow
      runFlow();
      return;
    }
    isDownloadingRef.current = true;
    sawAnyLogRef.current = false;
    sendAsciiCommand("GET ALL\r\n");
  };

  const startDlIdleTimer = () => {
    clearTimeout(dlIdleTimerRef.current as any);
    dlIdleTimerRef.current = setTimeout(() => {
      if (isDownloadingRef.current && sawAnyLogRef.current) {
        log("Log stream idle; treating as end of transfer window", "info");
        onLogsComplete();
      }
    }, 1500);
  };

  // Make completion async so we can add a small delay before SYNC to let the device settle
  const onLogsComplete = async () => {
    // Always log completion; decide on SYNC based on count
    const count = dlCountRef.current;
    log(`Logs retrieval complete (${count})`, "ok");
    isDownloadingRef.current = false;
    // Desired: send SYNC when no logs or when logs >= 411. Add brief delay to avoid races.
    let shouldSync = count === 0 || count >= 411;
    if (shouldSync && !didSyncRef.current) {
      await delay(250);
      // Recheck conditions after waiting briefly
      const c2 = dlCountRef.current;
      shouldSync = (c2 === 0 || c2 >= 411) && isConnected;
      if (shouldSync) {
        // Send hydration goal prior to date/time sync; SYNC will be sent after GOAL ACK
        sendHydrationGoal();
        didSyncRef.current = true; // prevent duplicate initiations
      } else {
        log("Skipping time sync after recheck", "info");
      }
    } else if (!shouldSync) {
      if (count > 0 && count < 411) {
        log("Skipping time sync: less than 411 logs", "info");
      } else {
        log("Skipping time sync", "info");
      }
    }
  };

  const sendHydrationGoal = () => {
    try {
      const amount = usedGoalPerPeriod;
      const period = usedPeriodMin;
      log(`Sending hydration goal GOAL ${amount} ${period}…`);
      awaitingGoalAckRef.current = true;
      sendAsciiCommand(`GOAL ${amount} ${period}\r\n`);
    } catch {
      log("Failed to send hydration goal", "err");
    }
  };

  const sendTimeSync = () => {
    // Send SYNC when there are no logs, or when logs >= 411
    const count = dlCountRef.current;
    if (!(count === 0 || count >= 411)) {
      log("Not sending time sync: less than 411 logs", "info");
      return;
    }
    const ts = formatYYMMDDhhmmss(new Date());
    log(`Sending time sync SYNC ${ts}…`);
    awaitingSyncAckRef.current = true;
    sendAsciiCommand(`SYNC ${ts}\r\n`);
  };

  // Clean up timers/subscriptions after successful ACK
  const finalizeAfterAck = () => {
    try {
      clearTimeout(dlIdleTimerRef.current as any);
    } catch {}
    isDownloadingRef.current = false;
    sawAnyLogRef.current = false;
    // Optionally stop notifications to reduce traffic (safe if already disconnected)
    const rx = targetRxRef.current;
    if (rx) {
      try {
        onUnsubscribe(rx.service, rx.char);
      } catch {}
    }
    log("Session complete", "ok");
    try {
      onSessionComplete && onSessionComplete();
    } catch {}
  };

  const handleAsciiLine = (line: string) => {
    // Keep a rolling buffer of raw RX lines (for UI)
    setRxLines((prev) => {
      const next = [...prev, { ts: Date.now(), text: line }];
      if (next.length > 500) next.shift();
      return next;
    });
    if (line.startsWith("SDT")) {
      log(`SDT: ${line}`);
      // Do not sync yet; wait for explicit END
      if (isDownloadingRef.current) sawAnyLogRef.current = true;
      startDlIdleTimer();
      return;
    }
    if (line.startsWith("DL")) {
      // Prefer the device-provided DL index if present (ASCII digits)
      const m = /^DL\s+(\d+)/.exec(line);
      if (m) {
        const idx = parseInt(m[1], 10);
        if (Number.isFinite(idx)) {
          if (dlIndexBaseRef.current == null) {
            // If first index is 0, treat as 0-based and add +1 to get count.
            dlIndexBaseRef.current = idx === 0 ? 1 : 0;
          }
          const countCandidate = idx + (dlIndexBaseRef.current ?? 0);
          const v = Math.min(411, Math.max(dlCountRef.current, countCandidate));
          dlCountRef.current = v; // update ref synchronously to avoid END race
          setDlCount(v);

          // Parse hydration ml from the DL line and accumulate once per unique index
          if (!seenDlKeyRef.current.has(String(idx))) {
            seenDlKeyRef.current.add(String(idx));
            // Try to parse an amount after the index or the last number in the line
            let ml = NaN;
            const afterIdx = /^DL\s+\d+\s+([0-9]+(?:\.[0-9]+)?)/.exec(line);
            if (afterIdx) ml = parseFloat(afterIdx[1]);
            if (!Number.isFinite(ml)) {
              const tail = /(\d+(?:\.\d+)?)\s*(?:ml)?\s*$/i.exec(line);
              if (tail) ml = parseFloat(tail[1]);
            }
            if (Number.isFinite(ml)) {
              hydrationMlRef.current += ml;
              setHydrationMl(hydrationMlRef.current);
            }
          }
        }
      } else {
        // Fallback: count lines
        const v = Math.min(411, dlCountRef.current + 1);
        dlCountRef.current = v; // update ref synchronously to avoid END race
        setDlCount(v);
        // Attempt to parse a trailing number as ml when no index is provided
        let ml = NaN;
        const tail = /(\d+(?:\.\d+)?)\s*(?:ml)?\s*$/i.exec(line);
        if (tail) ml = parseFloat(tail[1]);
        if (Number.isFinite(ml)) {
          hydrationMlRef.current += ml;
          setHydrationMl(hydrationMlRef.current);
        }
      }
      // Do not sync yet; wait for explicit END
      if (isDownloadingRef.current) sawAnyLogRef.current = true;
      startDlIdleTimer();
      return;
    }
    if (line.toUpperCase().startsWith("END")) {
      if (isDownloadingRef.current) {
        log("END received");
        endReceivedRef.current = true;
        onLogsComplete();
      } else {
        // Ignore stray END outside of an active download window
      }
      return;
    }
    if (line === "ACK") {
      if (awaitingGoalAckRef.current) {
        awaitingGoalAckRef.current = false;
        log("Hydration goal ACK received", "ok");
        // After GOAL is acknowledged, send time sync
        sendTimeSync();
        return;
      }
      if (awaitingSyncAckRef.current) {
        awaitingSyncAckRef.current = false;
        log("Time sync ACK received", "ok");
        finalizeAfterAck();
        return;
      }
      // stray ACK
      log("ACK received (no pending command)", "info");
      return;
    }
    // Battery percentage line: DEV <0-100>
    if (line.startsWith("DEV")) {
      const m = /^DEV\s+(\d{1,3})/.exec(line);
      if (m) {
        const raw = parseInt(m[1], 10);
        if (Number.isFinite(raw)) {
          const pct = Math.max(0, Math.min(100, raw));
          setBatteryPct(pct);
          log(`Battery: ${pct}%`);
        }
      }
      return;
    }
    if (line.startsWith("ERR")) {
      log(`Device error: ${line}`, "err");
      return;
    }
    log(`Device: ${line}`);
  };

  const formatYYMMDDhhmmss = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const YY = pad(d.getFullYear() % 100);
    const MM = pad(d.getMonth() + 1);
    const DD = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${YY}${MM}${DD}${hh}${mm}${ss}`;
  };

  const sendAsciiCommand = async (ascii: string) => {
    const tx = targetTxRef.current;
    trackBLEEvent("sendCommand_called", { command: ascii.trim(), txSet: !!tx });
    if (!tx) {
      log("Cannot send: TX not set", "err");
      captureBLEError("sendCommand", "TX not set", connectedDevice?.id);
      return;
    }

    const b64Data = asciiToB64(ascii);
    const isStillConnected = await connectedDevice.isConnected().catch(() => false);
    trackBLEEvent("write_attempt", {
      service: tx.service,
      char: tx.char,
      command: ascii.trim(),
      b64Length: b64Data.length,
      isConnected: isStillConnected
    });

    if (!isStillConnected) {
      captureBLEError("sendCommand", "Device disconnected before write", connectedDevice?.id);
      log("Cannot send: device disconnected", "err");
      return;
    }

    try {
      // Nordic UART Service TX typically uses Write Without Response
      await connectedDevice.writeCharacteristicWithoutResponseForService(
        tx.service,
        tx.char,
        b64Data
      );
      trackBLEEvent("write_success", { command: ascii.trim(), mode: "without_response" });
      log(`TX: ${ascii.trim()}`);
    } catch (e) {
      trackBLEEvent("write_failed_retry", { error: String(e), command: ascii.trim() });
      // Fallback to write with response if without response fails
      try {
        await connectedDevice.writeCharacteristicWithResponseForService(
          tx.service,
          tx.char,
          b64Data
        );
        trackBLEEvent("write_success", { command: ascii.trim(), mode: "with_response" });
        log(`TX (with response): ${ascii.trim()}`);
      } catch (e2) {
        captureBLEError("sendCommand", `Write failed: ${String(e2)}`, connectedDevice?.id);
        log("Write failed", "err");
      }
    }
  };

  const toggleExpanded = (serviceUUID: string, charUUID: string) => {
    const key = keyOf(serviceUUID, charUUID);
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const formatTs = (n: number) => {
    const d = new Date(n);
    return `${d.toLocaleTimeString()}:${String(d.getMilliseconds()).padStart(
      3,
      "0"
    )}`;
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.card}>
          <Text style={styles.title}>✅ Connected Device</Text>
          <Text>Name: {connectedDevice.name ?? "Unknown"}</Text>
          <Text>ID: {connectedDevice.id}</Text>
          <Text>MTU: {connectedDevice.mtu}</Text>
          <Text>RSSI: {connectedDevice.rssi ?? "N/A"}</Text>
          <Text>
            Battery: {batteryPct !== null ? `${batteryPct}%` : "N/A"}
          </Text>
          <Text>
            Is Connected:{" "}
            {isConnected ? (isReconnecting ? "Reconnecting…" : "Yes") : "No"}
          </Text>

          <TouchableOpacity
            onPress={disconnect}
            style={[styles.button, { marginTop: 12 }]}
          >
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>

        {targetRxRef.current && targetTxRef.current && (
          <View style={styles.card}>
            <Text style={styles.subtitle}>Data Logs & Time Sync</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                style={[
                  styles.button,
                  (!isConnected || dlCount === 0) && { opacity: 0.5 },
                ]}
                onPress={requestLogs}
                disabled={!isConnected || dlCount === 0}
              >
                <Text style={styles.buttonText}>ReSync</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { marginLeft: 8 }]}
                onPress={() => setShowRxLogs((s) => !s)}
              >
                <Text style={styles.buttonText}>
                  {showRxLogs ? "Hide" : "Show"} Logs ({dlCount})
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.muted, { marginTop: 6 }]}>
              DL count: {dlCount}
            </Text>
            {!isConnected && (
              <Text style={[styles.muted, { marginTop: 6 }]}>
                Device offline; trying to reconnect. Logs preserved.
              </Text>
            )}
            <View style={{ marginTop: 10 }}>
              {opLogs.length === 0 ? (
                <Text style={styles.muted}>Waiting for events��</Text>
              ) : (
                opLogs.map((l, i) => (
                  <Text
                    key={`${l.ts}-${i}`}
                    style={{
                      color:
                        l.kind === "err"
                          ? "#b00020"
                          : l.kind === "ok"
                          ? "#006400"
                          : "#000",
                    }}
                  >
                    {new Date(l.ts).toLocaleTimeString()} - {l.text}
                  </Text>
                ))
              )}
            </View>

            {showRxLogs && (
              <View style={[styles.valueBox, { marginTop: 10 }]}>
                <Text style={[styles.valueLabel, { marginBottom: 6 }]}>
                  RX Lines (newest last)
                </Text>
                {rxLines.slice(-150).map((r, idx) => (
                  <Text key={`${r.ts}-${idx}`} style={styles.valueMono}>
                    {formatTs(r.ts)} {r.text}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Hydration card based on received logs (intervals) and selected gender */}
        <View style={styles.card}>
          <Text style={styles.subtitle}>
            Hydration ({selectedGender === "male" ? "Male" : "Female"})
          </Text>
          <Text style={styles.muted}>Based on received log intervals</Text>
          <View style={{ marginTop: 8 }}>
            <Text>
              {selectedGender === "male" ? "Male" : "Female"}: {selectedConsumed}{" "}
              / {selectedGoal} ml
            </Text>
            <Text style={styles.muted}>
              Goal to device: {usedGoalPerPeriod} ml every {usedPeriodMin}{" "}
              minutes
            </Text>
          </View>
        </View>
        {SHOW_EXPLORER && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.subtitle}>Services & Characteristics</Text>

            <FlatList
              style={{ maxHeight: 500 }}
              data={services}
              keyExtractor={(s) => s.uuid}
              contentContainerStyle={{ paddingBottom: 120 }}
              renderItem={({ item: svc }) => {
                const rows = charsByService[svc.uuid] ?? [];
                return (
                  <View style={styles.serviceBlock}>
                    <Text style={styles.serviceHeader}>
                      Service: {svc.uuid}
                    </Text>

                    {rows.length === 0 ? (
                      <Text style={styles.muted}>No characteristics</Text>
                    ) : (
                      rows.map((row) => {
                        const readable = row.isReadable;
                        const notifiable =
                          row.isNotifiable || row.isIndicatable;
                        const subscribed = !!row.subscribed;
                        const key = keyOf(svc.uuid, row.uuid);
                        const evts = eventsByKey[key] ?? [];

                        return (
                          <View key={row.uuid} style={styles.charRow}>
                            <Text style={styles.charUuid}>
                              Char: {row.uuid}
                            </Text>
                            <Text style={styles.propsLine}>
                              Props: R:{row.isReadable ? "Y" : "N"} W:
                              {row.isWritableWithResponse ||
                              row.isWritableWithoutResponse
                                ? "Y"
                                : "N"}{" "}
                              N:{row.isNotifiable ? "Y" : "N"} I:
                              {row.isIndicatable ? "Y" : "N"}
                            </Text>

                            {/* Actions */}
                            <View style={styles.actions}>
                              {readable && (
                                <TouchableOpacity
                                  style={[styles.smallBtn]}
                                  onPress={() => onRead(svc.uuid, row.uuid)}
                                >
                                  <Text style={styles.smallBtnTxt}>Read</Text>
                                </TouchableOpacity>
                              )}

                              {notifiable && !subscribed && (
                                <TouchableOpacity
                                  style={[styles.smallBtn]}
                                  onPress={() =>
                                    onSubscribe(svc.uuid, row.uuid)
                                  }
                                >
                                  <Text style={styles.smallBtnTxt}>
                                    Subscribe
                                  </Text>
                                </TouchableOpacity>
                              )}

                              {subscribed && (
                                <>
                                  <TouchableOpacity
                                    style={[
                                      styles.smallBtn,
                                      styles.secondaryBtn,
                                    ]}
                                    onPress={() =>
                                      onUnsubscribe(svc.uuid, row.uuid)
                                    }
                                  >
                                    <Text style={styles.smallBtnTxt}>
                                      Unsubscribe
                                    </Text>
                                  </TouchableOpacity>

                                  {/* Toggle events */}
                                  <TouchableOpacity
                                    style={[styles.smallBtn]}
                                    onPress={() =>
                                      toggleExpanded(svc.uuid, row.uuid)
                                    }
                                  >
                                    <Text style={styles.smallBtnTxt}>
                                      {expandedKeys[key] ? "Hide" : "Show"}{" "}
                                      Events ({evts.length})
                                    </Text>
                                  </TouchableOpacity>
                                </>
                              )}
                            </View>

                            {/* Last value quick preview */}
                            {row.lastValue != null && (
                              <View style={styles.valueBox}>
                                <Text style={styles.valueLabel}>
                                  Last value (hex):
                                </Text>
                                <Text style={styles.valueMono}>
                                  {b64ToHex(row.lastValue)}
                                </Text>
                                <Text
                                  style={[styles.valueLabel, { marginTop: 6 }]}
                                >
                                  UTF-8 preview:
                                </Text>
                                <Text style={styles.valueMono}>
                                  {b64ToUtf8Safe(row.lastValue)}
                                </Text>
                              </View>
                            )}

                            {/* Events log */}
                            {expandedKeys[key] && evts.length > 0 && (
                              <View style={[styles.valueBox, { marginTop: 8 }]}>
                                <Text
                                  style={[
                                    styles.valueLabel,
                                    { marginBottom: 6 },
                                  ]}
                                >
                                  Events (newest last):
                                </Text>
                                {evts.map((e, idx) => (
                                  <View
                                    key={`${e.ts}-${idx}`}
                                    style={{ marginBottom: 6 }}
                                  >
                                    <Text style={styles.valueLabel}>
                                      @ {formatTs(e.ts)}
                                    </Text>
                                    <Text style={styles.valueMono}>
                                      hex: {e.hex}
                                    </Text>
                                    <Text style={styles.valueMono}>
                                      utf8: {e.utf8}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                );
              }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#eef6ff",
    marginTop: 20,
  },
  button: {
    backgroundColor: "#c8aef0",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#000",
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },

  serviceBlock: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  serviceHeader: { fontWeight: "600", marginBottom: 8 },
  muted: { color: "#666" },

  charRow: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "#fafafa",
    borderRadius: 8,
    marginBottom: 10,
  },
  charUuid: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    fontSize: 12,
  },
  propsLine: { fontSize: 12, color: "#444", marginTop: 4 },

  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
  smallBtn: {
    backgroundColor: "#c8aef0",
    borderColor: "#000",
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  secondaryBtn: { backgroundColor: "#e6e6e6" },
  smallBtnTxt: { fontWeight: "600" },

  valueBox: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  valueLabel: { fontSize: 12, color: "#666" },
  valueMono: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    fontSize: 12,
  },
});
