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
import { searchFoods } from "../utils/api";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;

const MEAL_COLORS: Record<string, string> = {
  Breakfast: "#FF9F43",
  Lunch: "#00D2D3",
  Dinner: "#A29BFE",
  Snacks: "#FD79A8",
};

type LogMode = "saved" | "food" | "recipe";
type CustomKind = "food" | "product";

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatMacros(food: Food): string {
  return `${Math.round(food.protein)}P  ${Math.round(food.carbs)}C  ${Math.round(food.fat)}F`;
}

function toInputValue(value?: number): string {
  return value === undefined ? "" : String(value);
}

export default function LogScreen() {
  const [mode, setMode] = useState<LogMode>("saved");
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<CustomItem | null>(null);
  const [editingItem, setEditingItem] = useState<CustomItem | null>(null);
  const [logGrams, setLogGrams] = useState("100");

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
          };
        },
        { grams: 0, calories: 0, protein: 0, carbs: 0, fat: 0 },
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

            {savedItems.length === 0 ? (
              <Text style={styles.emptyText}>You have not created any custom items yet.</Text>
            ) : (
              savedItems.map((item) => (
                <View key={item.id} style={styles.savedCard}>
                  <View style={styles.savedHeader}>
                    <View style={styles.savedTitleWrap}>
                      <Text style={styles.savedName}>{item.name}</Text>
                      <Text style={styles.savedMeta}>
                        {item.kind === "recipe" ? "Recipe" : item.kind === "product" ? "Product" : "Food"}
                        {" • "}
                        {Math.round(item.food.calories)} kcal / 100g
                      </Text>
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
                      setLogGrams("100");
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
              Use both saved items and searched foods as ingredients. The recipe macros update automatically.
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
              recipeIngredients.map((ingredient) => (
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
                  <TouchableOpacity onPress={() => removeRecipeIngredient(ingredient.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={Colors.textDim} />
                  </TouchableOpacity>
                </View>
              ))
            )}

            <View style={styles.recipeSummary}>
              <Text style={styles.recipeSummaryTitle}>Recipe Total</Text>
              <Text style={styles.recipeSummaryLine}>{Math.round(recipeTotals.grams)}g total</Text>
              <Text style={styles.recipeSummaryLine}>
                {Math.round(recipeTotals.calories)} kcal • {Math.round(recipeTotals.protein)}P • {Math.round(recipeTotals.carbs)}C • {Math.round(recipeTotals.fat)}F
              </Text>
              {recipeTotals.grams > 0 && (
                <Text style={styles.recipeSummarySub}>
                  Per 100g: {Math.round(recipeTotals.calories * (100 / recipeTotals.grams))} kcal
                </Text>
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
  savedName: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  savedMeta: { color: Colors.textDim, fontSize: 12, marginTop: 3 },
  savedMacros: { color: Colors.text, fontSize: 12, marginTop: 6 },
  savedActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  logNowButton: {
    marginTop: 12,
    backgroundColor: Colors.rosyGranite,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  logNowText: { color: Colors.white, fontSize: 14, fontWeight: "700" },
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
