// A single food item from the database or API
export interface Food {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  servingSize: number;
  servingUnit: string; // e.g. "g", "ml", "oz"
}

// A logged meal entry
export interface MealEntry {
  id: string;
  food: Food;
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snacks";
  servings: number;
  date: string; // ISO date string e.g. "2026-04-27"
  loggedAt: string; // ISO datetime string
}

// Daily nutrition totals
export interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// User profile and goals
export interface UserProfile {
  name: string;
  age: number;
  weightKg: number;
  heightCm: number;
  goalCalories: number;
  goalProtein: number;
  goalCarbs: number;
  goalFat: number;
}
