import React, { useMemo, useState } from "react";
import {
  Alert,
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
import { MealEntry, ProfileSnapshot } from "../types";
import {
  addMeal,
  deleteProfileSnapshot,
  getFoodHistory,
  getProfileHistory,
} from "../utils/storage";
import { generateId, todayISO } from "../utils/nutrition";
import { Colors } from "../style/theme";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;

const MEAL_COLORS: Record<string, string> = {
  Breakfast: "#FF9F43",
  Lunch: "#00D2D3",
  Dinner: "#A29BFE",
  Snacks: "#FD79A8",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function mealAmountLabel(entry: MealEntry): string {
  const grams = Math.round(entry.food.servingSize * entry.servings);
  return `${grams}g`;
}

export default function HistoryScreen() {
  const [foodHistory, setFoodHistory] = useState<MealEntry[]>([]);
  const [profileHistory, setProfileHistory] = useState<ProfileSnapshot[]>([]);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<MealEntry | null>(null);
  const [grams, setGrams] = useState("100");

  function reload() {
    Promise.all([getFoodHistory(), getProfileHistory()]).then(([mealData, historyData]) => {
      setFoodHistory(mealData);
      setProfileHistory(historyData);
    });
  }

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      Promise.all([getFoodHistory(), getProfileHistory()]).then(([mealData, historyData]) => {
        if (!active) return;
        setFoodHistory(mealData);
        setProfileHistory(historyData);
      });

      return () => {
        active = false;
      };
    }, []),
  );

  function handleDeleteSnapshot(snapshot: ProfileSnapshot) {
    Alert.alert(
      "Remove entry",
      `Remove the body stat entry from ${formatDateTime(snapshot.recordedAt)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await deleteProfileSnapshot(snapshot.id);
            reload();
          },
        },
      ],
    );
  }

  async function handleRelog(mealType: (typeof MEAL_TYPES)[number]) {
    if (!selectedHistoryEntry) return;
    const parsedGrams = parseFloat(grams);
    const validGrams = Number.isFinite(parsedGrams) && parsedGrams > 0 ? parsedGrams : 100;
    const servingMultiplier = validGrams / selectedHistoryEntry.food.servingSize;

    const entry: MealEntry = {
      id: generateId(),
      food: selectedHistoryEntry.food,
      mealType,
      servings: servingMultiplier,
      date: todayISO(),
      loggedAt: new Date().toISOString(),
    };

    await addMeal(entry);
    Alert.alert("Logged", `${selectedHistoryEntry.food.name} added to ${mealType}.`);
    setSelectedHistoryEntry(null);
    setGrams("100");
    reload();
  }

  const recentMeals = useMemo(
    () =>
      [...foodHistory]
        .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
        .slice(0, 20),
    [foodHistory],
  );

  const bodyTimeline = useMemo(
    () =>
      [...profileHistory]
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
        .slice(0, 12),
    [profileHistory],
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Foods</Text>
          <Text style={styles.sectionSub}>Last 20 foods you logged, even if later removed from meals</Text>

          {recentMeals.length === 0 ? (
            <Text style={styles.emptyText}>No foods logged yet.</Text>
          ) : (
            recentMeals.map((entry) => (
              <View key={`${entry.id}-${entry.loggedAt}`} style={styles.historyRow}>
                <View style={styles.historyMain}>
                  <Text style={styles.foodName}>
                    {entry.food.name.charAt(0).toUpperCase() + entry.food.name.slice(1)}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {entry.mealType} • {mealAmountLabel(entry)} • {formatDateTime(entry.loggedAt)}
                  </Text>
                </View>
                <Text style={styles.calories}>{Math.round(entry.food.calories * entry.servings)} kcal</Text>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => {
                    setSelectedHistoryEntry(entry);
                    setGrams(String(Math.max(25, Math.round(entry.food.servingSize * entry.servings))));
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="add" size={16} color={Colors.white} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weight & Height Over Time</Text>
          <Text style={styles.sectionSub}>Saved from your profile updates</Text>

          {bodyTimeline.length === 0 ? (
            <Text style={styles.emptyText}>Save your profile to start tracking body stats over time.</Text>
          ) : (
            bodyTimeline.map((snapshot) => (
              <View key={snapshot.id} style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineDate}>{formatDateTime(snapshot.recordedAt)}</Text>
                    <TouchableOpacity onPress={() => handleDeleteSnapshot(snapshot)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={16} color={Colors.textDim} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.metricRow}>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricValue}>{snapshot.weightKg}</Text>
                      <Text style={styles.metricLabel}>kg</Text>
                    </View>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricValue}>{snapshot.heightCm}</Text>
                      <Text style={styles.metricLabel}>cm</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!selectedHistoryEntry}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setSelectedHistoryEntry(null);
          setGrams("100");
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setSelectedHistoryEntry(null);
            setGrams("100");
          }}
        >
          <View style={styles.modalSheet}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>{selectedHistoryEntry?.food.name}</Text>
            <Text style={styles.modalSub}>
              {selectedHistoryEntry ? `${Math.round(selectedHistoryEntry.food.calories)} kcal / 100g` : ""}
            </Text>

            <View style={styles.gramsRow}>
              <TouchableOpacity
                style={styles.gramsBtn}
                onPress={() => setGrams(String(Math.max(25, (parseFloat(grams) || 100) - 25)))}
              >
                <Text style={styles.gramsBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.gramsInputWrap}>
                <TextInput
                  style={styles.gramsInput}
                  value={grams}
                  onChangeText={setGrams}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                <Text style={styles.gramsLabel}>grams</Text>
              </View>
              <TouchableOpacity
                style={styles.gramsBtn}
                onPress={() => setGrams(String((parseFloat(grams) || 100) + 25))}
              >
                <Text style={styles.gramsBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.macroRow}>
              {(() => {
                const enteredGrams = Math.max(0, parseFloat(grams) || 0);
                const s = enteredGrams / (selectedHistoryEntry?.food.servingSize ?? 100);
                return [
                  { label: "Cal", value: Math.round((selectedHistoryEntry?.food.calories ?? 0) * s), color: Colors.bar },
                  { label: "Protein", value: `${Math.round((selectedHistoryEntry?.food.protein ?? 0) * s)}g`, color: Colors.proteine },
                  { label: "Carbs", value: `${Math.round((selectedHistoryEntry?.food.carbs ?? 0) * s)}g`, color: Colors.carbohydrates },
                  { label: "Fat", value: `${Math.round((selectedHistoryEntry?.food.fat ?? 0) * s)}g`, color: Colors.fats },
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
                  onPress={() => handleRelog(type)}
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
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  section: { backgroundColor: Colors.secondaryBackground, borderRadius: 12, padding: 16 },
  sectionTitle: { color: Colors.white, fontSize: 18, fontWeight: "700" },
  sectionSub: { color: Colors.textDim, fontSize: 13, marginTop: 4, marginBottom: 14 },
  emptyText: { color: Colors.textDim, fontSize: 14 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.tabBackground,
  },
  historyMain: { flex: 1 },
  foodName: { color: Colors.white, fontSize: 15, fontWeight: "600" },
  historyMeta: { color: Colors.textDim, fontSize: 12, marginTop: 3 },
  calories: { color: Colors.primary, fontSize: 14, fontWeight: "700" },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.rosyGranite,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineRow: { flexDirection: "row", gap: 12, paddingVertical: 10 },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.bar,
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: Colors.tabBackground,
    paddingTop: 10,
  },
  timelineDate: { color: Colors.text, fontSize: 13 },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  metricRow: { flexDirection: "row", gap: 10 },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.tabBackground,
    borderRadius: 10,
    padding: 12,
  },
  metricValue: { color: Colors.white, fontSize: 20, fontWeight: "700" },
  metricLabel: { color: Colors.textDim, fontSize: 12, marginTop: 3 },
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
