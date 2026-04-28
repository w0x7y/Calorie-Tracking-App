import { Food } from "../types";
import { mapApiToFood } from "./nutrition";

// Ideally, move this to a .env file later for security
const API_KEY = "MbZtuxSKzSoww0g2GTVaQA==Y8mLOGmBxRKNZPgA";
const BASE = "https://api.calorieninjas.com/v1/nutrition";

const headers = {
  "X-Api-Key": API_KEY,
};

export async function getNutrition(query: string): Promise<Food[]> {
  if (!query) return [];

  const res = await fetch(`${BASE}?query=${encodeURIComponent(query)}`, {
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `API error ${res.status}`);
  }

  const data = await res.json();
  return (data.items ?? []).map(mapApiToFood);
}

export async function searchFoods(query: string): Promise<Food[]> {
  return getNutrition(query);
}
