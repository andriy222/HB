/**
 * Connection Quality Indicator Component
 *
 * Відображає якість підключення для BLE, Internet та Coaster
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ConnectionQuality } from '../../config/adaptiveConnectionConfig';

interface ConnectionQualityIndicatorProps {
  type: 'ble' | 'internet' | 'coaster';
  quality: ConnectionQuality;
  rssi?: number | null;
  networkType?: string;
  isConnected: boolean;
  isReconnecting?: boolean;
  reconnectAttempt?: number;
  maxReconnectAttempts?: number;
  compact?: boolean;
}

export function ConnectionQualityIndicator({
  type,
  quality,
  rssi,
  networkType,
  isConnected,
  isReconnecting,
  reconnectAttempt = 0,
  maxReconnectAttempts = 5,
  compact = false,
}: ConnectionQualityIndicatorProps) {
  const getQualityColor = (q: ConnectionQuality): string => {
    switch (q) {
      case 'excellent':
        return '#10b981'; // green-500
      case 'good':
        return '#22c55e'; // green-400
      case 'fair':
        return '#f59e0b'; // amber-500
      case 'poor':
        return '#ef4444'; // red-500
      case 'critical':
        return '#dc2626'; // red-600
      default:
        return '#6b7280'; // gray-500
    }
  };

  const getQualityText = (q: ConnectionQuality): string => {
    switch (q) {
      case 'excellent':
        return 'Відмінно';
      case 'good':
        return 'Добре';
      case 'fair':
        return 'Задовільно';
      case 'poor':
        return 'Погано';
      case 'critical':
        return 'Критично';
      default:
        return 'Невідомо';
    }
  };

  const getTypeIcon = (): string => {
    switch (type) {
      case 'ble':
        return '󰂯'; // Bluetooth icon
      case 'internet':
        return '󰖟'; // WiFi icon
      case 'coaster':
        return '󰝤'; // Device icon
      default:
        return '•';
    }
  };

  const getTypeLabel = (): string => {
    switch (type) {
      case 'ble':
        return 'Bluetooth';
      case 'internet':
        return 'Інтернет';
      case 'coaster':
        return 'Coaster';
      default:
        return '';
    }
  };

  const qualityColor = getQualityColor(quality);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View
          style={[styles.compactIndicator, { backgroundColor: qualityColor }]}
        />
        <Text style={styles.compactText}>{getTypeLabel()}</Text>
        {isReconnecting && (
          <Text style={styles.reconnectingText}>
            ({reconnectAttempt}/{maxReconnectAttempts})
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>{getTypeIcon()}</Text>
        <Text style={styles.label}>{getTypeLabel()}</Text>
        {isReconnecting && (
          <Text style={styles.reconnectingBadge}>
            Переконнект {reconnectAttempt}/{maxReconnectAttempts}
          </Text>
        )}
      </View>

      <View style={styles.statusRow}>
        <View
          style={[styles.statusIndicator, { backgroundColor: qualityColor }]}
        />
        <Text style={[styles.statusText, { color: qualityColor }]}>
          {isConnected ? 'Підключено' : 'Відключено'}
        </Text>
      </View>

      {isConnected && (
        <View style={styles.detailsContainer}>
          <View style={styles.qualityRow}>
            <Text style={styles.qualityLabel}>Якість:</Text>
            <Text style={[styles.qualityValue, { color: qualityColor }]}>
              {getQualityText(quality)}
            </Text>
          </View>

          {type === 'ble' && rssi !== null && rssi !== undefined && (
            <View style={styles.qualityRow}>
              <Text style={styles.qualityLabel}>Сигнал:</Text>
              <Text style={styles.qualityValue}>{rssi} dBm</Text>
            </View>
          )}

          {type === 'internet' && networkType && (
            <View style={styles.qualityRow}>
              <Text style={styles.qualityLabel}>Тип:</Text>
              <Text style={styles.qualityValue}>
                {networkType.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  compactIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  compactText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  reconnectingText: {
    fontSize: 10,
    color: '#f59e0b',
    marginLeft: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
    color: '#9ca3af',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
    flex: 1,
  },
  reconnectingBadge: {
    fontSize: 11,
    color: '#f59e0b',
    backgroundColor: '#78350f',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  qualityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  qualityLabel: {
    fontSize: 13,
    color: '#9ca3af',
  },
  qualityValue: {
    fontSize: 13,
    color: '#f9fafb',
    fontWeight: '500',
  },
});
