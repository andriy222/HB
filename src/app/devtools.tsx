import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from "react-native";

import { useState, useEffect } from "react";

import { mockCoaster } from "../hooks/MockBleProvider/MockCoaster";
import {
  isMockMode,
  toggleMockMode,
} from "../hooks/MockBleProvider/useBleWrapper";

export default function DevToolsScreen() {
  const [mockEnabled, setMockEnabled] = useState(isMockMode());
  const [coasterState, setCoasterState] = useState(mockCoaster.getState());

  // Update state every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCoasterState(mockCoaster.getState());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleToggleMock = () => {
    toggleMockMode();
    setMockEnabled(isMockMode());
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🛠️ Dev Tools</Text>
      <Text style={styles.subtitle}>Testing without hardware</Text>

      {/* Mock Mode Toggle */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Mock Mode</Text>
          <Switch value={mockEnabled} onValueChange={handleToggleMock} />
        </View>
        <Text style={styles.hint}>
          {mockEnabled
            ? "✅ Using simulated coaster"
            : "🔌 Using real BLE device"}
        </Text>
      </View>

      {/* Coaster State */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mock Coaster State</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Connected:</Text>
          <Text style={styles.statValue}>
            {coasterState.connected ? "✅ Yes" : "❌ No"}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Log Count:</Text>
          <Text style={styles.statValue}>{coasterState.logCount}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Battery:</Text>
          <Text style={styles.statValue}>{coasterState.battery}%</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => mockCoaster.generateLogs(50)}
        >
          <Text style={styles.buttonText}>Generate 50 Logs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => mockCoaster.generateLogs(200)}
        >
          <Text style={styles.buttonText}>Generate 200 Logs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => mockCoaster.generateLogs(420)}
        >
          <Text style={styles.buttonText}>
            Generate 420 Logs (Full Session)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Simulate Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Simulate Events</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => mockCoaster.simulateDrink(30)}
        >
          <Text style={styles.buttonText}>💧 Small Drink (30ml)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => mockCoaster.simulateDrink(50)}
        >
          <Text style={styles.buttonText}>💧 Medium Drink (50ml)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => mockCoaster.simulateDrink(80)}
        >
          <Text style={styles.buttonText}>💧 Large Drink (80ml)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => mockCoaster.drainBattery(10)}
        >
          <Text style={styles.buttonText}>🔋 Drain Battery (-10%)</Text>
        </TouchableOpacity>
      </View>

      {/* Scenarios */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Test Scenarios</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            // Perfect hydration
            mockCoaster.generateLogs(0);
            for (let i = 0; i < 42; i++) {
              setTimeout(() => {
                mockCoaster.simulateDrink(i === 0 ? 500 : 37);
              }, i * 100);
            }
          }}
        >
          <Text style={styles.buttonText}>
            ✅ Perfect Hydration (0 penalty)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            // Bad hydration
            mockCoaster.generateLogs(0);
            for (let i = 0; i < 42; i++) {
              setTimeout(() => {
                mockCoaster.simulateDrink(i === 0 ? 100 : 10);
              }, i * 100);
            }
          }}
        >
          <Text style={styles.buttonText}>❌ Bad Hydration (max penalty)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            // Random hydration
            mockCoaster.generateLogs(0);
            for (let i = 0; i < 42; i++) {
              setTimeout(() => {
                const ml = Math.floor(Math.random() * 60 + 10);
                mockCoaster.simulateDrink(i === 0 ? 400 : ml);
              }, i * 100);
            }
          }}
        >
          <Text style={styles.buttonText}>🎲 Random Hydration</Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ How to Use</Text>
        <Text style={styles.infoText}>
          1. Enable "Mock Mode" to test without hardware{"\n"}
          2. Generate logs to simulate past data{"\n"}
          3. Use "Simulate Events" to test real-time{"\n"}
          4. Try scenarios to test edge cases{"\n"}
          5. Go to Race screen to see results
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#000",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  hint: {
    fontSize: 14,
    color: "#666",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#c8aef0",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#000",
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: "#e3f2fd",
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: "#2196F3",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#1976D2",
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#333",
  },
});
