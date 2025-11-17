/**
 * Adaptive Connection Configuration
 *
 * Гнучка система налаштувань для адаптивного визначення підключень
 * до інтернету, Bluetooth та Coaster пристрою
 */

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
export type NetworkType = 'wifi' | 'cellular' | 'ethernet' | 'unknown';

/**
 * Профілі підключення для різних сценаріїв
 */
export interface ConnectionProfile {
  name: string;
  ble: {
    scanDuration: number;
    scanRetries: number;
    connectionTimeout: number;
    reconnectMaxAttempts: number;
    reconnectInitialDelay: number;
    reconnectMaxDelay: number;
    rssiThreshold: number; // мінімальний RSSI для гарного сигналу
  };
  internet: {
    checkInterval: number;
    qualityCheckEnabled: boolean;
    offlineRetryDelay: number;
  };
  coaster: {
    protocolIdleTimeout: number;
    backfillStabilizationDelay: number;
    autoSyncDelay: number;
    commandRetryAttempts: number;
  };
}

/**
 * Стандартний профіль - базові налаштування
 */
export const STANDARD_PROFILE: ConnectionProfile = {
  name: 'standard',
  ble: {
    scanDuration: 10000, // 10 сек
    scanRetries: 3,
    connectionTimeout: 10000,
    reconnectMaxAttempts: 5, // збільшено з 3
    reconnectInitialDelay: 1000,
    reconnectMaxDelay: 30000,
    rssiThreshold: -80, // dBm
  },
  internet: {
    checkInterval: 30000, // перевірка кожні 30 сек
    qualityCheckEnabled: true,
    offlineRetryDelay: 5000,
  },
  coaster: {
    protocolIdleTimeout: 3000,
    backfillStabilizationDelay: 500,
    autoSyncDelay: 250,
    commandRetryAttempts: 3,
  },
};

/**
 * Агресивний профіль - для слабкого сигналу
 * Довші таймаути, більше спроб
 */
export const AGGRESSIVE_PROFILE: ConnectionProfile = {
  name: 'aggressive',
  ble: {
    scanDuration: 20000, // 20 сек - довше сканування
    scanRetries: 5,
    connectionTimeout: 15000,
    reconnectMaxAttempts: 10,
    reconnectInitialDelay: 2000,
    reconnectMaxDelay: 60000,
    rssiThreshold: -90, // нижчий поріг
  },
  internet: {
    checkInterval: 15000, // частіше перевірка
    qualityCheckEnabled: true,
    offlineRetryDelay: 3000,
  },
  coaster: {
    protocolIdleTimeout: 5000, // довший timeout
    backfillStabilizationDelay: 1000,
    autoSyncDelay: 500,
    commandRetryAttempts: 5,
  },
};

/**
 * Швидкий профіль - для відмінного сигналу
 * Коротші таймаути, швидші операції
 */
export const FAST_PROFILE: ConnectionProfile = {
  name: 'fast',
  ble: {
    scanDuration: 5000, // 5 сек
    scanRetries: 2,
    connectionTimeout: 5000,
    reconnectMaxAttempts: 3,
    reconnectInitialDelay: 500,
    reconnectMaxDelay: 15000,
    rssiThreshold: -70,
  },
  internet: {
    checkInterval: 60000, // рідше перевірка
    qualityCheckEnabled: false,
    offlineRetryDelay: 2000,
  },
  coaster: {
    protocolIdleTimeout: 2000,
    backfillStabilizationDelay: 250,
    autoSyncDelay: 100,
    commandRetryAttempts: 2,
  },
};

/**
 * Енергозберігаючий профіль
 * Для роботи від батареї
 */
export const BATTERY_SAVER_PROFILE: ConnectionProfile = {
  name: 'battery_saver',
  ble: {
    scanDuration: 8000,
    scanRetries: 2,
    connectionTimeout: 12000,
    reconnectMaxAttempts: 3,
    reconnectInitialDelay: 2000,
    reconnectMaxDelay: 60000, // довгі паузи між спробами
    rssiThreshold: -85,
  },
  internet: {
    checkInterval: 120000, // рідко перевіряємо (2 хв)
    qualityCheckEnabled: false,
    offlineRetryDelay: 10000,
  },
  coaster: {
    protocolIdleTimeout: 4000,
    backfillStabilizationDelay: 1000,
    autoSyncDelay: 500,
    commandRetryAttempts: 2,
  },
};

/**
 * Стан адаптивного менеджера підключень
 */
export interface AdaptiveConnectionState {
  // Поточний профіль
  currentProfile: ConnectionProfile;

  // Статистика підключень
  stats: {
    ble: {
      successfulScans: number;
      failedScans: number;
      averageScanTime: number;
      lastRssi: number | null;
      connectionDrops: number;
      lastConnectionQuality: ConnectionQuality;
    };
    internet: {
      isOnline: boolean;
      networkType: NetworkType;
      lastCheckTime: number;
      connectionQuality: ConnectionQuality;
      downtime: number; // загальний час офлайн (мс)
    };
    coaster: {
      isConnected: boolean;
      lastCommandLatency: number | null;
      failedCommands: number;
      successfulCommands: number;
      protocolErrors: number;
    };
  };

