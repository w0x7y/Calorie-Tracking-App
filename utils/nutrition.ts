import { MealEntry, DailyTotals } from "../types";

// Calculate totals for a list of meal entries
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

// Round to 1 decimal place
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Get today's date as ISO string (YYYY-MM-DD)
export function todayISO(): string {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
}

// Format a date string nicely e.g. "Monday, April 27"
export function formatDate(iso: string): string {
  const date = new Date(iso + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Generate a simple unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
