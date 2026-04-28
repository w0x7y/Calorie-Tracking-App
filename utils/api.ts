import { Food } from "../types";

// Free tier key from calorieninjas.com
const API_KEY = "qpqZf0yRkPJwvA7gD7DrtFptV8UKXjFOtZQswepA";
const BASE = "https://api.calorieninjas.com/v1/nutrition";

const headers = {
  "X-Api-Key": API_KEY,
};

/**
 * CalorieNinjas handles both simple keywords and complex queries (e.g., "apple" or "2 eggs")
 * through the same endpoint. We can use this for both search and natural language logic.
 */
export async function getNutrition(query: string): Promise<Food[]> {
  const res = await fetch(`${BASE}?query=${encodeURIComponent(query)}`, {
    headers,
  });

  if (!res.ok) {
    console.error("API Error:", await res.text());
    return [];
  }

  const data = await res.json();

  return (data.items ?? []).map((item: any, i: number) => ({
    id: `ninja-${item.name}-${Date.now()}-${i}`,
    name: item.name,
    // Note: CalorieNinjas returns data per 100g by default unless quantity is specified in query
    calories: item.calories,
    protein: item.protein_g,
    carbs: item.carbohydrates_total_g,
    fat: item.fat_total_g,
    servingSize: item.serving_size_g,
    servingUnit: "g",
  }));
}

/**
 * Since CalorieNinjas is primarily NLP-based, you can alias searchFoods
 * to the same function or use it for specific keyword searches.
 */
export async function searchFoods(query: string): Promise<Food[]> {
  return getNutrition(query);
}
