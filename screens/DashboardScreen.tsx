import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getMealsByDate } from "../utils/storage";
import { calculateTotals, todayISO, formatDate } from "../utils/nutrition";
import { MealEntry, DailyTotals } from "../types";

import { Colors } from "../style/theme";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;
const GOAL_CALORIES = 2000; // TODO: pull from user profile

export default function DashboardScreen() {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [totals, setTotals] = useState<DailyTotals>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const today = todayISO();

  useFocusEffect(
    React.useCallback(() => {
      getMealsByDate(today).then((data) => {
        setMeals(data);
        setTotals(calculateTotals(data));
      });
    }, []),
  );

  const remaining = GOAL_CALORIES - totals.calories;
  const progress = Math.min(totals.calories / GOAL_CALORIES, 1);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.date}>{formatDate(today)}</Text>

      {/* Calorie ring summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Calories</Text>
        <Text style={styles.bigNumber}>{Math.round(totals.calories)}</Text>
        <Text style={styles.sub}>of {GOAL_CALORIES} goal</Text>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
          />
        </View>
        <Text style={styles.remaining}>
          {remaining > 0
            ? `${Math.round(remaining)} remaining`
            : "Goal reached!"}
        </Text>
      </View>

      {/* Macros row */}
      <View style={styles.macroRow}>
        {[
          { label: "Protein", value: totals.protein, color: Colors.proteine },
          { label: "Carbs", value: totals.carbs, color: Colors.carbohydrates },
          { label: "Fat", value: totals.fat, color: Colors.fats },
        ].map((m) => (
          <View
            key={m.label}
            style={[styles.macroCard, { borderTopColor: m.color }]}
          >
            <Text style={styles.macroValue}>{Math.round(m.value)}g</Text>
            <Text style={styles.macroLabel}>{m.label}</Text>
          </View>
        ))}
      </View>

      {/* Meals by type */}
      {MEAL_TYPES.map((type) => {
        const entries = meals.filter((m) => m.mealType === type);
        const typeCals = entries.reduce(
          (sum, e) => sum + e.food.calories * e.servings,
          0,
        );
        return (
          <View key={type} style={styles.card}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealType}>{type}</Text>
              <Text style={styles.mealCals}>{Math.round(typeCals)} kcal</Text>
            </View>
            {entries.length === 0 ? (
              <Text style={styles.empty}>No foods logged yet</Text>
            ) : (
              entries.map((e) => (
                <View key={e.id} style={styles.foodRow}>
                  <Text style={styles.foodName}>
                    {e.food.name.charAt(0).toUpperCase() + e.food.name.slice(1)}
                  </Text>
                  <Text style={styles.foodCals}>
                    {Math.round(e.food.calories * e.servings)} kcal
                  </Text>
                </View>
              ))
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  date: { fontSize: 18, fontWeight: "600", marginBottom: 12, color: Colors.text },
  card: {
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cardTitle: { fontSize: 14, color: Colors.text, marginBottom: 4 },
  bigNumber: { fontSize: 48, fontWeight: "bold", color: Colors.text },
  sub: { color: Colors.textDim, marginBottom: 8 },
  progressBar: {
    height: 8,
    backgroundColor: Colors.rosyGranite,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: Colors.bar, borderRadius: 4 },
  remaining: { marginTop: 8, color: Colors.textDim },
  macroRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  macroCard: {
    flex: 1,
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 12,
    padding: 12,
    borderTopWidth: 3,
    elevation: 2,
  },
  macroValue: { fontSize: 20, fontWeight: "bold", color: Colors.text },
  macroLabel: { color: Colors.textDim, fontSize: 12 },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  mealType: { fontWeight: "600", fontSize: 16, color: Colors.text },
  mealCals: { color: Colors.textDim },
  empty: { color: Colors.textDim, fontStyle: "italic" },
  foodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  foodName: { color: Colors.textDim, flex: 1 },
  foodCals: { color: Colors.textDim, marginLeft: 8 },
});
