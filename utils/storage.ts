import AsyncStorage from "@react-native-async-storage/async-storage";
import { CustomItem, MealEntry, ProfileSnapshot, UserProfile } from "../types";

const KEYS = {
  MEALS: "meals",
  FOOD_HISTORY: "food_history",
  WATER_LOGS: "water_logs",
  PROFILE: "profile",
  PROFILE_HISTORY: "profile_history",
  CUSTOM_ITEMS: "custom_items",
  THEME: "theme",
};

// --- Meal Entries ---

export async function getMeals(): Promise<MealEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.MEALS);
  return raw ? JSON.parse(raw) : [];
}

export async function addMeal(entry: MealEntry): Promise<void> {
  const meals = await getMeals();
  meals.push(entry);
  await AsyncStorage.setItem(KEYS.MEALS, JSON.stringify(meals));

  const history = await getFoodHistory();
  history.push(entry);
  await AsyncStorage.setItem(KEYS.FOOD_HISTORY, JSON.stringify(history));
}

export async function deleteMeal(id: string): Promise<void> {
  const meals = await getMeals();
  const filtered = meals.filter((m) => m.id !== id);
  await AsyncStorage.setItem(KEYS.MEALS, JSON.stringify(filtered));
}

export async function updateMeal(updatedEntry: MealEntry): Promise<void> {
  const meals = await getMeals();
  const nextMeals = meals.map((meal) => (meal.id === updatedEntry.id ? updatedEntry : meal));
  await AsyncStorage.setItem(KEYS.MEALS, JSON.stringify(nextMeals));

  const history = await getFoodHistory();
  const nextHistory = history.map((meal) => (meal.id === updatedEntry.id ? updatedEntry : meal));
  await AsyncStorage.setItem(KEYS.FOOD_HISTORY, JSON.stringify(nextHistory));
}

export async function getMealsByDate(date: string): Promise<MealEntry[]> {
  const meals = await getMeals();
  return meals.filter((m) => m.date === date);
}

export async function getFoodHistory(): Promise<MealEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.FOOD_HISTORY);
  return raw ? JSON.parse(raw) : [];
}

export async function getWaterLogs(): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(KEYS.WATER_LOGS);
  return raw ? JSON.parse(raw) : {};
}

export async function getWaterByDate(date: string): Promise<number> {
  const logs = await getWaterLogs();
  return logs[date] ?? 0;
}

export async function setWaterByDate(date: string, amountMl: number): Promise<void> {
  const logs = await getWaterLogs();
  logs[date] = Math.max(0, amountMl);
  await AsyncStorage.setItem(KEYS.WATER_LOGS, JSON.stringify(logs));
}

// --- User Profile ---

export async function getProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.PROFILE);
  return raw ? JSON.parse(raw) : null;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));

  const history = await getProfileHistory();
  const snapshot: ProfileSnapshot = {
    id: new Date().toISOString(),
    recordedAt: new Date().toISOString(),
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
  };

  await AsyncStorage.setItem(
    KEYS.PROFILE_HISTORY,
    JSON.stringify([...history, snapshot]),
  );
}

export async function getProfileHistory(): Promise<ProfileSnapshot[]> {
  const raw = await AsyncStorage.getItem(KEYS.PROFILE_HISTORY);
  return raw ? JSON.parse(raw) : [];
}

export async function deleteProfileSnapshot(id: string): Promise<void> {
  const history = await getProfileHistory();
  const filtered = history.filter((snapshot) => snapshot.id !== id);
  await AsyncStorage.setItem(KEYS.PROFILE_HISTORY, JSON.stringify(filtered));
}

// --- Custom Foods / Products / Recipes ---

export async function getCustomItems(): Promise<CustomItem[]> {
  const raw = await AsyncStorage.getItem(KEYS.CUSTOM_ITEMS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveCustomItem(item: CustomItem): Promise<void> {
  const items = await getCustomItems();
  await AsyncStorage.setItem(KEYS.CUSTOM_ITEMS, JSON.stringify([...items, item]));
}

export async function updateCustomItem(updatedItem: CustomItem): Promise<void> {
  const items = await getCustomItems();
  const nextItems = items.map((item) => (item.id === updatedItem.id ? updatedItem : item));
  await AsyncStorage.setItem(KEYS.CUSTOM_ITEMS, JSON.stringify(nextItems));
}

export async function deleteCustomItem(id: string): Promise<void> {
  const items = await getCustomItems();
  const filtered = items.filter((item) => item.id !== id);
  await AsyncStorage.setItem(KEYS.CUSTOM_ITEMS, JSON.stringify(filtered));
}

// --- Theme ---

export async function getTheme(): Promise<string | null> {
  return await AsyncStorage.getItem(KEYS.THEME);
}

export async function saveTheme(theme: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.THEME, theme);
}
