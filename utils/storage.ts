import AsyncStorage from "@react-native-async-storage/async-storage";
import { MealEntry, UserProfile } from "../types";

const KEYS = {
  MEALS: "meals",
  PROFILE: "profile",
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
}

export async function deleteMeal(id: string): Promise<void> {
  const meals = await getMeals();
  const filtered = meals.filter((m) => m.id !== id);
  await AsyncStorage.setItem(KEYS.MEALS, JSON.stringify(filtered));
}

export async function getMealsByDate(date: string): Promise<MealEntry[]> {
  const meals = await getMeals();
  return meals.filter((m) => m.date === date);
}

// --- User Profile ---

export async function getProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.PROFILE);
  return raw ? JSON.parse(raw) : null;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}
