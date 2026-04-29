# Calorie Tracking App

<p align="center">
  A sleek Expo calorie tracker for logging meals, building recipes, tracking water, and keeping your nutrition goals in view.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-54-1f1f1f?style=for-the-badge&logo=expo&logoColor=white" alt="Expo 54" />
  <img src="https://img.shields.io/badge/React_Native-0.81-0b0f14?style=for-the-badge&logo=react&logoColor=61dafb" alt="React Native 0.81" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-133a5e?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5.9" />
  <img src="https://img.shields.io/badge/AsyncStorage-Local_Data-3a3a3a?style=for-the-badge" alt="AsyncStorage" />
</p>

---

## What It Feels Like

This app is designed for fast daily use:

- jump between `Dashboard`, `Log`, `Search`, `History`, and `Profile`
- see calories, macros, and water at a glance
- save your own foods, products, and recipes so logging gets easier over time
- scan packaged products by barcode and review nutrition before saving
- search nutrition data from a live API when you need something new
- keep body stats and calorie targets in one place

It is a lightweight tracker with a dark, focused UI rather than a bloated nutrition platform.

## Highlights

| Area | What You Can Do |
| --- | --- |
| `Dashboard` | Track calories, macros, meals, water, and nearby days from one home screen |
| `Log` | Save custom foods and products, build recipes, and log them into meals |
| `Search` | Search live nutrition data and log foods by gram amount |
| `History` | Re-log recent foods and review saved body-stat snapshots |
| `Profile` | Estimate maintenance calories, set goals, and save macro targets |

## Feature Tour

### Daily Dashboard

- calorie progress card with goal tracking
- macro summary for protein, carbs, and fat
- water tracker with quick editing
- meal sections split into `Breakfast`, `Lunch`, `Dinner`, and `Snacks`
- date strip for reviewing nearby days

### Custom Logging

- create reusable foods and packaged products with per-100g values
- scan product barcodes and import them into saved products with a review step
- store optional details like sugar, fiber, sodium, and saturated fat
- save full recipes built from multiple ingredients
- log saved items directly into a meal with custom gram amounts

### Food Search

- search via the CalorieNinjas nutrition API
- see calories and macro previews before logging
- adjust grams live and log straight into a meal slot

### Progress History

- view the last 20 foods you logged
- re-log common foods in a couple of taps
- keep a timeline of saved weight and height snapshots

### Profile + Goal Setup

- enter age, weight, height, gender, and activity level
- calculate BMR with the Mifflin-St Jeor formula
- estimate maintenance calories
- auto-fill suggested macro targets
- set a daily water goal

## Built With

- Expo
- React Native
- TypeScript
- React Navigation bottom tabs
- AsyncStorage

## Project Structure

```text
.
|-- App.tsx
|-- screens/
|   |-- DashboardScreen.tsx
|   |-- HistoryScreen.tsx
|   |-- LogScreen.tsx
|   |-- ProfileScreen.tsx
|   `-- SearchScreen.tsx
|-- utils/
|   |-- api.ts
|   |-- nutrition.ts
|   `-- storage.ts
|-- style/
|   `-- theme.ts
|-- types/
|   `-- index.ts
|-- assets/
|-- app.json
`-- package.json
```

## Getting Started

### Prerequisites

- Node.js 18 or newer recommended
- npm
- Expo Go or an Android/iOS simulator

### Install

```bash
npm install
cp .env.example .env
```

Then add your CalorieNinjas API key to `.env`:

```bash
EXPO_PUBLIC_CALORIE_NINJAS_API_KEY=your_api_key_here
```

### Run

```bash
npm start
```

### Open a specific target

```bash
npm run android
npm run ios
npm run web
```

## Data Storage

This app stores its data locally with AsyncStorage.

Saved locally:

- meals
- food history
- water logs
- user profile
- profile history snapshots
- custom foods, products, and recipes

There is no backend or authentication layer in the current codebase, so the app is local-first and device-local.

## Nutrition API

Food search is powered by [`utils/api.ts`](./utils/api.ts) and currently uses the CalorieNinjas API.

The app reads the key from:

- `EXPO_PUBLIC_CALORIE_NINJAS_API_KEY`

Use `.env.example` as the starter template for local setup.

## Scripts

```json
{
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web"
}
```

## Notes

- the app uses a dark theme by default
- profile history saves weight and height snapshots each time the profile is stored
- deleting a meal removes it from the daily meal log, but food history remains available for quick re-logging

## License

No license is currently defined in this repository.
