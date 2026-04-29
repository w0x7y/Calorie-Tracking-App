import { Food } from "../types";
import { mapApiToFood } from "./nutrition";

const BASE = "https://api.calorieninjas.com/v1/nutrition";
const OPEN_FOOD_FACTS_BASE = "https://world.openfoodfacts.net/api/v2/product";
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

function parseOpenFoodFactsNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parseServingUnit(servingSizeText: unknown): string | undefined {
  if (typeof servingSizeText !== "string") return undefined;
  const normalized = servingSizeText.trim().toLowerCase();
  if (!normalized) return undefined;

  if (normalized.includes("ml")) return "ml";
  if (normalized.includes("g")) return "g";
  return undefined;
}

export interface BarcodeLookupResult {
  barcode: string;
  name: string;
  brand?: string;
  food: Food;
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

export async function lookupProductByBarcode(barcode: string): Promise<BarcodeLookupResult> {
  const trimmedBarcode = barcode.trim();
  if (!trimmedBarcode) {
    throw new Error("Barcode is required.");
  }

  const fields = [
    "code",
    "product_name",
    "brands",
    "nutriments",
    "serving_quantity",
    "serving_size",
  ].join(",");

  const res = await fetch(`${OPEN_FOOD_FACTS_BASE}/${encodeURIComponent(trimmedBarcode)}?fields=${encodeURIComponent(fields)}`);

  if (!res.ok) {
    throw new Error(`Barcode lookup failed with status ${res.status}.`);
  }

  const data = await res.json();
  if (data?.status !== 1 || !data?.product) {
    throw new Error("Product not found for this barcode.");
  }

  const product = data.product;
  const nutriments = product.nutriments ?? {};
  const calories =
    parseOpenFoodFactsNumber(nutriments["energy-kcal_100g"]) ??
    parseOpenFoodFactsNumber(nutriments["energy-kcal"]) ??
    parseOpenFoodFactsNumber(nutriments.energy_kcal_100g);

  const sodiumGrams =
    parseOpenFoodFactsNumber(nutriments.sodium_100g) ??
    (() => {
      const salt = parseOpenFoodFactsNumber(nutriments.salt_100g);
      return salt === undefined ? undefined : salt * 0.393;
    })();
  const packageServingSize = parseOpenFoodFactsNumber(product.serving_quantity);
  const packageServingLabel =
    typeof product.serving_size === "string" && product.serving_size.trim()
      ? product.serving_size.trim()
      : undefined;
  const packageServingUnit = parseServingUnit(product.serving_size);

  if (!product.product_name || calories === undefined) {
    throw new Error("This product is missing enough nutrition data to import.");
  }

  const food: Food = {
    id: trimmedBarcode,
    name: product.product_name,
    brand: typeof product.brands === "string" && product.brands.trim() ? product.brands.trim() : undefined,
    calories,
    protein: parseOpenFoodFactsNumber(nutriments.proteins_100g) ?? 0,
    carbs: parseOpenFoodFactsNumber(nutriments.carbohydrates_100g) ?? 0,
    fat: parseOpenFoodFactsNumber(nutriments.fat_100g) ?? 0,
    sugar: parseOpenFoodFactsNumber(nutriments.sugars_100g),
    fiber: parseOpenFoodFactsNumber(nutriments.fiber_100g),
    sodium: sodiumGrams === undefined ? undefined : sodiumGrams * 1000,
    saturatedFat: parseOpenFoodFactsNumber(nutriments["saturated-fat_100g"]),
    servingSize: 100,
    servingUnit: "g",
    packageServingSize,
    packageServingUnit,
    packageServingLabel,
  };

  return {
    barcode: trimmedBarcode,
    name: food.name,
    brand: food.brand,
    food,
  };
}
