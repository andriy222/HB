# CI/CD Setup Guide for Hybit NeuraFlow

Цей гайд допоможе налаштувати автоматичні білди для iOS та Android при кожному коміті.

## 📋 Зміст

1. [Налаштування EAS](#налаштування-eas)
2. [GitHub Secrets](#github-secrets)
3. [Налаштування Apple/Google облікових записів](#налаштування-облікових-записів)
4. [Тестування Workflows](#тестування-workflows)

---

## 🚀 Налаштування EAS

### 1. Встановіть EAS CLI (якщо ще не встановлено)

```bash
npm install -g eas-cli
```

### 2. Увійдіть в Expo акаунт

```bash
eas login
```

### 3. Налаштуйте project (вже налаштовано)

```bash
eas build:configure
```

Проект вже налаштований з projectId: `b4f1d2b2-877e-408f-b345-5635f69c30ce`

---

## 🔐 GitHub Secrets

Додайте наступні secrets до вашого GitHub репозиторію (Settings → Secrets and variables → Actions → New repository secret):

### Обов'язкові Secrets

| Secret Name | Опис | Як отримати |
|------------|------|-------------|
| `EXPO_TOKEN` | Токен для автентифікації з Expo | `eas whoami` → `expo.dev/settings/access-tokens` |

### Secrets для iOS (TestFlight)

| Secret Name | Опис | Приклад |
|------------|------|---------|
| `EXPO_APPLE_ID` | Apple ID для App Store Connect | `your-email@example.com` |
| `EXPO_ASC_APP_ID` | App Store Connect App ID | `1234567890` |
| `EXPO_APPLE_TEAM_ID` | Apple Developer Team ID | `ABCD123456` |

### Secrets для Android (Google Play)

| Secret Name | Опис | Як отримати |
|------------|------|-------------|
| `EXPO_ANDROID_SERVICE_ACCOUNT_KEY` | JSON key для Google Play | Google Cloud Console → Service Accounts |

---

## 📱 Налаштування Облікових Записів

### iOS (Apple Developer)

1. **Створіть App в App Store Connect**
   - Зайдіть на [App Store Connect](https://appstoreconnect.apple.com)
   - Створіть новий App
   - Bundle ID: `com.d.yuhymenko.hybittest`
   - Скопіюйте ASC App ID (1234567890)

2. **Отримайте Team ID**
   ```bash
   # В eas.json вже є bundleIdentifier
   # Team ID можна знайти в Apple Developer Portal → Membership
   ```

3. **Налаштуйте App-Specific Password (для автоматичного submit)**
   - Зайдіть на [appleid.apple.com](https://appleid.apple.com)
   - Security → App-Specific Passwords
   - Створіть пароль для EAS

4. **Оновіть eas.json з правильними даними**
   ```json
   "submit": {
     "production": {
       "ios": {
         "appleId": "your-real-email@example.com",
         "ascAppId": "your-real-asc-app-id",
         "appleTeamId": "your-real-team-id"
       }
     }
   }
   ```

### Android (Google Play)

1. **Створіть App в Google Play Console**
   - Bundle ID: `com.d.yuhymenko.hybittest`

2. **Створіть Service Account**
   - Google Cloud Console → IAM & Admin → Service Accounts
   - Create Service Account
   - Grant permissions для Google Play Android Developer API
   - Create JSON key
   - Збережіть JSON файл як `google-service-account.json` (НЕ комітьте в git!)

3. **Додайте Service Account до Google Play Console**
   - Google Play Console → Users and permissions
   - Invite new users → Service Account
   - Надайте права Release Manager

4. **Додайте JSON до GitHub Secrets**
   ```bash
   # Скопіюйте вміст JSON файлу
   cat google-service-account.json
   # Створіть Secret EXPO_ANDROID_SERVICE_ACCOUNT_KEY з цим вмістом
   ```

---

## 🧪 Тестування Workflows

### Автоматичний білд при push

```bash
# Коміт змін в main/master автоматично запустить білди для обох платформ
git add .
git commit -m "feat: new feature"
git push origin main
```

### Ручний білд (Manual Trigger)

1. Зайдіть на GitHub → Actions
2. Виберіть "EAS Build" workflow
3. Натисніть "Run workflow"
4. Виберіть платформу (iOS/Android/All) і профіль (development/preview/production)
5. Натисніть "Run workflow"

### Submit до App Stores

1. Зайдіть на GitHub → Actions
2. Виберіть "EAS Submit to Stores" workflow
3. Натисніть "Run workflow"
4. Виберіть платформу (iOS/Android/All)
5. Натисніть "Run workflow"

---

## 📊 Build Profiles

| Profile | Використання | iOS Output | Android Output |
|---------|--------------|-----------|----------------|
| `development` | Local розробка | Simulator build | APK для dev |
| `preview` | Internal testing | Ad-hoc IPA | APK |
| `production` | App Store/Play Store | App Store IPA | AAB Bundle |
| `ci-ios` | CI/CD auto builds | Internal IPA | - |
| `ci-android` | CI/CD auto builds | - | APK |

---

## 🔄 Workflow Triggers

### EAS Build Workflow

**Автоматичний тригер:**
- Push до `main` або `master` branch
- Білдить обидві платформи (iOS + Android) з профілем `ci-ios` та `ci-android`

**Ручний тригер:**
- GitHub Actions → "Run workflow"
- Можна вибрати платформу та профіль

### EAS Submit Workflow

**Тільки ручний тригер:**
- GitHub Actions → "Run workflow"
- Автоматично бере останній успішний білд і відправляє в App Store/Play Store

---

## 📝 Наступні Кроки

1. ✅ Створіть Expo токен: `expo.dev/settings/access-tokens`
2. ✅ Додайте `EXPO_TOKEN` до GitHub Secrets
3. ✅ Налаштуйте Apple Developer облік і додайте iOS secrets (якщо потрібен TestFlight)
4. ✅ Налаштуйте Google Play Console і додайте Android secrets (якщо потрібен Play Store)
5. ✅ Оновіть `eas.json` з правильними email та ID
6. ✅ Зробіть тестовий коміт і перевірте що workflow запускається
7. ✅ Перевірте білди на [expo.dev/accounts/[username]/projects/hybit-test/builds](https://expo.dev)

---

## 🆘 Troubleshooting

### Build Failed - "EXPO_TOKEN not found"
- Переконайтеся що ви додали `EXPO_TOKEN` до GitHub Secrets
- Токен повинен бути валідним (не expired)

### iOS Build Failed - "Invalid provisioning profile"
- Запустіть `eas build --platform ios --profile production` локально
- EAS автоматично створить certificates і provisioning profiles

### Android Build Failed - "Keystore not found"
- EAS автоматично створить keystore при першому білді
- Переконайтеся що ви не змінювали package name після першого білда

### Submit Failed - "Invalid credentials"
- Перевірте що всі iOS/Android secrets правильні
- Для iOS: переконайтеся що App-Specific Password створений
- Для Android: переконайтеся що Service Account має правильні права

---

## 📚 Корисні Посилання

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [GitHub Actions with EAS](https://docs.expo.dev/build/building-on-ci/)
- [TestFlight Setup](https://docs.expo.dev/submit/ios/)
- [Google Play Setup](https://docs.expo.dev/submit/android/)
