# Calorie Tracker (Mobile)

A mobile-first calorie and nutrition management application built with **Expo**, **React Native**, and **TypeScript**. This app allows users to log meals, search for nutritional data, and track fitness progress across multiple screens.

## 📱 Features

* **Multi-Tab Navigation:** Dedicated screens for Dashboard, Logging, Searching, History, and Profiles.
* **Nutritional Intelligence:** Powered by the **CalorieNinjas API** to fetch accurate macro data (Calories, Protein, Carbs, Fats).
* **Asynchronous Storage:** Uses `@react-native-async-storage/async-storage` to persist your logs locally on your device.
* **Custom Theming:** Centralized design system managed via `style/theme.ts`.
* **Cross-Platform:** Ready to run on Android, iOS, and Web via Expo.

## 🛠️ Tech Stack

* **Framework:** [Expo](https://expo.dev/) (SDK 54)
* **Navigation:** React Navigation (Bottom Tabs)
* **Language:** TypeScript
* **Icons:** Ionicons (@expo/vector-icons)
* **Persistence:** React Native Async Storage

## 📂 Directory Structure

* **`/screens`**: Individual view components (Dashboard, Search, etc.).
* **`/utils`**: Business logic for API calls (`api.ts`), nutrition calculations, and storage handlers.
* **`/style`**: Theme definitions and global color constants.
* **`/types`**: TypeScript interfaces for centralized data modeling.

## 📊 Data Models

The application uses a structured type system to ensure data consistency across the logging and reporting modules:

* **Food**: Defines the nutritional profile of an item (Calories, Macros, Serving Size).
* **MealEntry**: Links a `Food` item to a specific time, date, and meal category (Breakfast, Lunch, etc.).
* **DailyTotals**: A derived model used for calculating progress against goals on the Dashboard.
* **UserProfile**: Stores physical metrics (Weight/Height) and calculated nutritional targets.

## 🚀 Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Setup:**
    Ensure you have an API key from CalorieNinjas and add it to your `utils/api.ts` or a `.env` file.

3.  **Run the App:**
    * **Android:** `npm run android`
    * **iOS:** `npm run ios`
    * **Web:** `npm run web`

## 📋 Future Roadmap
- [ ] Implement **HIT (High-Intensity Training)** specific log metrics.
- [ ] Add visual progress charts on the Dashboard.
- [ ] Integration of a barcode scanner for easier food logging.