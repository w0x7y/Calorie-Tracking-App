# Release Checklist

## Before the first App Store build

- Confirm the app identifiers in [app.json](/C:/Users/idang/CodeCody/App/Calorie-Tracking-App/app.json) are the ones you want to keep:
  - `ios.bundleIdentifier`
  - `android.package`
- Keep `version`, `ios.buildNumber`, and `android.versionCode` moving forward for each release.
- Decide on your production food-search setup:
  - Recommended: use your own backend proxy and set `EXPO_PUBLIC_FOOD_API_BASE_URL`
  - Local-only fallback: keep `EXPO_PUBLIC_CALORIE_NINJAS_API_KEY` for development
- Make sure the production proxy supports:
  - `GET /nutrition?query=<search text>`
  - response shape: `{ "items": [...] }` using CalorieNinjas-compatible nutrition items
- Test the app on a real iPhone with a native build:
  - food search
  - barcode scanning
  - Apple Health permission flow
  - step syncing
  - denied-permission behavior
  - offline/error states

## App Store Connect

- Create the app record using the same iOS bundle identifier as the repo config.
- Fill in:
  - app name
  - subtitle
  - description
  - keywords
  - support URL
  - privacy policy URL
  - screenshots
  - app icon / marketing assets
- Add review notes explaining:
  - the app reads step count from Apple Health
  - Health permissions are optional
  - there is no account login required

## Privacy and compliance

- Complete the App Privacy questionnaire in App Store Connect.
- Disclose the health data you access:
  - step count from Apple Health
- Disclose networked features:
  - food search API requests
  - barcode lookup requests
- Verify you are not using health data for advertising, profiling, or third-party marketing use.
- Add a `PrivacyInfo.xcprivacy` manifest if your final native build requires one after dependency review.

## Repo and build hygiene

- Keep these out of Git:
  - `.env`
  - signing keys and certificates
  - generated `ios/` and `android/` folders unless you intentionally commit prebuilt native code
- Keep these in Git:
  - `.env.example`
  - `eas.json`
  - release documentation
- Build commands:
  - `eas build --platform ios --profile production`
  - `eas submit --platform ios --profile production`

## Production API notes

- `EXPO_PUBLIC_*` variables are readable from the client app bundle after shipping.
- Do not rely on `EXPO_PUBLIC_CALORIE_NINJAS_API_KEY` as a secret in production.
- Recommended architecture:
  - app -> your proxy/backend -> CalorieNinjas
- Minimum backend responsibilities:
  - hold the real API key
  - rate-limit requests
  - log failures
  - return only the fields your app needs
- Current repo scaffold:
  - Cloudflare Worker proxy in [`food-api-proxy`](/C:/Users/idang/CodeCody/App/Calorie-Tracking-App/food-api-proxy)
