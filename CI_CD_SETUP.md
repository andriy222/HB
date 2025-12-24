# CI/CD Налаштування для Expo проекту

## Огляд

Проект налаштований для автоматичної збірки мобільних додатків (Android та iOS) за допомогою GitHub Actions та EAS (Expo Application Services).

## Техстек

- **Платформа**: Expo ~54.0.12
- **Framework**: React Native 0.81.4
- **Build System**: EAS Build
- **CI/CD**: GitHub Actions

## Типи збірок

### 1. **Development** (для розробки)

- Android: APK
- iOS: Simulator build
- Distribution: Internal

### 2. **Preview** (для тестування)

- Android: APK
- iOS: Release build (не для симулятора)
- Distribution: Internal
- Використовується для Pull Requests

### 3. **Production** (для продакшену)

- Android: AAB (для Google Play Store)
- iOS: Release build
- Auto-increment version
- Використовується для релізів

### 4. **Production-APK** (альтернатива для продакшену)

- Android: APK (якщо потрібен APK замість AAB)
- Розширює production профіль

## Налаштування

### Крок 1: Встановлення EAS CLI (локально)

```bash
npm install -g eas-cli
```

### Крок 2: Отримання EXPO_TOKEN

1. Залогіньтесь в Expo:

   ```bash
   eas login
   ```

2. Створіть токен:

   ```bash
   eas whoami
   eas build:configure
   ```

3. Отримайте токен для CI/CD:

   ```bash
   eas token:create
   ```

   Збережіть цей токен - він вам знадобиться!

### Крок 3: Налаштування GitHub Secrets

Перейдіть в GitHub Repository → Settings → Secrets and variables → Actions і додайте:

**Обов'язкові:**

- `EXPO_TOKEN` - токен з EAS CLI (отриманий на кроці 2)

### Крок 4: Налаштування креденшелів для iOS

#### Варіант A: Автоматичне управління (рекомендовано)

EAS автоматично керує сертифікатами при першій збірці:

```bash
eas build --platform ios --profile preview
```

#### Варіант B: Використання існуючих сертифікатів

1. Завантажте існуючі креденшели:

   ```bash
   eas credentials
   ```

2. Виберіть iOS → Production/Development → Manage

### Крок 5: Налаштування креденшелів для Android

#### Варіант A: Автоматичне створення keystore

EAS автоматично створить keystore при першій збірці:

```bash
eas build --platform android --profile preview
```

#### Варіант B: Використання існуючого keystore

1. Завантажте keystore:

   ```bash
   eas credentials
   ```

2. Виберіть Android → Production/Development → Keystore

## Використання CI/CD

### Автоматичні збірки

1. **При Push в master/main** - автоматично запускається production збірка
2. **При створенні Pull Request** - автоматично запускається preview збірка

### Ручний запуск

1. Перейдіть в GitHub Repository → Actions
2. Виберіть workflow "Build Mobile Apps"
3. Натисніть "Run workflow"
4. Оберіть параметри:
   - **Platform**: `all`, `android`, або `ios`
   - **Profile**: `production` або `preview`

### Локальні збірки

```bash
# Preview Android
eas build --platform android --profile preview

# Production iOS
eas build --platform ios --profile production

# Production APK
eas build --platform android --profile production-apk
```

## Доступ до артефактів

### З EAS Dashboard

1. Відкрийте https://expo.dev/accounts/[your-account]/projects/hybit-test/builds
2. Оберіть потрібну збірку
3. Завантажте APK/AAB/IPA

### З GitHub Actions

1. Перейдіть в GitHub Repository → Actions
2. Виберіть завершений workflow
3. Завантажте артефакти з секції "Artifacts"

## Моніторинг збірок

### EAS CLI

```bash
# Переглянути список збірок
eas build:list

# Деталі конкретної збірки
eas build:view [BUILD_ID]
```

### GitHub Actions

Всі збірки відображаються в розділі Actions з детальними логами.

## Troubleshooting

### Помилка: "EXPO_TOKEN not found"

Переконайтесь, що ви додали `EXPO_TOKEN` в GitHub Secrets.

### Помилка при збірці iOS: "No credentials found"

Запустіть локально:

```bash
eas build --platform ios --profile preview
```

EAS запитає креденшели і збереже їх.

### Помилка при збірці Android: "Keystore not found"

Запустіть локально:

```bash
eas build --platform android --profile preview
```

EAS створить keystore автоматично.

### Збірка зависла на "Waiting for build"

Перевірте черги збірок на https://expo.dev - можливо, є обмеження на безкоштовному плані.

## Додаткові команди

```bash
# Оновити OTA (Over-The-Air) для iOS
npm run update-ios

# Запустити development збірку
eas build --platform all --profile development

# Submission до Store (після production збірки)
eas submit --platform android --latest
eas submit --platform ios --latest
```

## Структура файлів

```
.
├── .github/
│   └── workflows/
│       └── build-apps.yml          # GitHub Actions workflow
├── eas.json                        # Конфігурація EAS Build
├── app.json                        # Конфігурація Expo
└── CI_CD_SETUP.md                 # Ця документація
```

## Корисні посилання

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Expo Application Services](https://expo.dev/eas)

## Підтримка

Для питань та проблем створіть issue в репозиторії або зверніться до команди розробки.
