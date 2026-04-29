import { MealEntry, DailyTotals, Food, UserProfile } from "../types";

// --- API & Mapping ---

/**
 * Converts CalorieNinjas API items to our internal Food interface
 */
export function mapApiToFood(apiItem: any): Food {
  return {
    id: generateId(),
    name: apiItem.name,
    calories: apiItem.calories,
    protein: apiItem.protein_g,
    carbs: apiItem.carbohydrates_total_g,
    fat: apiItem.fat_total_g,
    sodium: apiItem.sodium_mg,
    sugar: apiItem.sugar_g,
    fiber: apiItem.fiber_g,
    saturatedFat: apiItem.fat_saturated_g,
    servingSize: apiItem.serving_size_g,
    servingUnit: "g",
  };
}

// --- Calculations ---

export function calculateTotals(meals: MealEntry[]): DailyTotals {
  return meals.reduce(
    (totals, entry) => {
      const s = entry.servings;
      return {
        calories: totals.calories + entry.food.calories * s,
        protein: totals.protein + entry.food.protein * s,
        carbs: totals.carbs + entry.food.carbs * s,
        fat: totals.fat + entry.food.fat * s,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/**
 * Calculates Base Metabolic Rate (BMR) using Mifflin-St Jeor
 * This helps set the 'goalCalories' in the Profile screen.
 */
export function calculateBMR(
  profile: UserProfile,
  gender: "male" | "female",
): number {
  const { weightKg, heightCm, age } = profile;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

// --- Helpers ---

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function todayISO(): string {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
}

export function formatDate(iso: string): string {
  const date = new Date(iso + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