  // Адаптивні налаштування
  adaptive: {
    autoProfileSwitch: boolean; // автоматично переключати профілі
    learningEnabled: boolean; // вчитись на основі історії
    lastProfileSwitch: number; // timestamp останньої зміни профілю
  };
}

/**
 * Початковий стан
 */
export const INITIAL_ADAPTIVE_STATE: AdaptiveConnectionState = {
  currentProfile: STANDARD_PROFILE,
  stats: {
    ble: {
      successfulScans: 0,
      failedScans: 0,
      averageScanTime: 0,
      lastRssi: null,
      connectionDrops: 0,
      lastConnectionQuality: 'good',
    },
    internet: {
      isOnline: false,
      networkType: 'unknown',
      lastCheckTime: 0,
      connectionQuality: 'good',
      downtime: 0,
    },
    coaster: {
      isConnected: false,
      lastCommandLatency: null,
      failedCommands: 0,
      successfulCommands: 0,
      protocolErrors: 0,
    },
  },
  adaptive: {
    autoProfileSwitch: true,
    learningEnabled: true,
    lastProfileSwitch: 0,
  },
};

/**
 * Визначення якості з'єднання на основі RSSI
 */
export function getRssiQuality(rssi: number): ConnectionQuality {
  if (rssi >= -60) return 'excellent';
  if (rssi >= -70) return 'good';
  if (rssi >= -80) return 'fair';
  if (rssi >= -90) return 'poor';
  return 'critical';
}

/**
 * Вибір профілю на основі статистики
 */
export function selectOptimalProfile(
  state: AdaptiveConnectionState
): ConnectionProfile {
  const { stats } = state;

  // Якщо автоперемикання вимкнено - використовуємо поточний
  if (!state.adaptive.autoProfileSwitch) {
    return state.currentProfile;
  }

  // Рахуємо показник успішності BLE
  const bleSuccessRate = stats.ble.successfulScans /
    Math.max(1, stats.ble.successfulScans + stats.ble.failedScans);

  // Рахуємо показник успішності команд
  const commandSuccessRate = stats.coaster.successfulCommands /
    Math.max(1, stats.coaster.successfulCommands + stats.coaster.failedCommands);

  // Якість BLE сигналу
  const bleQuality = stats.ble.lastConnectionQuality;

  // Вибір профілю:

  // Критичні умови - агресивний профіль
  if (
    bleQuality === 'critical' ||
    bleQuality === 'poor' ||
    bleSuccessRate < 0.5 ||
    stats.ble.connectionDrops > 3
  ) {
    return AGGRESSIVE_PROFILE;
  }

  // Відмінні умови - швидкий профіль
  if (
    bleQuality === 'excellent' &&
    bleSuccessRate > 0.9 &&
    commandSuccessRate > 0.95 &&
    stats.internet.connectionQuality === 'excellent'
  ) {
    return FAST_PROFILE;
  }

  // За замовчуванням - стандартний
  return STANDARD_PROFILE;
}

/**
 * Обчислення затримки для наступної спроби реконекту
 * з експоненціальним backoff та jitter
 */
export function calculateReconnectDelay(
  attempt: number,
  profile: ConnectionProfile,
  addJitter: boolean = true
): number {
  const { reconnectInitialDelay, reconnectMaxDelay } = profile.ble;

  // Експоненціальний backoff
  let delay = Math.min(
    reconnectMaxDelay,
    reconnectInitialDelay * Math.pow(2, attempt)
  );

  // Додаємо випадковість (jitter) для уникнення thundering herd
  if (addJitter) {
    const jitterPercent = 0.3; // ±30%
    const jitter = delay * jitterPercent * (Math.random() * 2 - 1);
    delay = Math.max(reconnectInitialDelay, delay + jitter);
  }

  return Math.floor(delay);
}

/**
 * Adaptive scan duration на основі історії
 */
export function calculateAdaptiveScanDuration(
  state: AdaptiveConnectionState
): number {
  const { stats, currentProfile } = state;
  const baseDuration = currentProfile.ble.scanDuration;

  // Якщо часто не знаходимо - збільшуємо час сканування
  if (stats.ble.failedScans > stats.ble.successfulScans) {
    return Math.min(baseDuration * 2, 30000); // макс 30 сек
  }

  // Якщо завжди швидко знаходимо - можна зменшити
  if (
    stats.ble.averageScanTime > 0 &&
    stats.ble.averageScanTime < baseDuration * 0.5
  ) {
    return Math.max(baseDuration * 0.7, 5000); // мін 5 сек
  }

  return baseDuration;
}

export const CONNECTION_PROFILES = {
  standard: STANDARD_PROFILE,
  aggressive: AGGRESSIVE_PROFILE,
  fast: FAST_PROFILE,
  batterySaver: BATTERY_SAVER_PROFILE,
} as const;

export type ProfileName = keyof typeof CONNECTION_PROFILES;
