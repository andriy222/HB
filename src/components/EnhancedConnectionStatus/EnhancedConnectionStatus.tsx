/**
 * Enhanced Connection Status Component
 *
 * Покращений компонент для відображення статусу всіх підключень
 * з використанням адаптивного менеджера
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAdaptiveConnectionManager } from '../../hooks/useAdaptiveConnectionManager';
import { useAdaptiveBleScan } from '../../hooks/useAdaptiveBleScan';
import { ConnectionQualityIndicator } from '../ConnectionQualityIndicator';
import { ProfileName, CONNECTION_PROFILES } from '../../config/adaptiveConnectionConfig';

interface EnhancedConnectionStatusProps {
  showProfileSelector?: boolean;
  compact?: boolean;
}

export function EnhancedConnectionStatus({
  showProfileSelector = false,
  compact = false,
}: EnhancedConnectionStatusProps) {
  const connectionManager = useAdaptiveConnectionManager();
  const bleStatus = useAdaptiveBleScan();

  const { status, currentProfile, switchProfile, setAutoProfileSwitch } = connectionManager;

  const handleProfileSwitch = (profileName: ProfileName) => {
    switchProfile(profileName);
  };

  const toggleAutoSwitch = () => {
    setAutoProfileSwitch(!status.profile.auto);
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <ConnectionQualityIndicator
          type="ble"
          quality={status.ble.quality}
          rssi={status.ble.rssi}
          isConnected={status.ble.isConnected}
          isReconnecting={status.ble.isReconnecting}
          reconnectAttempt={status.ble.reconnectAttempt}
          compact
        />
        <ConnectionQualityIndicator
          type="internet"
          quality={status.internet.quality}
          networkType={status.internet.networkType}
          isConnected={status.internet.isOnline}
          compact
        />
        <ConnectionQualityIndicator
          type="coaster"
          quality={
            status.coaster.commandSuccessRate > 0.9
              ? 'excellent'
              : status.coaster.commandSuccessRate > 0.7
              ? 'good'
              : 'fair'
          }
          isConnected={status.coaster.isConnected}
          compact
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Статус підключень</Text>
        {showProfileSelector && (
          <Text style={styles.profileBadge}>
            Профіль: {currentProfile.name}
            {status.profile.auto && ' (авто)'}
          </Text>
        )}
      </View>

      {/* BLE Status */}
      <ConnectionQualityIndicator
        type="ble"
        quality={status.ble.quality}
        rssi={status.ble.rssi}
        isConnected={status.ble.isConnected}
        isReconnecting={status.ble.isReconnecting}
        reconnectAttempt={status.ble.reconnectAttempt}
        maxReconnectAttempts={currentProfile.ble.reconnectMaxAttempts}
      />

      {/* Internet Status */}
      <ConnectionQualityIndicator
        type="internet"
        quality={status.internet.quality}
        networkType={status.internet.networkType}
        isConnected={status.internet.isOnline}
      />

      {/* Coaster Status */}
      <ConnectionQualityIndicator
        type="coaster"
        quality={
          status.coaster.commandSuccessRate > 0.9
            ? 'excellent'
            : status.coaster.commandSuccessRate > 0.7
            ? 'good'
            : status.coaster.commandSuccessRate > 0.5
            ? 'fair'
            : 'poor'
        }
        isConnected={status.coaster.isConnected}
      />

      {/* Profile Selector */}
      {showProfileSelector && (
        <View style={styles.profileSelector}>
          <Text style={styles.sectionTitle}>Профіль підключення</Text>

          <View style={styles.profileButtons}>
            {(Object.keys(CONNECTION_PROFILES) as ProfileName[]).map((name) => {
              const profile = CONNECTION_PROFILES[name];
              const isActive = profile.name === currentProfile.name;

              return (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.profileButton,
                    isActive && styles.profileButtonActive,
                  ]}
                  onPress={() => handleProfileSwitch(name)}
                >
                  <Text
                    style={[
                      styles.profileButtonText,
                      isActive && styles.profileButtonTextActive,
                    ]}
                  >
                    {getProfileLabel(name)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.autoSwitchButton}
            onPress={toggleAutoSwitch}
          >
            <View
              style={[
                styles.checkbox,
                status.profile.auto && styles.checkboxChecked,
              ]}
            >
              {status.profile.auto && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.autoSwitchText}>
              Автоматичне переключення профілів
            </Text>
          </TouchableOpacity>

          {/* Profile Details */}
          <View style={styles.profileDetails}>
            <Text style={styles.detailsTitle}>Параметри профілю:</Text>
            <Text style={styles.detailText}>
              • Сканування BLE: {currentProfile.ble.scanDuration / 1000}с
            </Text>
            <Text style={styles.detailText}>
              • Максимум реконектів: {currentProfile.ble.reconnectMaxAttempts}
            </Text>
            <Text style={styles.detailText}>
              • Таймаут підключення:{' '}
              {currentProfile.ble.connectionTimeout / 1000}с
            </Text>
            <Text style={styles.detailText}>
              • Поріг RSSI: {currentProfile.ble.rssiThreshold} dBm
            </Text>
          </View>
        </View>
      )}

      {/* Statistics */}
      <View style={styles.statistics}>
        <Text style={styles.sectionTitle}>Статистика</Text>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>BLE сканування (успішні/невдалі):</Text>
          <Text style={styles.statValue}>
            {connectionManager.state.stats.ble.successfulScans} /{' '}
            {connectionManager.state.stats.ble.failedScans}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Відключень BLE:</Text>
          <Text style={styles.statValue}>
            {connectionManager.state.stats.ble.connectionDrops}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Команди Coaster (успішні/невдалі):</Text>
          <Text style={styles.statValue}>
            {connectionManager.state.stats.coaster.successfulCommands} /{' '}
            {connectionManager.state.stats.coaster.failedCommands}
          </Text>
        </View>

        {status.internet.totalDowntime > 0 && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Загальний downtime:</Text>
            <Text style={styles.statValue}>
              {Math.round(status.internet.totalDowntime / 1000)}с
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function getProfileLabel(name: ProfileName): string {
  switch (name) {
    case 'standard':
      return 'Стандартний';
    case 'aggressive':
      return 'Агресивний';
    case 'fast':
      return 'Швидкий';
    case 'batterySaver':
      return 'Економія батареї';
    default:
      return name;
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#111827',
  },
  compactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f9fafb',
  },
  profileBadge: {
    fontSize: 12,
    color: '#3b82f6',
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  profileSelector: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 12,
  },
  profileButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  profileButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#374151',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  profileButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  profileButtonText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  profileButtonTextActive: {
    color: '#ffffff',
  },
  autoSwitchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4b5563',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  autoSwitchText: {
    fontSize: 14,
    color: '#f9fafb',
  },
  profileDetails: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#9ca3af',
    marginVertical: 2,
  },
  statistics: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#9ca3af',
  },
  statValue: {
    fontSize: 13,
    color: '#f9fafb',
    fontWeight: '500',
  },
});
