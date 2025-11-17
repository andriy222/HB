import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useGlobalConnectionMonitor } from "../../hooks/useConnectionMonitor";

interface ConnectionGuardProps {
  children: React.ReactNode;
  onBlockedPress?: () => void;
}

export function ConnectionGuard({
  children,
  onBlockedPress,
}: ConnectionGuardProps) {
  const monitor = useGlobalConnectionMonitor();

  if (monitor.hasAllConnections) {
    return <>{children}</>;
  }

  return (
    <View style={styles.blockedContainer}>
      <View style={styles.blockedContent}>
        <Text style={styles.blockedIcon}>⚠️</Text>
        <Text style={styles.blockedTitle}>Unable to Start</Text>
        <Text style={styles.blockedMessage}>Needs Connection</Text>

        <View style={styles.missingList}>
          {monitor.missingConnections.map((connection) => (
            <View key={connection} style={styles.missingItem}>
              <View style={styles.missingDot} />
              <Text style={styles.missingText}>
                {getMissingConnectionLabel(connection)}
              </Text>
            </View>
          ))}
        </View>

        {onBlockedPress && (
          <TouchableOpacity style={styles.fixButton} onPress={onBlockedPress}>
            <Text style={styles.fixButtonText}>set Connection</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function useCanStartRace(): boolean {
  const monitor = useGlobalConnectionMonitor();
  return monitor.canStartRace;
}

function getMissingConnectionLabel(connection: string): string {
  switch (connection) {
    case "internet":
      return "Інтернет";
    case "bluetooth":
      return "Bluetooth";
    case "coaster":
      return "Coaster пристрій";
    default:
      return connection;
  }
}

const styles = StyleSheet.create({
  blockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 24,
  },
  blockedContent: {
    backgroundColor: "#1f2937",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    maxWidth: 400,
    width: "100%",
    borderWidth: 2,
    borderColor: "#ef4444",
  },
  blockedIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  blockedTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#f9fafb",
    marginBottom: 8,
  },
  blockedMessage: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 24,
  },
  missingList: {
    width: "100%",
    marginBottom: 24,
  },
  missingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  missingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    marginRight: 12,
  },
  missingText: {
    fontSize: 16,
    color: "#f9fafb",
    fontWeight: "500",
  },
  fixButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
  },
  fixButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
