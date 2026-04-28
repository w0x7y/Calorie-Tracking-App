import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { searchFoods } from "../utils/api";
import { addMeal } from "../utils/storage";
import { generateId, todayISO } from "../utils/nutrition";
import { Food, MealEntry } from "../types";

import { Colors } from "../style/theme";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const foods = await searchFoods(query);
      setResults(foods);
    } catch {
      Alert.alert("Error", "Could not fetch results. Check your API keys.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLog(food: Food, mealType: (typeof MEAL_TYPES)[number]) {
    const entry: MealEntry = {
      id: generateId(),
      food,
      mealType,
      servings: 1,
      date: todayISO(),
      loggedAt: new Date().toISOString(),
    };
    await addMeal(entry);
    Alert.alert("Logged!", `${food.name} added to ${mealType}`);
  }

  function showMealPicker(food: Food) {
    Alert.alert(
      "Add to meal",
      "Which meal?",
      MEAL_TYPES.map((type) => ({
        text: type,
        onPress: () => handleLog(food, type),
      })),
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search foods..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Go</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <ActivityIndicator style={{ marginTop: 20 }} color={Colors.platinum} />
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultCard}
            onPress={() => showMealPicker(item)}
          >
            <View style={styles.resultLeft}>
              <Text style={styles.foodName}>
                {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
              </Text>
              {item.brand && <Text style={styles.brand}>{item.brand}</Text>}
              <Text style={styles.serving}>
                {item.servingSize} {item.servingUnit}
              </Text>
            </View>
            <View style={styles.resultRight}>
              <Text style={styles.calories}>{item.calories}</Text>
              <Text style={styles.kcal}>kcal</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.hint}>Search for a food to get started</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.platinum, padding: 16 },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  input: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    elevation: 2,
  },
  searchBtn: {
    backgroundColor: Colors.rosyGranite,
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  searchBtnText: { color: Colors.white, fontWeight: "700", fontSize: 16 },
  resultCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    elevation: 1,
  },
  resultLeft: { flex: 1 },
  resultRight: { alignItems: "flex-end", justifyContent: "center" },
  foodName: { fontSize: 15, fontWeight: "600", color: Colors.black },
  brand: { fontSize: 12, color: Colors.dimGrey, marginTop: 2 },
  serving: { fontSize: 12, color: Colors.dimGrey, marginTop: 2 },
  calories: { fontSize: 22, fontWeight: "bold", color: Colors.rosyGranite },
  kcal: { fontSize: 12, color: Colors.dimGrey },
  hint: { textAlign: "center", color: Colors.dimGrey, marginTop: 40, fontSize: 15 },
});
