import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import AuthBackground from "../../../UI/layout/backgrounds/AuthBackground";
import BottomNavigation from "../../../components/BottomNavigation/BottomNavigation";
import { useSession } from "../../../hooks/useBleConnection/useSession";
import { useCoasterConnection } from "../../../store/connectionStore";
import { textPresets } from "../../../theme";
import { SESSION_CONFIG, BLE_CONFIG } from "../../../constants/sessionConstants";
import { useBle } from "../../../providers/BleProvider";

const { width } = Dimensions.get("window");

const TestBLE = () => {
  const session = useSession();
  const coasterConnection = useCoasterConnection();
  const { connectedDevice } = useBle();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Detect if running on simulator
  const isSimulator = Platform.OS === 'ios'
    ? __DEV__
    : Platform.OS === 'android'
    ? false
    : true;

  // Check why mock might be active
  const mockReasons = [];
  if (BLE_CONFIG.USE_MOCK_BLE) mockReasons.push("USE_MOCK_BLE = true");
  if (!connectedDevice) mockReasons.push("No device connected");
  if (isSimulator) mockReasons.push("Running on simulator");

  const isMockActive = mockReasons.length > 0;

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate total hydration from all intervals
  const totalHydration = session.session?.intervals.reduce(
    (sum, interval) => sum + interval.actualMl,
    0
  ) ?? 0;

  const totalRequired = session.session?.intervals.reduce(
    (sum, interval) => sum + interval.requiredMl,
    0
  ) ?? 0;

  // Format timestamp for display
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Calculate interval timeframe
  const getIntervalTimeframe = (interval: any) => {
    const start = formatTimestamp(interval.startTime);
    const end = formatTimestamp(interval.endTime);
    return `${start} - ${end}`;
  };

  return (
    <AuthBackground isMain={false} footer={<BottomNavigation />}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🧪 BLE Test Page</Text>
          <Text style={styles.subtitle}>
            Current Time: {currentTime.toLocaleTimeString()}
          </Text>
        </View>

        {/* BLE Mode Diagnostics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🔧 BLE Mode Diagnostics
          </Text>
          <View style={[
            styles.card,
            isMockActive && { backgroundColor: "#FFF3E0" }
          ]}>
            <StatusRow
              label="Mode"
              value={isMockActive ? "🧪 MOCK BLE" : "📡 REAL BLE"}
              valueColor={isMockActive ? "#FF9800" : "#4CAF50"}
            />
            <StatusRow
              label="Platform"
              value={`${Platform.OS} ${Platform.Version}`}
              small
            />
            <StatusRow
              label="USE_MOCK_BLE"
              value={BLE_CONFIG.USE_MOCK_BLE ? "true" : "false"}
              valueColor={BLE_CONFIG.USE_MOCK_BLE ? "#FF9800" : "#666"}
              small
            />
            <StatusRow
              label="Device Connected"
              value={connectedDevice ? `✅ ${connectedDevice.name || 'Unknown'}` : "❌ None"}
              valueColor={connectedDevice ? "#4CAF50" : "#F44336"}
              small
            />
            <StatusRow
              label="Is Simulator"
              value={isSimulator ? "Yes" : "No"}
              valueColor={isSimulator ? "#FF9800" : "#666"}
              small
            />
            {mockReasons.length > 0 && (
              <View style={{ marginTop: 12, padding: 12, backgroundColor: "#FFE0B2", borderRadius: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#E65100" }}>
                  ⚠️ Mock BLE Active Because:
                </Text>
                {mockReasons.map((reason, i) => (
                  <Text key={i} style={{ fontSize: 12, color: "#E65100", marginLeft: 8 }}>
                    • {reason}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📡 Connection Status</Text>
          <View style={styles.card}>
            <StatusRow
              label="BLE Connected"
              value={coasterConnection ? "✅ Yes" : "❌ No"}
              valueColor={coasterConnection ? "#4CAF50" : "#F44336"}
            />
            <StatusRow
              label="Session Active"
              value={session.isActive ? "✅ Yes" : "❌ No"}
              valueColor={session.isActive ? "#4CAF50" : "#666"}
            />
            <StatusRow
              label="Stamina"
              value={`${session.stamina} / ${SESSION_CONFIG.maxStamina}`}
            />
            <StatusRow
              label="Distance"
              value={`${session.formatDistance(session.distance)} km`}
            />
          </View>
        </View>

        {/* Total Hydration Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💧 Hydration Summary</Text>
          <View style={[styles.card, styles.summaryCard]}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Consumed:</Text>
              <Text style={styles.summaryValue}>{totalHydration.toFixed(1)} ml</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Required:</Text>
              <Text style={styles.summaryValue}>{totalRequired.toFixed(1)} ml</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shortage:</Text>
              <Text style={[
                styles.summaryValue,
                { color: totalHydration >= totalRequired ? "#4CAF50" : "#F44336" }
              ]}>
                {(totalRequired - totalHydration).toFixed(1)} ml
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Intervals:</Text>
              <Text style={styles.summaryValue}>
                {session.session?.intervals.length ?? 0} / {SESSION_CONFIG.totalIntervals}
              </Text>
            </View>
          </View>
        </View>

        {/* Session Timer */}
        {session.isActive && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏱️ Session Timer</Text>
            <View style={styles.card}>
              <StatusRow
                label="Elapsed"
                value={session.formatTime(session.elapsedMinutes)}
              />
              <StatusRow
                label="Remaining"
                value={session.formatTime(session.remainingMinutes)}
              />
              <StatusRow
                label="Current Interval"
                value={`${session.currentInterval + 1} / ${SESSION_CONFIG.totalIntervals}`}
              />
            </View>
          </View>
        )}

        {/* Interval Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📊 Hydration History ({session.session?.intervals.length ?? 0} intervals)
          </Text>
          {session.session?.intervals && session.session.intervals.length > 0 ? (
            <View style={styles.intervalList}>
              {[...session.session.intervals]
                .reverse()
                .map((interval, idx) => (
                  <View key={interval.index} style={styles.intervalCard}>
                    <View style={styles.intervalHeader}>
                      <Text style={styles.intervalTitle}>
                        Interval #{interval.index}
                        {interval.isFirst && " (First)"}
                      </Text>
                      <Text style={styles.intervalTime}>
                        {getIntervalTimeframe(interval)}
                      </Text>
                    </View>

                    <View style={styles.intervalData}>
                      <DataRow
                        label="Required"
                        value={`${interval.requiredMl.toFixed(1)} ml`}
                      />
                      <DataRow
                        label="Actual"
                        value={`${interval.actualMl.toFixed(1)} ml`}
                        valueColor={
                          interval.actualMl >= interval.requiredMl
                            ? "#4CAF50"
                            : "#F44336"
                        }
                      />
                      <DataRow
                        label="Shortage"
                        value={`${interval.shortage.toFixed(1)} ml`}
                        valueColor={interval.shortage > 0 ? "#F44336" : "#4CAF50"}
                      />
                      <DataRow
                        label="Penalty"
                        value={interval.penalty.toString()}
                        valueColor={interval.penalty < 0 ? "#F44336" : "#4CAF50"}
                      />
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(
                                (interval.actualMl / interval.requiredMl) * 100,
                                100
                              )}%`,
                              backgroundColor:
                                interval.actualMl >= interval.requiredMl
                                  ? "#4CAF50"
                                  : "#FF9800",
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {Math.min(
                          (interval.actualMl / interval.requiredMl) * 100,
                          100
                        ).toFixed(0)}
                        %
                      </Text>
                    </View>
                  </View>
                ))}
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.emptyText}>
                {session.isActive
                  ? "No hydration data yet. Start drinking!"
                  : "Start a session to see hydration data"}
              </Text>
            </View>
          )}
        </View>

        {/* Debug Info */}
        {session.session && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔍 Debug Info</Text>
            <View style={styles.card}>
              <StatusRow label="Session ID" value={session.session.id} small />
              <StatusRow
                label="Start Time"
                value={new Date(session.session.startTime).toLocaleString()}
                small
              />
              <StatusRow label="Gender" value={session.session.gender} small />
              <StatusRow
                label="Is Complete"
                value={session.session.isComplete ? "Yes" : "No"}
                small
              />
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </AuthBackground>
  );
};

