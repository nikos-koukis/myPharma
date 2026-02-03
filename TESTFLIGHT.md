# Prepare Expo Build & TestFlight Deployment

## Prerequisites
1. **Apple Developer Program** — Enroll at https://developer.apple.com/programs/ ($99/year). Without this, you cannot submit to TestFlight. Enrollment can take up to 48 hours for approval.
2. **Expo account** — Already have one.
3. **EAS CLI** — Install globally: `npm install -g eas-cli`

## Steps

### 1. Install EAS CLI & login
```bash
npm install -g eas-cli
eas login
```

### 2. Update `mobile/app.config.ts`
Add iOS-specific fields required for App Store / TestFlight:
- `ios.bundleIdentifier`: `'gr.k-tech.mypharma'`
- `ios.buildNumber`: `'1'`
- `android.package`: `'gr.k_tech.mypharma'` (underscore — Android doesn't allow hyphens)
- `android.versionCode`: `1`

Also add `owner` field matching your Expo account username.

### 3. Create `mobile/eas.json`
EAS Build configuration with 3 profiles:
- **development** — dev client for local testing
- **preview** — internal distribution (ad-hoc) for testing on devices
- **production** — App Store / TestFlight submission

```json
{
  "cli": { "version": ">= 15.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "<your-apple-id-email>",
        "ascAppId": "<from-app-store-connect>",
        "appleTeamId": "<your-team-id>"
      }
    }
  }
}
```

### 4. Configure EAS project
```bash
cd mobile
eas init
```
This links the project to your Expo account.

### 5. Build for iOS (TestFlight)
```bash
eas build --platform ios --profile production
```
EAS will:
- Ask you to log in to Apple Developer account
- Auto-generate provisioning profiles & certificates
- Build in the cloud
- Produce an `.ipa` file

### 6. Submit to TestFlight
```bash
eas submit --platform ios
```
Or configure auto-submit in eas.json by adding `"autoSubmit": true` to the production profile.

---

## Files to modify

### `mobile/app.config.ts`
- Add `ios.bundleIdentifier`
- Add `ios.buildNumber`
- Add `android.package`
- Add `android.versionCode`
- Hardcode `API_ENV` to `'PRODUCTION'` for production builds (or use EAS env vars)
- Add `owner` field

### `mobile/eas.json` (new file)
- Build profiles (development, preview, production)
- Submit config for iOS

---

## After Apple Developer enrollment
1. Go to https://appstoreconnect.apple.com
2. Create a new app with bundle ID `gr.k-tech.mypharma`
3. Note the `ascAppId` (Apple Store Connect App ID) for eas.json submit config
4. Run `eas build` and `eas submit`
5. In App Store Connect, add testers to TestFlight

## Verification
- `eas build --platform ios --profile production` completes
- `eas submit --platform ios` uploads to TestFlight
- App appears in TestFlight for testers
