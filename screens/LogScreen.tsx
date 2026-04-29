import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../style/theme";
import {
  addMeal,
  deleteCustomItem,
  getCustomItems,
  saveCustomItem,
  updateCustomItem,
} from "../utils/storage";
import { generateId, todayISO } from "../utils/nutrition";
import { CustomItem, CustomRecipeIngredient, Food, MealEntry } from "../types";
import { BarcodeLookupResult, lookupProductByBarcode, searchFoods } from "../utils/api";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;

const MEAL_COLORS: Record<string, string> = {
  Breakfast: "#FF9F43",
  Lunch: "#00D2D3",
  Dinner: "#A29BFE",
  Snacks: "#FD79A8",
};

type LogMode = "saved" | "food" | "recipe";
type CustomKind = "food" | "product";

type ScannedProductDraft = {
  barcode: string;
  name: string;
  brand: string;
  servingSize: string;
  servingUnit: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  sugar: string;
  fiber: string;
  sodium: string;
  saturatedFat: string;
};

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function safeNumber(value?: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatMacros(food: Food): string {
  return `${Math.round(food.protein)}P  ${Math.round(food.carbs)}C  ${Math.round(food.fat)}F`;
}

function toInputValue(value?: number): string {
  return value === undefined ? "" : String(value);
}

function buildScannedDraft(result: BarcodeLookupResult): ScannedProductDraft {
  return {
    barcode: result.barcode,
    name: result.name,
    brand: result.brand ?? "",
    servingSize: result.food.packageServingSize === undefined ? "" : String(result.food.packageServingSize),
    servingUnit: result.food.packageServingUnit ?? result.food.packageServingLabel ?? "",
    calories: String(Math.round(result.food.calories)),
    protein: String(Math.round(result.food.protein)),
    carbs: String(Math.round(result.food.carbs)),
    fat: String(Math.round(result.food.fat)),
    sugar: result.food.sugar === undefined ? "" : String(Math.round(result.food.sugar)),
    fiber: result.food.fiber === undefined ? "" : String(Math.round(result.food.fiber)),
    sodium: result.food.sodium === undefined ? "" : String(Math.round(result.food.sodium)),
    saturatedFat: result.food.saturatedFat === undefined ? "" : String(Math.round(result.food.saturatedFat)),
  };
}

export default function LogScreen() {
  const [mode, setMode] = useState<LogMode>("saved");
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<CustomItem | null>(null);
  const [editingItem, setEditingItem] = useState<CustomItem | null>(null);
  const [logGrams, setLogGrams] = useState("100");
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [scanLookupLoading, setScanLookupLoading] = useState(false);
  const [scannedDraft, setScannedDraft] = useState<ScannedProductDraft | null>(null);

  const [customKind, setCustomKind] = useState<CustomKind>("food");
  const [customName, setCustomName] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFat, setCustomFat] = useState("");
  const [customSugar, setCustomSugar] = useState("");
  const [customFiber, setCustomFiber] = useState("");
  const [customSodium, setCustomSodium] = useState("");
  const [customSaturatedFat, setCustomSaturatedFat] = useState("");

  const [recipeName, setRecipeName] = useState("");
  const [recipeIngredients, setRecipeIngredients] = useState<CustomRecipeIngredient[]>([]);
  const [recipeQuery, setRecipeQuery] = useState("");
  const [recipeSearchResults, setRecipeSearchResults] = useState<Food[]>([]);
  const [recipeSearchLoading, setRecipeSearchLoading] = useState(false);

  function reload() {
    getCustomItems().then(setCustomItems);
  }

  useFocusEffect(
    React.useCallback(() => {
      reload();
    }, []),
  );

  const savedItems = useMemo(
    () => [...customItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [customItems],
  );

  const recipeBaseItems = useMemo(
    () => savedItems.filter((item) => item.kind !== "recipe"),
    [savedItems],
  );

  const recipeTotals = useMemo(
    () =>
      recipeIngredients.reduce(
        (totals, ingredient) => {
          const multiplier = ingredient.grams / ingredient.food.servingSize;
          return {
            grams: totals.grams + ingredient.grams,
            calories: totals.calories + ingredient.food.calories * multiplier,
            protein: totals.protein + ingredient.food.protein * multiplier,
            carbs: totals.carbs + ingredient.food.carbs * multiplier,
            fat: totals.fat + ingredient.food.fat * multiplier,
            sugar: totals.sugar + safeNumber(ingredient.food.sugar) * multiplier,
            fiber: totals.fiber + safeNumber(ingredient.food.fiber) * multiplier,
            sodium: totals.sodium + safeNumber(ingredient.food.sodium) * multiplier,
            saturatedFat: totals.saturatedFat + safeNumber(ingredient.food.saturatedFat) * multiplier,
          };
        },
        {
          grams: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          sugar: 0,
          fiber: 0,
          sodium: 0,
          saturatedFat: 0,
        },
      ),
    [recipeIngredients],
  );

  function resetFoodForm() {
    setCustomKind("food");
    setCustomName("");
    setCustomBrand("");
    setCustomCalories("");
    setCustomProtein("");
    setCustomCarbs("");
    setCustomFat("");
    setCustomSugar("");
    setCustomFiber("");
    setCustomSodium("");
    setCustomSaturatedFat("");
  }

  function resetRecipeForm() {
    setRecipeName("");
    setRecipeIngredients([]);
    setRecipeQuery("");
    setRecipeSearchResults([]);
  }

  function stopEditing() {
    setEditingItem(null);
    resetFoodForm();
    resetRecipeForm();
    setMode("saved");
  }

  function startEditing(item: CustomItem) {
    setEditingItem(item);

    if (item.kind === "recipe") {
      setMode("recipe");
      setRecipeName(item.name);
      setRecipeIngredients(
        (item.ingredients ?? []).map((ingredient) => ({
          ...ingredient,
          food: { ...ingredient.food },
        })),
      );
      setRecipeQuery("");
      setRecipeSearchResults([]);
      return;
    }

    setMode("food");
    setCustomKind(item.kind);
    setCustomName(item.name);
    setCustomBrand(item.brand ?? item.food.brand ?? "");
    setCustomCalories(toInputValue(item.food.calories));
    setCustomProtein(toInputValue(item.food.protein));
    setCustomCarbs(toInputValue(item.food.carbs));
    setCustomFat(toInputValue(item.food.fat));
    setCustomSugar(toInputValue(item.food.sugar));
    setCustomFiber(toInputValue(item.food.fiber));
    setCustomSodium(toInputValue(item.food.sodium));
    setCustomSaturatedFat(toInputValue(item.food.saturatedFat));
  }

  function openScanner() {
    setScanLocked(false);
    setScanLookupLoading(false);
    setScannerVisible(true);
  }

  function closeScanner() {
    setScannerVisible(false);
    setScanLocked(false);
    setScanLookupLoading(false);
  }

  function closeScannedReview() {
    setScannedDraft(null);
  }

  function openScannerFromReview() {
    setScannedDraft(null);
    setScanLocked(false);
    setScanLookupLoading(false);
    setScannerVisible(true);
  }

  async function handleBarcodeScanned(event: BarcodeScanningResult) {
    if (scanLocked || scanLookupLoading) return;
    setScanLocked(true);
    setScanLookupLoading(true);

    try {
      const result = await lookupProductByBarcode(event.data);
      closeScanner();
      setScannedDraft(buildScannedDraft(result));
    } catch (e: any) {
      Alert.alert("Scan error", e?.message || "Could not import this barcode.");
      setScanLocked(false);
    } finally {
      setScanLookupLoading(false);
    }
  }

  async function handleSaveScannedProduct() {
    if (!scannedDraft) return;

    const calories = parseNumber(scannedDraft.calories);
    const protein = parseNumber(scannedDraft.protein);
    const carbs = parseNumber(scannedDraft.carbs);
    const fat = parseNumber(scannedDraft.fat);
    const packageServingSize = parseNumber(scannedDraft.servingSize) ?? undefined;
    const packageServingUnit = scannedDraft.servingUnit.trim() || undefined;

    if (!scannedDraft.name.trim()) {
      Alert.alert("Missing name", "Give the scanned product a name.");
      return;
    }

    if (calories === null || protein === null || carbs === null || fat === null) {
      Alert.alert("Missing macros", "Calories, protein, carbs, and fat are required.");
      return;
    }

    const id = generateId();
    const item: CustomItem = {
      id,
      kind: "product",
      name: scannedDraft.name.trim(),
      brand: scannedDraft.brand.trim() || undefined,
      barcode: scannedDraft.barcode,
      createdAt: new Date().toISOString(),
      food: {
        id,
        name: scannedDraft.name.trim(),
        brand: scannedDraft.brand.trim() || undefined,
        calories,
        protein,
        carbs,
        fat,
        sugar: parseNumber(scannedDraft.sugar) ?? undefined,
        fiber: parseNumber(scannedDraft.fiber) ?? undefined,
        sodium: parseNumber(scannedDraft.sodium) ?? undefined,
        saturatedFat: parseNumber(scannedDraft.saturatedFat) ?? undefined,
        servingSize: 100,
        servingUnit: "g",
        packageServingSize,
        packageServingUnit,
        packageServingLabel:
          packageServingSize && packageServingUnit ? `${packageServingSize}${packageServingUnit}` : undefined,
      },
    };

    await saveCustomItem(item);
    closeScannedReview();
    reload();
    setSelectedItem(item);
    setLogGrams(packageServingSize ? String(packageServingSize) : "100");
    Alert.alert("Saved", `${item.name} was added to your saved products and is ready to log.`);
  }

  async function handleLog(mealType: (typeof MEAL_TYPES)[number]) {
    if (!selectedItem) return;
    const parsedGrams = parseFloat(logGrams);
    const validGrams = Number.isFinite(parsedGrams) && parsedGrams > 0 ? parsedGrams : 100;
    const servingMultiplier = validGrams / selectedItem.food.servingSize;

    const entry: MealEntry = {
      id: generateId(),
      food: selectedItem.food,
      mealType,
      servings: servingMultiplier,
      date: todayISO(),
      loggedAt: new Date().toISOString(),
    };

    await addMeal(entry);
    Alert.alert("Logged", `${selectedItem.name} added to ${mealType}.`);
    setSelectedItem(null);
    setLogGrams("100");
  }

  async function handleSaveFood() {
    const calories = parseNumber(customCalories);
    const protein = parseNumber(customProtein);
    const carbs = parseNumber(customCarbs);
    const fat = parseNumber(customFat);

    if (!customName.trim()) {
      Alert.alert("Missing name", "Give your food or product a name.");
      return;
    }

    if (calories === null) {
      Alert.alert("Missing calories", "Calories are required.");
      return;
    }

    if (protein === null || carbs === null || fat === null) {
      Alert.alert("Missing macros", "Protein, carbs, and fat are required.");
      return;
    }

    const isEditingCurrentFood = !!editingItem && editingItem.kind !== "recipe";
    const id = isEditingCurrentFood ? editingItem.id : generateId();
    const createdAt = isEditingCurrentFood ? editingItem.createdAt : new Date().toISOString();
    const item: CustomItem = {
      id,
      kind: customKind,
      name: customName.trim(),
      brand: customBrand.trim() || undefined,
      createdAt,
      food: {
        id,
        name: customName.trim(),
        brand: customBrand.trim() || undefined,
        calories,
        protein,
        carbs,
        fat,
        sugar: parseNumber(customSugar) ?? undefined,
        fiber: parseNumber(customFiber) ?? undefined,
        sodium: parseNumber(customSodium) ?? undefined,
        saturatedFat: parseNumber(customSaturatedFat) ?? undefined,
        servingSize: 100,
        servingUnit: "g",
      },
    };

    if (editingItem && editingItem.kind !== "recipe") {
      await updateCustomItem(item);
      Alert.alert("Updated", `${item.name} was updated.`);
    } else {
      await saveCustomItem(item);
      Alert.alert("Saved", `${item.name} is ready to log anytime.`);
    }

    reload();
    resetFoodForm();
    setEditingItem(null);
    setMode("saved");
  }

  function addRecipeIngredientFromFood(food: Food, itemId?: string) {
    setRecipeIngredients((current) => {
      const existing = current.find(
        (ingredient) =>
          (itemId && ingredient.itemId === itemId) ||
          (!itemId && ingredient.food.name.toLowerCase() === food.name.toLowerCase()),
      );

      if (existing) {
        return current.map((ingredient) =>
          ingredient.id === existing.id
            ? { ...ingredient, grams: ingredient.grams + 100 }
            : ingredient,
        );
      }

      return [
        ...current,
        {
          id: generateId(),
          itemId,
          name: food.name,
          grams: 100,
          food,
        },
      ];
    });
  }

  async function handleRecipeSearch() {
    if (!recipeQuery.trim()) return;
    Keyboard.dismiss();
    setRecipeSearchLoading(true);
    try {
      const foods = await searchFoods(recipeQuery);
      setRecipeSearchResults(foods);
    } catch (e: any) {
      Alert.alert("Search error", e?.message || "Could not fetch recipe ingredients.");
    } finally {
      setRecipeSearchLoading(false);
    }
  }

  function updateRecipeIngredient(id: string, gramsText: string) {
    const grams = parseFloat(gramsText);
    setRecipeIngredients((current) =>
      current.map((ingredient) =>
        ingredient.id === id
          ? { ...ingredient, grams: Number.isFinite(grams) && grams >= 0 ? grams : 0 }
          : ingredient,
      ),
    );
  }

  function removeRecipeIngredient(id: string) {
    setRecipeIngredients((current) => current.filter((ingredient) => ingredient.id !== id));
  }

  function moveRecipeIngredient(id: string, direction: "up" | "down") {
    setRecipeIngredients((current) => {
      const index = current.findIndex((ingredient) => ingredient.id === id);
      if (index < 0) return current;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  async function handleSaveRecipe() {
    if (!recipeName.trim()) {
      Alert.alert("Missing name", "Give your recipe a name.");
      return;
    }

    if (recipeTotals.grams <= 0 || recipeIngredients.length === 0) {
      Alert.alert("No ingredients", "Add at least one ingredient with grams.");
      return;
    }

    const per100Multiplier = 100 / recipeTotals.grams;
    const id = editingItem?.kind === "recipe" ? editingItem.id : generateId();
    const createdAt = editingItem?.kind === "recipe" ? editingItem.createdAt : new Date().toISOString();
    const item: CustomItem = {
      id,
      kind: "recipe",
      name: recipeName.trim(),
      createdAt,
      ingredients: recipeIngredients,
      food: {
        id,
        name: recipeName.trim(),
        calories: recipeTotals.calories * per100Multiplier,
        protein: recipeTotals.protein * per100Multiplier,
        carbs: recipeTotals.carbs * per100Multiplier,
        fat: recipeTotals.fat * per100Multiplier,
        sugar: recipeTotals.sugar * per100Multiplier,
        fiber: recipeTotals.fiber * per100Multiplier,
        sodium: recipeTotals.sodium * per100Multiplier,
        saturatedFat: recipeTotals.saturatedFat * per100Multiplier,
        servingSize: 100,
        servingUnit: "g",
      },
    };

    if (editingItem?.kind === "recipe") {
      await updateCustomItem(item);
      Alert.alert("Updated", `${item.name} was updated.`);
    } else {
      await saveCustomItem(item);
      Alert.alert("Saved", `${item.name} is ready to log anytime.`);
    }

    reload();
    resetRecipeForm();
    setEditingItem(null);
    setMode("saved");
  }

  function handleDeleteCustomItem(item: CustomItem) {
    Alert.alert("Remove item", `Remove ${item.name} from your saved items?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await deleteCustomItem(item.id);
          if (selectedItem?.id === item.id) {
            setSelectedItem(null);
            setLogGrams("100");
          }
          if (editingItem?.id === item.id) {
            stopEditing();
          }
          reload();
        },
      },
    ]);
  }

  const isEditingFood = !!editingItem && editingItem.kind !== "recipe";
  const isEditingRecipe = editingItem?.kind === "recipe";

  return (
    <View style={styles.container}>
      <View style={styles.modeRow}>
        {[
          { key: "saved", label: "Saved" },
          { key: "food", label: "Food/Product" },
          { key: "recipe", label: "Recipe" },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.modeButton, mode === item.key && styles.modeButtonActive]}
            onPress={() => {
              if (item.key === "saved") {
                stopEditing();
              } else {
                setMode(item.key as LogMode);
                if (item.key !== "food" && isEditingFood) resetFoodForm();
                if (item.key !== "recipe" && isEditingRecipe) resetRecipeForm();
                if (item.key !== mode) setEditingItem(null);
              }
            }}
          >
            <Text style={[styles.modeButtonText, mode === item.key && styles.modeButtonTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {mode === "saved" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Saved Items</Text>
            <Text style={styles.sectionSub}>Log your custom foods, products, and recipes anytime.</Text>

            <TouchableOpacity style={styles.scanButton} onPress={openScanner}>
              <Ionicons name="scan-outline" size={18} color={Colors.white} />
              <Text style={styles.scanButtonText}>Scan Barcode</Text>
            </TouchableOpacity>

            {savedItems.length === 0 ? (
              <Text style={styles.emptyText}>You have not created any custom items yet.</Text>
            ) : (
              savedItems.map((item) => (
                <View key={item.id} style={styles.savedCard}>
                  <View style={styles.savedHeader}>
                    <View style={styles.savedTitleWrap}>
                      <View style={styles.savedTitleRow}>
                        <Text style={styles.savedName}>{item.name}</Text>
                        {item.barcode && (
                          <View style={styles.barcodeBadge}>
                            <Ionicons name="barcode-outline" size={12} color={Colors.black} />
                            <Text style={styles.barcodeBadgeText}>Scanned</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.savedMeta}>
                        {item.kind === "recipe" ? "Recipe" : item.kind === "product" ? "Product" : "Food"}
                        {" • "}
                        {Math.round(item.food.calories)} kcal / 100g
                      </Text>
                      {item.food.packageServingSize && item.food.packageServingUnit && (
                        <Text style={styles.savedServing}>
                          1 serving ({item.food.packageServingSize}
                          {item.food.packageServingUnit}): {Math.round(item.food.calories * (item.food.packageServingSize / item.food.servingSize))} kcal
                        </Text>
                      )}
                      {item.barcode && <Text style={styles.savedBarcode}>Barcode: {item.barcode}</Text>}
                      <Text style={styles.savedMacros}>{formatMacros(item.food)}</Text>
                    </View>
                    <View style={styles.savedActions}>
                      <TouchableOpacity onPress={() => startEditing(item)} hitSlop={8}>
                        <Ionicons name="create-outline" size={18} color={Colors.textDim} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteCustomItem(item)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={18} color={Colors.textDim} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.logNowButton}
                    onPress={() => {
                      setSelectedItem(item);
                      setLogGrams(item.food.packageServingSize ? String(item.food.packageServingSize) : "100");
                    }}
                  >
                    <Text style={styles.logNowText}>Log This Item</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {mode === "food" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{isEditingFood ? "Edit Food or Product" : "Create Food or Product"}</Text>
            <Text style={styles.sectionSub}>
              Enter values per 100g. Calories are required. Extra nutrition fields are optional.
            </Text>

            {!isEditingFood && (
              <TouchableOpacity style={styles.scanButton} onPress={openScanner}>
                <Ionicons name="scan-outline" size={18} color={Colors.white} />
                <Text style={styles.scanButtonText}>Scan Product Barcode</Text>
              </TouchableOpacity>
            )}

            <View style={styles.segmentedControl}>
              {(["food", "product"] as const).map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.segment, customKind === item && styles.segmentActive]}
                  onPress={() => setCustomKind(item)}
                >
                  <Text style={[styles.segmentText, customKind === item && styles.segmentTextActive]}>
                    {item === "food" ? "Food" : "Product"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              value={customName}
              onChangeText={setCustomName}
              placeholder="Name"
              placeholderTextColor={Colors.textDim}
            />
            <TextInput
              style={styles.input}
              value={customBrand}
              onChangeText={setCustomBrand}
              placeholder="Brand (optional)"
              placeholderTextColor={Colors.textDim}
            />
            <TextInput
              style={styles.input}
              value={customCalories}
              onChangeText={setCustomCalories}
              keyboardType="decimal-pad"
              placeholder="Calories"
              placeholderTextColor={Colors.textDim}
            />

            <View style={styles.threeColRow}>
              <TextInput
                style={[styles.input, styles.thirdField]}
                value={customProtein}
                onChangeText={setCustomProtein}
                keyboardType="decimal-pad"
                placeholder="Protein"
                placeholderTextColor={Colors.textDim}
              />
              <TextInput
                style={[styles.input, styles.thirdField]}
                value={customCarbs}
                onChangeText={setCustomCarbs}
                keyboardType="decimal-pad"
                placeholder="Carbs"
                placeholderTextColor={Colors.textDim}
              />
              <TextInput
                style={[styles.input, styles.thirdField]}
                value={customFat}
                onChangeText={setCustomFat}
                keyboardType="decimal-pad"
                placeholder="Fat"
                placeholderTextColor={Colors.textDim}
              />
            </View>

            <View style={styles.twoColRow}>
              <TextInput
                style={[styles.input, styles.halfField]}
                value={customSugar}
                onChangeText={setCustomSugar}
                keyboardType="decimal-pad"
                placeholder="Sugar (optional)"
                placeholderTextColor={Colors.textDim}
              />
              <TextInput
                style={[styles.input, styles.halfField]}
                value={customFiber}
                onChangeText={setCustomFiber}
                keyboardType="decimal-pad"
                placeholder="Fiber (optional)"
                placeholderTextColor={Colors.textDim}
              />
            </View>

            <View style={styles.twoColRow}>
              <TextInput
                style={[styles.input, styles.halfField]}
                value={customSodium}
                onChangeText={setCustomSodium}
                keyboardType="decimal-pad"
                placeholder="Salt/Sodium mg (optional)"
                placeholderTextColor={Colors.textDim}
              />
              <TextInput
                style={[styles.input, styles.halfField]}
                value={customSaturatedFat}
                onChangeText={setCustomSaturatedFat}
                keyboardType="decimal-pad"
                placeholder="Sat. fat (optional)"
                placeholderTextColor={Colors.textDim}
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleSaveFood}>
              <Text style={styles.primaryButtonText}>{isEditingFood ? "Update Item" : "Save Item"}</Text>
            </TouchableOpacity>

            {isEditingFood && (
              <TouchableOpacity style={styles.secondaryButton} onPress={stopEditing}>
                <Text style={styles.secondaryButtonText}>Cancel Editing</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {mode === "recipe" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{isEditingRecipe ? "Edit Recipe" : "Build Recipe"}</Text>
            <Text style={styles.sectionSub}>
              Use both saved items and searched foods as ingredients. The recipe totals update automatically.
            </Text>

            <TextInput
              style={styles.input}
              value={recipeName}
              onChangeText={setRecipeName}
              placeholder="Recipe name"
              placeholderTextColor={Colors.textDim}
            />

            <Text style={styles.label}>Saved Ingredients</Text>
            {recipeBaseItems.length === 0 ? (
              <Text style={styles.emptyText}>Create a custom food or product first if you want reusable ingredients.</Text>
            ) : (
              <View style={styles.chipWrap}>
                {recipeBaseItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.chip}
                    onPress={() => addRecipeIngredientFromFood(item.food, item.id)}
                  >
                    <Text style={styles.chipText}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.label, styles.ingredientsLabel]}>Search Ingredients</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.input, styles.searchInput]}
                value={recipeQuery}
                onChangeText={setRecipeQuery}
                placeholder="Search foods like tomato, rice, chicken..."
                placeholderTextColor={Colors.textDim}
                onSubmitEditing={handleRecipeSearch}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchBtn} onPress={handleRecipeSearch}>
                <Text style={styles.searchBtnText}>Go</Text>
              </TouchableOpacity>
            </View>

            {recipeSearchLoading && <ActivityIndicator style={styles.searchLoading} color={Colors.platinum} />}

            {!recipeSearchLoading && recipeSearchResults.length > 0 && (
              <View style={styles.searchResultsWrap}>
                {recipeSearchResults.map((food) => (
                  <TouchableOpacity key={food.id} style={styles.searchResult} onPress={() => addRecipeIngredientFromFood(food)}>
                    <View style={styles.searchResultMain}>
                      <Text style={styles.searchResultName}>{food.name}</Text>
                      <Text style={styles.searchResultMeta}>{Math.round(food.calories)} kcal / 100g</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={20} color={Colors.text} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.label, styles.ingredientsLabel]}>Recipe Ingredients</Text>
            {recipeIngredients.length === 0 ? (
              <Text style={styles.emptyText}>No ingredients added yet.</Text>
            ) : (
              recipeIngredients.map((ingredient, index) => (
                <View key={ingredient.id} style={styles.ingredientRow}>
                  <View style={styles.ingredientMain}>
                    <Text style={styles.ingredientName}>{ingredient.name}</Text>
                    <Text style={styles.ingredientMeta}>{Math.round(ingredient.food.calories)} kcal / 100g</Text>
                    <TextInput
                      style={styles.ingredientInput}
                      value={String(ingredient.grams)}
                      onChangeText={(text) => updateRecipeIngredient(ingredient.id, text)}
                      keyboardType="decimal-pad"
                      placeholder="grams"
                      placeholderTextColor={Colors.textDim}
                    />
                  </View>
                  <View style={styles.ingredientActions}>
                    <TouchableOpacity
                      onPress={() => moveRecipeIngredient(ingredient.id, "up")}
                      disabled={index === 0}
                      hitSlop={8}
                      style={index === 0 ? styles.iconDisabled : undefined}
                    >
                      <Ionicons name="chevron-up" size={18} color={Colors.textDim} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveRecipeIngredient(ingredient.id, "down")}
                      disabled={index === recipeIngredients.length - 1}
                      hitSlop={8}
                      style={index === recipeIngredients.length - 1 ? styles.iconDisabled : undefined}
                    >
                      <Ionicons name="chevron-down" size={18} color={Colors.textDim} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeRecipeIngredient(ingredient.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={Colors.textDim} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            <View style={styles.recipeSummary}>
              <Text style={styles.recipeSummaryTitle}>Recipe Total</Text>
              <Text style={styles.recipeSummaryLine}>{Math.round(recipeTotals.grams)}g total</Text>
              <Text style={styles.recipeSummaryLine}>
                {Math.round(recipeTotals.calories)} kcal • {Math.round(recipeTotals.protein)}P • {Math.round(recipeTotals.carbs)}C • {Math.round(recipeTotals.fat)}F
              </Text>
              <Text style={styles.recipeSummaryLine}>
                Sugar {Math.round(recipeTotals.sugar)}g • Fiber {Math.round(recipeTotals.fiber)}g
              </Text>
              <Text style={styles.recipeSummaryLine}>
                Sodium {Math.round(recipeTotals.sodium)}mg • Sat. Fat {Math.round(recipeTotals.saturatedFat)}g
              </Text>
              {recipeTotals.grams > 0 && (
                <>
                  <Text style={styles.recipeSummarySub}>
                    Per 100g: {Math.round(recipeTotals.calories * (100 / recipeTotals.grams))} kcal
                  </Text>
                  <Text style={styles.recipeSummarySub}>
                    {Math.round(recipeTotals.protein * (100 / recipeTotals.grams))}P • {Math.round(recipeTotals.carbs * (100 / recipeTotals.grams))}C • {Math.round(recipeTotals.fat * (100 / recipeTotals.grams))}F
                  </Text>
                  <Text style={styles.recipeSummarySub}>
                    Sugar {Math.round(recipeTotals.sugar * (100 / recipeTotals.grams))}g • Fiber {Math.round(recipeTotals.fiber * (100 / recipeTotals.grams))}g • Sodium {Math.round(recipeTotals.sodium * (100 / recipeTotals.grams))}mg
                  </Text>
                </>
              )}
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleSaveRecipe}>
              <Text style={styles.primaryButtonText}>{isEditingRecipe ? "Update Recipe" : "Save Recipe"}</Text>
            </TouchableOpacity>

            {isEditingRecipe && (
              <TouchableOpacity style={styles.secondaryButton} onPress={stopEditing}>
                <Text style={styles.secondaryButtonText}>Cancel Editing</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={scannerVisible} animationType="slide" onRequestClose={closeScanner}>
        <View style={styles.scannerScreen}>
          <View style={styles.scannerTopBar}>
            <TouchableOpacity style={styles.scannerCloseBtn} onPress={closeScanner}>
              <Ionicons name="close" size={24} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Scan a Product</Text>
            <View style={styles.scannerSpacer} />
          </View>

          {!cameraPermission ? (
            <View style={styles.permissionWrap}>
              <ActivityIndicator color={Colors.platinum} />
            </View>
          ) : !cameraPermission.granted ? (
            <View style={styles.permissionWrap}>
              <Text style={styles.permissionTitle}>Camera access is needed to scan barcodes.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={requestCameraPermission}>
                <Text style={styles.primaryButtonText}>Grant Camera Access</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.scannerBody}>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanLocked ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39"],
                }}
              />
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerFrame} />
                <Text style={styles.scannerHint}>Center the barcode inside the frame</Text>
              </View>
              {scanLookupLoading && (
                <View style={styles.lookupOverlay}>
                  <ActivityIndicator color={Colors.white} />
                  <Text style={styles.lookupOverlayText}>Looking up product...</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>

      <Modal
        visible={!!scannedDraft}
        transparent
        animationType="slide"
        onRequestClose={closeScannedReview}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeScannedReview}>
          <View style={styles.modalSheet}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>Review Scanned Product</Text>
            <Text style={styles.modalSub}>{scannedDraft ? `Barcode: ${scannedDraft.barcode}` : ""}</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.input}
                value={scannedDraft?.name ?? ""}
                onChangeText={(text) => setScannedDraft((current) => (current ? { ...current, name: text } : current))}
                placeholder="Product name"
                placeholderTextColor={Colors.textDim}
              />
              <TextInput
                style={styles.input}
                value={scannedDraft?.brand ?? ""}
                onChangeText={(text) => setScannedDraft((current) => (current ? { ...current, brand: text } : current))}
                placeholder="Brand"
                placeholderTextColor={Colors.textDim}
              />
              <View style={styles.twoColRow}>
                <TextInput
                  style={[styles.input, styles.halfField]}
                  value={scannedDraft?.servingSize ?? ""}
                  onChangeText={(text) => setScannedDraft((current) => (current ? { ...current, servingSize: text } : current))}
                  keyboardType="decimal-pad"
                  placeholder="Serving size"
                  placeholderTextColor={Colors.textDim}
                />
                <TextInput
                  style={[styles.input, styles.halfField]}
                  value={scannedDraft?.servingUnit ?? ""}
                  onChangeText={(text) => setScannedDraft((current) => (current ? { ...current, servingUnit: text } : current))}
                  placeholder="Serving unit"
                  placeholderTextColor={Colors.textDim}
                />
              </View>
              <TextInput
                style={styles.input}
                value={scannedDraft?.calories ?? ""}
                onChangeText={(text) => setScannedDraft((current) => (current ? { ...current, calories: text } : current))}
                keyboardType="decimal-pad"
                placeholder="Calories per 100g"
                placeholderTextColor={Colors.textDim}
              />

              <View style={styles.threeColRow}>
                <TextInput
                  style={[styles.input, styles.thirdField]}
                  value={scannedDraft?.protein ?? ""}
                  onChangeText={(text) => setScannedDraft((current) => (current ? { ...current, protein: text } : current))}
                  keyboardType="decimal-pad"
                  placeholder="Protein"
                  placeholderTextColor={Colors.textDim}
                />
                <TextInput
                  style={[styles.input, styles.thirdField]}
                  value={scannedDraft?.carbs ?? ""}
                  onChangeText={(text) => setScannedDraft((current) => (current ? { ...current, carbs: text } : current))}
                  keyboardType="decimal-pad"
                  placeholder="Carbs"
                  placeholderTextColor={Colors.textDim}
                />
                <TextInput
                  style={[styles.input, styles.thirdField]}
                  value={scannedDraft?.fat ?? ""}
                  onChangeText={(text) => setScannedDraft((current) => (current ? { ...current, fat: text } : current))}
                  keyboardType="decimal-pad"
                  placeholder="Fat"
                  placeholderTextColor={Colors.textDim}
                />
              </View>

              <View style={styles.twoColRow}>
                <TextInput
                  style={[styles.input, styles.halfField]}
                  value={scannedDraft?.sugar ?? ""}
                  onChangeText={(text) => setScannedDraft((current) => (current ? { ...current, sugar: text } : current))}
                  keyboardType="decimal-pad"
                  placeholder="Sugar"
                  placeholderTextColor={Colors.textDim}
                />
                <TextInput
                  style={[styles.input, styles.halfField]}
                  value={scannedDraft?.fiber ?? ""}
                  onChangeText={(text) => setScannedDraft((current) => (current ? { ...current, fiber: text } : current))}
                  keyboardType="decimal-pad"
                  placeholder="Fiber"
                  placeholderTextColor={Colors.textDim}
                />
              </View>

              <View style={styles.twoColRow}>
                <TextInput
                  style={[styles.input, styles.halfField]}
                  value={scannedDraft?.sodium ?? ""}
                  onChangeText={(text) => setScannedDraft((current) => (current ? { ...current, sodium: text } : current))}
                  keyboardType="decimal-pad"
                  placeholder="Sodium mg"
                  placeholderTextColor={Colors.textDim}
                />
                <TextInput
                  style={[styles.input, styles.halfField]}
                  value={scannedDraft?.saturatedFat ?? ""}
                  onChangeText={(text) => setScannedDraft((current) => (current ? { ...current, saturatedFat: text } : current))}
                  keyboardType="decimal-pad"
                  placeholder="Sat. fat"
                  placeholderTextColor={Colors.textDim}
                />
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.primaryButton} onPress={handleSaveScannedProduct}>
              <Text style={styles.primaryButtonText}>Save Scanned Product</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={openScannerFromReview}>
              <Text style={styles.secondaryButtonText}>Scan Again</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={closeScannedReview}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={!!selectedItem}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setSelectedItem(null);
          setLogGrams("100");
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setSelectedItem(null);
            setLogGrams("100");
          }}
        >
          <View style={styles.modalSheet}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>{selectedItem?.name}</Text>
            <Text style={styles.modalSub}>{selectedItem ? `${Math.round(selectedItem.food.calories)} kcal / 100g` : ""}</Text>
            {selectedItem?.food.packageServingSize && selectedItem.food.packageServingUnit && (
              <Text style={styles.modalServingSub}>
                1 serving ({selectedItem.food.packageServingSize}
                {selectedItem.food.packageServingUnit}): {Math.round(selectedItem.food.calories * (selectedItem.food.packageServingSize / selectedItem.food.servingSize))} kcal
              </Text>
            )}

            <View style={styles.gramsRow}>
              <TouchableOpacity
                style={styles.gramsBtn}
                onPress={() => setLogGrams(String(Math.max(25, (parseFloat(logGrams) || 100) - 25)))}
              >
                <Text style={styles.gramsBtnText}>-</Text>
              </TouchableOpacity>
              <View style={styles.gramsInputWrap}>
                <TextInput
                  style={styles.gramsInput}
                  value={logGrams}
                  onChangeText={setLogGrams}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                <Text style={styles.gramsLabel}>grams</Text>
              </View>
              <TouchableOpacity
                style={styles.gramsBtn}
                onPress={() => setLogGrams(String((parseFloat(logGrams) || 100) + 25))}
              >
                <Text style={styles.gramsBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.macroRow}>
              {(() => {
                const grams = Math.max(0, parseFloat(logGrams) || 0);
                const s = grams / (selectedItem?.food.servingSize ?? 100);
                return [
                  { label: "Cal", value: Math.round((selectedItem?.food.calories ?? 0) * s), color: Colors.bar },
                  { label: "Protein", value: `${Math.round((selectedItem?.food.protein ?? 0) * s)}g`, color: Colors.proteine },
                  { label: "Carbs", value: `${Math.round((selectedItem?.food.carbs ?? 0) * s)}g`, color: Colors.carbohydrates },
                  { label: "Fat", value: `${Math.round((selectedItem?.food.fat ?? 0) * s)}g`, color: Colors.fats },
                ].map((macro) => (
                  <View key={macro.label} style={[styles.macroPill, { borderColor: macro.color }]}>
                    <Text style={[styles.macroValue, { color: macro.color }]}>{macro.value}</Text>
                    <Text style={styles.macroLabel}>{macro.label}</Text>
                  </View>
                ));
              })()}
            </View>

            <Text style={styles.modalMealText}>Add to which meal?</Text>
            <View style={styles.mealGrid}>
              {MEAL_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.mealBtn, { borderColor: MEAL_COLORS[type] }]}
                  onPress={() => handleLog(type)}
                >
                  <View style={[styles.mealDot, { backgroundColor: MEAL_COLORS[type] }]} />
                  <Text style={styles.mealBtnText}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  modeRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  modeButton: {
    flex: 1,
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  modeButtonActive: { borderColor: Colors.bar },
  modeButtonText: { color: Colors.textDim, fontSize: 13, fontWeight: "600" },
  modeButtonTextActive: { color: Colors.white },
  content: { padding: 16, paddingBottom: 28 },
  section: { backgroundColor: Colors.secondaryBackground, borderRadius: 12, padding: 16 },
  sectionTitle: { color: Colors.white, fontSize: 18, fontWeight: "700" },
  sectionSub: { color: Colors.textDim, fontSize: 13, marginTop: 4, marginBottom: 14 },
  emptyText: { color: Colors.textDim, fontSize: 14 },
  savedCard: { backgroundColor: Colors.tabBackground, borderRadius: 10, padding: 14, marginBottom: 10 },
  savedHeader: { flexDirection: "row", gap: 10 },
  savedTitleWrap: { flex: 1 },
  savedTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  savedName: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  savedMeta: { color: Colors.textDim, fontSize: 12, marginTop: 3 },
  savedServing: { color: "#BEEFFF", fontSize: 11, marginTop: 4 },
  savedBarcode: { color: Colors.textDim, fontSize: 11, marginTop: 4 },
  savedMacros: { color: Colors.text, fontSize: 12, marginTop: 6 },
  savedActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  barcodeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#7FDBFF",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  barcodeBadgeText: { color: Colors.black, fontSize: 11, fontWeight: "700" },
  logNowButton: {
    marginTop: 12,
    backgroundColor: Colors.rosyGranite,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  logNowText: { color: Colors.white, fontSize: 14, fontWeight: "700" },
  scanButton: {
    backgroundColor: Colors.tabBackground,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.rosyGranite,
  },
  scanButtonText: { color: Colors.white, fontSize: 14, fontWeight: "700" },
  segmentedControl: { flexDirection: "row", gap: 8, marginBottom: 12 },
  segment: {
    flex: 1,
    backgroundColor: Colors.tabBackground,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  segmentActive: { borderColor: Colors.bar },
  segmentText: { color: Colors.textDim, fontSize: 14, fontWeight: "600" },
  segmentTextActive: { color: Colors.white },
  input: {
    backgroundColor: Colors.tabBackground,
    color: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 10,
  },
  threeColRow: { flexDirection: "row", gap: 8 },
  twoColRow: { flexDirection: "row", gap: 8 },
  thirdField: { flex: 1 },
  halfField: { flex: 1 },
  primaryButton: {
    backgroundColor: Colors.bar,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 6,
  },
  primaryButtonText: { color: Colors.black, fontSize: 15, fontWeight: "700" },
  secondaryButton: {
    backgroundColor: Colors.tabBackground,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryButtonText: { color: Colors.white, fontSize: 14, fontWeight: "600" },
  label: { color: Colors.text, fontSize: 13, marginBottom: 8 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: Colors.tabBackground, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  chipText: { color: Colors.white, fontSize: 13, fontWeight: "600" },
  ingredientsLabel: { marginTop: 16 },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  searchInput: { flex: 1, marginBottom: 0 },
  searchBtn: {
    backgroundColor: Colors.rosyGranite,
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  searchBtnText: { color: Colors.white, fontWeight: "700", fontSize: 15 },
  searchLoading: { marginVertical: 8 },
  searchResultsWrap: { marginBottom: 8 },
  searchResult: {
    backgroundColor: Colors.tabBackground,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchResultMain: { flex: 1 },
  searchResultName: { color: Colors.white, fontSize: 14, fontWeight: "600" },
  searchResultMeta: { color: Colors.textDim, fontSize: 12, marginTop: 3 },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.tabBackground,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  ingredientMain: { flex: 1 },
  ingredientName: { color: Colors.white, fontSize: 14, fontWeight: "600", marginBottom: 4 },
  ingredientMeta: { color: Colors.textDim, fontSize: 12, marginBottom: 8 },
  ingredientActions: { alignItems: "center", gap: 10 },
  ingredientInput: {
    backgroundColor: Colors.secondaryBackground,
    color: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  recipeSummary: { backgroundColor: Colors.tabBackground, borderRadius: 10, padding: 14, marginTop: 12 },
  recipeSummaryTitle: { color: Colors.white, fontSize: 15, fontWeight: "700", marginBottom: 6 },
  recipeSummaryLine: { color: Colors.text, fontSize: 13, marginBottom: 4 },
  recipeSummarySub: { color: Colors.textDim, fontSize: 12, marginTop: 2 },
  iconDisabled: { opacity: 0.35 },
  scannerScreen: { flex: 1, backgroundColor: Colors.background },
  scannerTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  scannerCloseBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerTitle: { color: Colors.white, fontSize: 18, fontWeight: "700" },
  scannerSpacer: { width: 36, height: 36 },
  scannerBody: { flex: 1 },
  camera: { flex: 1 },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.20)",
  },
  scannerFrame: {
    width: "72%",
    aspectRatio: 1.55,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#7FDBFF",
    backgroundColor: "transparent",
  },
  scannerHint: {
    color: Colors.white,
    fontSize: 14,
    marginTop: 20,
    fontWeight: "600",
  },
  lookupOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  lookupOverlayText: { color: Colors.white, fontSize: 15, fontWeight: "600" },
  permissionWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  permissionTitle: {
    color: Colors.white,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: Colors.secondaryBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.rosyGranite,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: { color: Colors.white, fontSize: 20, fontWeight: "700" },
  modalSub: { color: Colors.textDim, fontSize: 13, marginTop: 4, marginBottom: 16 },
  modalServingSub: { color: "#BEEFFF", fontSize: 12, marginTop: -10, marginBottom: 14 },
  gramsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 20 },
  gramsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.tabBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  gramsBtnText: { color: Colors.white, fontSize: 22, fontWeight: "300", lineHeight: 26 },
  gramsInputWrap: { alignItems: "center" },
  gramsInput: { color: Colors.white, fontSize: 28, fontWeight: "700", textAlign: "center", minWidth: 60 },
  gramsLabel: { color: Colors.textDim, fontSize: 12, marginTop: 2 },
  macroRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  macroPill: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  macroValue: { fontSize: 15, fontWeight: "700" },
  macroLabel: { color: Colors.textDim, fontSize: 11, marginTop: 2 },
  modalMealText: { color: Colors.textDim, fontSize: 13, marginBottom: 12 },
  mealGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  mealBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "47%",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
  },
  mealDot: { width: 10, height: 10, borderRadius: 5 },
  mealBtnText: { color: Colors.white, fontSize: 15, fontWeight: "600" },
});