// Helper Components
const StatusRow = ({
  label,
  value,
  valueColor = "#000",
  small = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  small?: boolean;
}) => (
  <View style={styles.statusRow}>
    <Text style={[styles.statusLabel, small && styles.smallText]}>{label}:</Text>
    <Text style={[styles.statusValue, { color: valueColor }, small && styles.smallText]}>
      {value}
    </Text>
  </View>
);

const DataRow = ({
  label,
  value,
  valueColor = "#000",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) => (
  <View style={styles.dataRow}>
    <Text style={styles.dataLabel}>{label}:</Text>
    <Text style={[styles.dataValue, { color: valueColor }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    ...textPresets.progressText,
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryCard: {
    backgroundColor: "#E3F2FD",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statusLabel: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  smallText: {
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 18,
    color: "#333",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  divider: {
    height: 1,
    backgroundColor: "#90CAF9",
    marginVertical: 8,
  },
  intervalList: {
    gap: 16,
  },
  intervalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  intervalHeader: {
    marginBottom: 12,
  },
  intervalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2196F3",
    marginBottom: 4,
  },
  intervalTime: {
    fontSize: 12,
    color: "#666",
  },
  intervalData: {
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  dataLabel: {
    fontSize: 14,
    color: "#666",
  },
  dataValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    width: 40,
    textAlign: "right",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
});

export default TestBLE;
