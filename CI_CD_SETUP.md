# CI/CD Налаштування для Expo проекту

## Огляд

Проект налаштований для автоматичної збірки мобільних додатків (Android та iOS) за допомогою GitHub Actions та EAS (Expo Application Services).

## Техстек

- **Платформа**: Expo ~54.0.12
- **Framework**: React Native 0.81.4
- **Build System**: EAS Build
- **CI/CD**: GitHub Actions

## Важливо про iOS білди

**Для iOS білдів потрібен Apple Developer Account:**
- **Безкоштовний аккаунт**: можна створювати Ad Hoc білди (до 100 пристроїв)
- **Платний аккаунт ($99/рік)**: повний доступ до TestFlight та App Store

**Автоматичні білди в CI/CD:**
- **Android** - білдиться автоматично при кожному push/PR
- **iOS** - потрібно запускати вручну через "Run workflow" (бо потрібен платний аккаунт)

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

### 5. **Ad Hoc** (безкоштовне розповсюдження iOS)
- Android: APK
- iOS: Ad Hoc білд (для зареєстрованих пристроїв)
- Працює з безкоштовним Apple Developer Account
- Ідеально для розповсюдження через Diawi

## Безкоштовне розповсюдження iOS (через Diawi)

### Що таке Diawi?

**Diawi** (https://www.diawi.com) - безкоштовний сервіс для розповсюдження iOS та Android додатків:
- Завантажуєте IPA/APK файл
- Отримуєте посилання для встановлення
- Тестери відкривають посилання на пристрої і встановлюють додаток

### Як використовувати Diawi з безкоштовним Apple Account:

#### 1. **Зареєструйте безкоштовний Apple Developer Account**
   - Перейдіть на https://developer.apple.com
   - Натисніть "Account" і зареєструйтесь (безкоштовно)

#### 2. **Отримайте UDID пристроїв тестерів**

Є кілька способів:

**Спосіб A - Через Diawi:**
1. Відкрийте https://www.diawi.com на iPhone
2. Натисніть "Find my UDID"
3. Скопіюйте UDID

**Спосіб B - Через iTunes/Finder:**
1. Підключіть iPhone до Mac
2. Відкрийте Finder (macOS Catalina+) або iTunes
3. Клікніть на пристрій
4. Знайдіть UDID (може називатись "Serial Number")

**Спосіб C - На самому iPhone:**
1. Settings → General → About
2. Знайдіть "Identifier" або попросіть тестера установити профіль конфігурації

#### 3. **Зареєструйте пристрої в EAS**

```bash
# Додайте UDID пристроїв
eas device:create

# Або відредагуйте список вручну
eas device:list
```

Альтернативно створіть файл `devices.json`:
```json
[
  {
    "udid": "00008030-001234567890ABCD",
    "name": "iPhone тестера 1"
  },
  {
    "udid": "00008030-FEDCBA0987654321",
    "name": "iPhone тестера 2"
  }
]
```

#### 4. **Створіть Ad Hoc білд**

```bash
eas build --platform ios --profile adhoc
```

EAS попросить залогінитись з вашим безкоштовним Apple ID і автоматично створить Ad Hoc provisioning profile з зареєстрованими пристроями.

#### 5. **Завантажте IPA з EAS**

Після завершення збірки:
```bash
# Отримайте URL білду
eas build:list --platform ios --limit 1

# Або завантажте через Dashboard
# https://expo.dev/accounts/[your-account]/projects/hybit-test/builds
```

#### 6. **Завантажте IPA на Diawi**

1. Перейдіть на https://www.diawi.com
2. Перетягніть IPA файл
3. (Опціонально) Увімкніть "Allow your testers to find the app using their UDID"
4. Натисніть "Send"
5. Скопіюйте посилання і відправте тестерам

#### 7. **Тестери встановлюють додаток**

1. Відкрийте посилання Diawi на iPhone (в Safari)
2. Натисніть "Install"
3. Перейдіть в Settings → General → Device Management
4. Довірте сертифікату розробника
5. Готово!

### Обмеження безкоштовного Apple Account:

- Максимум **100 пристроїв** на рік (ліміт скидається щороку)
- Сертифікати дійсні **7 днів** (потім потрібно перезбілдити)
- Немає доступу до TestFlight
- Немає публікації в App Store

### Альтернативи Diawi:

- **InstallOnAir** (https://www.installonair.com)
- **AppCenter** від Microsoft (https://appcenter.ms)
- **Firebase App Distribution** (https://firebase.google.com/products/app-distribution)

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
# Preview збірка для Android
eas build --platform android --profile preview

# Production збірка для iOS
eas build --platform ios --profile production

# Production APK замість AAB
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
