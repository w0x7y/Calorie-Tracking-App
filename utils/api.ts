import { Food } from "../types";
import { mapApiToFood } from "./nutrition";

const BASE = "https://api.calorieninjas.com/v1/nutrition";
const API_KEY = process.env.EXPO_PUBLIC_CALORIE_NINJAS_API_KEY;

const SEARCH_VARIANTS: Record<string, string[]> = {
  rice: ["white rice", "brown rice", "basmati rice", "jasmine rice", "wild rice"],
  bread: ["white bread", "whole wheat bread", "sourdough bread", "rye bread", "multigrain bread"],
  milk: ["whole milk", "2% milk", "skim milk", "almond milk", "oat milk"],
  pasta: ["spaghetti", "penne pasta", "whole wheat pasta", "macaroni", "fettuccine"],
  potato: ["white potato", "sweet potato", "red potato", "baked potato", "mashed potato"],
};

function normalizeFoodName(name: string): string {
  return name.trim().toLowerCase();
}

function uniqueFoods(foods: Food[]): Food[] {
  const seen = new Set<string>();
  return foods.filter((food) => {
    const key = normalizeFoodName(food.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getNutrition(query: string): Promise<Food[]> {
  if (!query) return [];
  if (!API_KEY) {
    throw new Error("Missing EXPO_PUBLIC_CALORIE_NINJAS_API_KEY. Add it to your environment config.");
  }

  const res = await fetch(`${BASE}?query=${encodeURIComponent(query)}`, {
    headers: {
      "X-Api-Key": API_KEY,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `API error ${res.status}`);
  }

  const data = await res.json();
  return (data.items ?? []).map(mapApiToFood);
}

export async function searchFoods(query: string): Promise<Food[]> {
  const normalizedQuery = query.trim().toLowerCase();
  const baseResults = await getNutrition(query);

  if (baseResults.length >= 2) {
    return uniqueFoods(baseResults).slice(0, 5);
  }

  const variants = SEARCH_VARIANTS[normalizedQuery];
  if (!variants) {
    return uniqueFoods(baseResults).slice(0, 5);
  }

  const variantResults = await Promise.all(
    variants.map(async (variant) => {
      const foods = await getNutrition(variant);
      return foods[0] ?? null;
    }),
  );

  return uniqueFoods(
    [...baseResults, ...variantResults.filter((food): food is Food => food !== null)],
  ).slice(0, 5);
}
