import { Food } from "../types";
import { mapApiToFood } from "./nutrition";

// Ideally, move this to a .env file later for security
const API_KEY = "qpqZf0yRkPJwvA7gD7DrtFptV8UKXjFOtZQswepA";
const BASE = "https://api.calorieninjas.com/v1/nutrition";

const headers = {
  "X-Api-Key": API_KEY,
};

export async function getNutrition(query: string): Promise<Food[]> {
  if (!query) return [];

  try {
    const res = await fetch(`${BASE}?query=${encodeURIComponent(query)}`, {
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("CalorieNinjas API Error:", errorText);
      return [];
    }

    const data = await res.json();

    // Use the mapper function from nutrition.ts to keep things consistent
    return (data.items ?? []).map(mapApiToFood);
  } catch (error) {
    console.error("Network Error:", error);
    return [];
  }
}

export async function searchFoods(query: string): Promise<Food[]> {
  return getNutrition(query);
}
