# Централізований моніторинг підключень

Проста реактивна система моніторингу підключень до Internet, Bluetooth та Coaster.

## 🎯 Що це дає

- **Реактивність** - алерти автоматично з'являються/зникають
- **Централізовано** - один стор для всіх підключень
- **Просто** - без зайвої складності з якістю
- **Блокування** - неможливо почати гонку без підключень

## 📁 Файли

```
src/
├── hooks/
│   └── useConnectionMonitor.ts          # Глобальний стор та хук
├── components/
│   ├── ConnectionAlert/
│   │   └── ConnectionAlerts.tsx         # Реактивні алерти
│   └── ConnectionGuard/
│       └── ConnectionGuard.tsx          # Блокування функціоналу
```

## 🔧 Як працює

### 1. Глобальний стор

`connectionStore` - це єдиний стор що зберігає стан всіх підключень:

```typescript
{
  ble: { isConnected: boolean, isReconnecting: boolean },
  internet: { isConnected: boolean },
  coaster: { isConnected: boolean }
}
```

### 2. Автоматичне оновлення

- **Internet** - моніториться через `NetInfo.addEventListener()`
- **BLE** - оновлюється з `useBleScan` через `connectionStore.updateBle()`
- **Coaster** - оновлюється з `useConnectionStatus` через `connectionStore.updateCoaster()`

### 3. Реактивні компоненти

Всі компоненти підписані на зміни через `useGlobalConnectionMonitor()` і автоматично оновлюються.

## 🚀 Використання

### Перевірка підключень

```typescript
import { useGlobalConnectionMonitor } from '@/hooks/useConnectionMonitor';

function MyComponent() {
  const monitor = useGlobalConnectionMonitor();

  if (!monitor.hasAllConnections) {
    return <Text>Відсутні: {monitor.missingConnections.join(', ')}</Text>;
  }

  return <Text>Всі підключення є!</Text>;
}
```

### Блокування функціоналу

```typescript
import { ConnectionGuard, useCanStartRace } from '@/components/ConnectionGuard';

function RaceScreen() {
  const canStart = useCanStartRace();

  return (
    <ConnectionGuard onBlockedPress={() => console.log('Налаштуй підключення!')}>
      <Button
        title="Почати гонку"
        disabled={!canStart}
        onPress={startRace}
      />
    </ConnectionGuard>
  );
}
```

### Показ алертів

```typescript
import ConnectionAlerts from '@/components/ConnectionAlert/ConnectionAlerts';

function MyScreen() {
  return (
    <View>
      {/* Алерти автоматично з'являються/зникають */}
      <ConnectionAlerts />

      {/* Решта контенту */}
      <MyContent />
    </View>
  );
}
```

### Ручне оновлення (якщо потрібно)

```typescript
import { connectionStore } from '@/hooks/useConnectionMonitor';

// Оновити BLE статус
connectionStore.updateBle(true, false); // isConnected, isReconnecting

// Оновити Internet статус
connectionStore.updateInternet(true);

// Оновити Coaster статус
connectionStore.updateCoaster(true);
```

## 🔄 Реактивність

### ConnectionAlerts

Автоматично показує/ховає алерти:

```typescript
// Коли з'являється підключення → алерт зникає
// Коли зникає підключення → алерт з'являється

{!status.internet.isConnected && (
  <ConnectionAlert type="internet" ... />
)}
```

### Показ реконекту

Коли BLE переконектиться - показується банер:

```typescript
{monitor.state.ble.isReconnecting && (
  <View style={styles.reconnectingBanner}>
    <Text>🔄 Переконнект до Bluetooth...</Text>
  </View>
)}
```

### ConnectionGuard

Блокує функціонал поки немає всіх підключень:

```typescript
<ConnectionGuard>
  {/* Цей контент показується тільки коли є ВСІ підключення */}
  <RaceButton />
</ConnectionGuard>

// Якщо відсутні підключення - показується блокувальний екран
```

## 📊 API

### `useGlobalConnectionMonitor()`

Головний хук для отримання стану підключень:

```typescript
const monitor = useGlobalConnectionMonitor();

// Стан підключень
monitor.state.ble.isConnected      // чи підключено BLE
monitor.state.ble.isReconnecting   // чи йде переконнект
monitor.state.internet.isConnected // чи є інтернет
monitor.state.coaster.isConnected  // чи підключено coaster

// Перевірки
monitor.hasAllConnections          // чи всі підключення є
monitor.missingConnections         // ['internet', 'bluetooth', ...]
monitor.canStartRace               // чи можна почати гонку
```

### `connectionStore`

Глобальний стор (singleton):

```typescript
// Підписка на зміни
const unsubscribe = connectionStore.subscribe((newState) => {
  console.log('Стан змінився:', newState);
});

// Отримання поточного стану
const state = connectionStore.getState();

// Оновлення
connectionStore.updateBle(isConnected, isReconnecting);
connectionStore.updateInternet(isConnected);
connectionStore.updateCoaster(isConnected);
```

### `useCanStartRace()`

Простий хук для перевірки чи можна починати гонку:

```typescript
const canStart = useCanStartRace();

<Button disabled={!canStart} title="Почати" />
```

## 🎨 Приклад повної інтеграції

```typescript
import React from 'react';
import { View, Button } from 'react-native';
import { useGlobalConnectionMonitor } from '@/hooks/useConnectionMonitor';
import { ConnectionGuard } from '@/components/ConnectionGuard';
import ConnectionAlerts from '@/components/ConnectionAlert/ConnectionAlerts';

function RaceScreen() {
  const monitor = useGlobalConnectionMonitor();

  const startRace = () => {
    if (!monitor.canStartRace) {
      alert('Потрібні всі підключення!');
      return;
    }

    // Починаємо гонку
    console.log('Гонка почалась!');
  };

  return (
    <View>
      {/* Показуємо алерти якщо є проблеми */}
      <ConnectionAlerts />

      {/* Блокуємо кнопку якщо немає підключень */}
      <ConnectionGuard>
        <Button
          title="Почати гонку"
          onPress={startRace}
          disabled={!monitor.canStartRace}
        />
      </ConnectionGuard>

      {/* Показуємо статус */}
      {monitor.state.ble.isReconnecting && (
        <Text>Переконнект...</Text>
      )}
    </View>
  );
}
```

## 🔍 Як це працює під капотом

1. **NetInfo** слухає зміни інтернету → оновлює `connectionStore`
2. **useBleScan** слухає BLE → оновлює `connectionStore` через `useEffect`
3. **useConnectionStatus** слухає Coaster → оновлює `connectionStore` через `useEffect`
4. **connectionStore** нотифікує всіх підписників
5. **Компоненти** автоматично ре-рендеряться з новим станом

## ✅ Переваги

- ✅ Просто - без зайвої складності
- ✅ Реактивно - все оновлюється автоматично
- ✅ Централізовано - один стор для всіх
- ✅ Блокування - неможливо почати без підключень
- ✅ Показ реконекту - користувач бачить що відбувається

---

**Створено:** 2025-11-17
