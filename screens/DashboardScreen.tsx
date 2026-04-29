import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { deleteMeal, getMealsByDate, getProfile, getWaterByDate, setWaterByDate } from "../utils/storage";
import { calculateTotals, formatDate, todayISO } from "../utils/nutrition";
import { DailyTotals, MealEntry } from "../types";
import { Colors } from "../style/theme";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;
const DEFAULT_GOAL_CALORIES = 2000;
const DEFAULT_WATER_GOAL_ML = 2000;
const DAY_PILL_WIDTH = 58;
const DAY_PILL_GAP = 8;
const DAY_PILL_FULL_WIDTH = DAY_PILL_WIDTH + DAY_PILL_GAP;
const HORIZONTAL_PAGE_PADDING = 16;
const WATER_ADJUSTMENTS = [-500, -250, -100, 100, 250, 500] as const;

const MEAL_COLORS: Record<string, string> = {
  Breakfast: "#FF9F43",
  Lunch: "#00D2D3",
  Dinner: "#A29BFE",
  Snacks: "#FD79A8",
};

function shiftIsoDate(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shortDayLabel(iso: string): { weekday: string; day: string } {
  const date = new Date(`${iso}T00:00:00`);
  return {
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
    day: date.toLocaleDateString("en-US", { day: "numeric" }),
  };
}

export default function DashboardScreen() {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [totals, setTotals] = useState<DailyTotals>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [goalCalories, setGoalCalories] = useState(DEFAULT_GOAL_CALORIES);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [waterMl, setWaterMl] = useState(0);
  const [waterGoalMl, setWaterGoalMl] = useState(DEFAULT_WATER_GOAL_ML);
  const [waterModalVisible, setWaterModalVisible] = useState(false);
  const [draftWaterMl, setDraftWaterMl] = useState("100");

  const today = todayISO();
  const { width: screenWidth } = useWindowDimensions();
  const dayStripRef = useRef<ScrollView>(null);
  const recenterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timelineDates = useMemo(
    () => Array.from({ length: 21 }, (_, index) => shiftIsoDate(today, index - 10)),
    [today],
  );

  const todayIndex = 10;
  const stripViewportWidth = Math.max(0, screenWidth - HORIZONTAL_PAGE_PADDING * 2);
  const sidePadding = Math.max(0, Math.round((stripViewportWidth - DAY_PILL_WIDTH) / 2));

  function centerToday(animated: boolean) {
    dayStripRef.current?.scrollTo({
      x: todayIndex * DAY_PILL_FULL_WIDTH,
      animated,
    });
  }

  function clearRecenterTimer() {
    if (recenterTimeoutRef.current) {
      clearTimeout(recenterTimeoutRef.current);
      recenterTimeoutRef.current = null;
    }
  }

  function scheduleRecenter() {
    clearRecenterTimer();
    recenterTimeoutRef.current = setTimeout(() => {
      centerToday(true);
    }, 5000);
  }

  function reload(date: string = selectedDate) {
    Promise.all([getMealsByDate(date), getProfile(), getWaterByDate(date)]).then(([data, profile, water]) => {
      setMeals(data);
      setTotals(calculateTotals(data));
      setGoalCalories(profile?.goalCalories || DEFAULT_GOAL_CALORIES);
      setWaterGoalMl(profile?.waterGoalMl || DEFAULT_WATER_GOAL_ML);
      setWaterMl(water);
    });
  }

  useFocusEffect(
    React.useCallback(() => {
      reload(selectedDate);
      scheduleRecenter();
      return () => {
        clearRecenterTimer();
      };
    }, [selectedDate]),
  );

  useEffect(() => {
    const timer = setTimeout(() => centerToday(false), 50);
    return () => clearTimeout(timer);
  }, [screenWidth, today]);

  async function handleDelete(id: string, name: string) {
    Alert.alert("Remove", `Remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await deleteMeal(id);
          reload(selectedDate);
        },
      },
    ]);
  }

  function openWaterModal() {
    setDraftWaterMl(String(waterMl));
    setWaterModalVisible(true);
  }

  function closeWaterModal() {
    setWaterModalVisible(false);
    setDraftWaterMl(String(waterMl));
  }

  function updateDraftWater(nextAmount: number) {
    setDraftWaterMl(String(Math.max(0, nextAmount)));
  }

  function adjustDraftWater(delta: number) {
    const current = parseFloat(draftWaterMl);
    const safeCurrent = Number.isFinite(current) ? current : waterMl;
    updateDraftWater(safeCurrent + delta);
  }

  async function handleConfirmWater() {
    const parsed = parseFloat(draftWaterMl);
    const safeAmount = Number.isFinite(parsed) && parsed >= 0 ? parsed : waterMl;
    setWaterMl(safeAmount);
    await setWaterByDate(selectedDate, safeAmount);
    setWaterModalVisible(false);
  }

  const remaining = goalCalories - totals.calories;
  const progress = goalCalories > 0 ? Math.min(totals.calories / goalCalories, 1) : 0;
  const waterProgress = waterGoalMl > 0 ? Math.min(waterMl / waterGoalMl, 1) : 0;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <ScrollView
          ref={dayStripRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.dayStrip, { paddingHorizontal: sidePadding }]}
          snapToInterval={DAY_PILL_FULL_WIDTH}
          decelerationRate="fast"
          onScrollBeginDrag={clearRecenterTimer}
          onMomentumScrollEnd={scheduleRecenter}
        >
          {timelineDates.map((date, index) => {
            const label = shortDayLabel(date);
            const isSelected = date === selectedDate;
            const isToday = date === today;
            const isLast = index === timelineDates.length - 1;

            return (
              <TouchableOpacity
                key={date}
                style={[
                  styles.dayPill,
                  !isLast && styles.dayPillSpaced,
                  isToday && styles.dayPillToday,
                  isSelected && styles.dayPillActive,
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text
                  style={[
                    styles.dayPillWeekday,
                    isToday && styles.dayPillTodayText,
                    isSelected && styles.dayPillTextActive,
                  ]}
                >
                  {label.weekday}
                </Text>
                <Text
                  style={[
                    styles.dayPillDay,
                    isToday && styles.dayPillTodayText,
                    isSelected && styles.dayPillTextActive,
                  ]}
                >
                  {label.day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.date}>{formatDate(selectedDate)}</Text>

        <View style={styles.topSummaryRow}>
          <View style={[styles.card, styles.caloriesCard]}>
            <Text style={styles.cardTitle}>Calories</Text>
            <Text style={styles.bigNumber}>{Math.round(totals.calories)}</Text>
            <Text style={styles.sub}>of {goalCalories} goal</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.remaining}>
              {remaining > 0 ? `${Math.round(remaining)} remaining` : "Goal reached!"}
            </Text>
          </View>

          <TouchableOpacity style={styles.waterTopCard} onPress={openWaterModal} activeOpacity={0.9}>
            <View style={[styles.waterFillOverlay, { height: `${waterProgress * 100}%` }]} />
            <View style={styles.waterCardContent}>
              <Text style={styles.waterTitle}>Water</Text>
              <Text style={styles.waterAmount}>{Math.round(waterMl)}ml</Text>
              <Text style={styles.waterSub}>of {waterGoalMl}ml</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.macroRow}>
          {[
            { label: "Protein", value: totals.protein, color: Colors.proteine },
            { label: "Carbs", value: totals.carbs, color: Colors.carbohydrates },
            { label: "Fat", value: totals.fat, color: Colors.fats },
          ].map((m) => (
            <View key={m.label} style={[styles.macroCard, { borderTopColor: m.color }]}>
              <Text style={styles.macroValue}>{Math.round(m.value)}g</Text>
              <Text style={styles.macroLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {MEAL_TYPES.map((type) => {
          const color = MEAL_COLORS[type];
          const entries = meals.filter((m) => m.mealType === type);
          const typeCals = entries.reduce((sum, e) => sum + e.food.calories * e.servings, 0);

          return (
            <View key={type} style={[styles.card, { borderLeftColor: color, borderLeftWidth: 4 }]}>
              <View style={styles.mealHeader}>
                <Text style={[styles.mealType, { color }]}>{type}</Text>
                <Text style={styles.mealCals}>{Math.round(typeCals)} kcal</Text>
              </View>
              {entries.length === 0 ? (
                <Text style={styles.empty}>No foods logged yet</Text>
              ) : (
                entries.map((e) => (
                  <View key={e.id} style={styles.foodRow}>
                    <View style={[styles.foodDot, { backgroundColor: color }]} />
                    <Text style={styles.foodName}>
                      {e.food.name.charAt(0).toUpperCase() + e.food.name.slice(1)}
                    </Text>
                    <Text style={styles.foodCals}>{Math.round(e.food.calories * e.servings)} kcal</Text>
                    <TouchableOpacity onPress={() => handleDelete(e.id, e.food.name)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={16} color={Colors.textDim} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={waterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeWaterModal}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeWaterModal}>
          <View style={styles.modalSheet}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>Water Log</Text>
            <Text style={styles.modalSub}>{formatDate(selectedDate)}</Text>

            <View style={styles.waterInputWrap}>
              <TextInput
                style={styles.waterInput}
                value={draftWaterMl}
                onChangeText={setDraftWaterMl}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              <Text style={styles.waterInputLabel}>ml logged</Text>
            </View>

            <View style={styles.adjustmentGrid}>
              {WATER_ADJUSTMENTS.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.adjustmentBtn}
                  onPress={() => adjustDraftWater(amount)}
                >
                  <Text style={styles.adjustmentBtnText}>
                    {amount > 0 ? `+${amount}ml` : `${amount}ml`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmWater}>
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: HORIZONTAL_PAGE_PADDING, paddingBottom: 28 },
  dayStrip: { paddingBottom: 12 },
  dayPill: {
    width: DAY_PILL_WIDTH,
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayPillSpaced: { marginRight: DAY_PILL_GAP },
  dayPillToday: {
    backgroundColor: "#F4C95D",
    borderColor: "#FFE08A",
    borderWidth: 1.5,
  },
  dayPillActive: {
    borderColor: Colors.bar,
    borderWidth: 2,
  },
  dayPillWeekday: { color: Colors.textDim, fontSize: 11, fontWeight: "600" },
  dayPillDay: { color: Colors.white, fontSize: 17, fontWeight: "700", marginTop: 2 },
  dayPillTodayText: { color: Colors.black },
  dayPillTextActive: { color: Colors.white },
  date: { fontSize: 18, fontWeight: "600", marginBottom: 12, color: Colors.text },
  card: {
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  topSummaryRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
    marginBottom: 12,
  },
  caloriesCard: {
    flex: 1,
    marginBottom: 0,
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
  mealHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  mealType: { fontWeight: "600", fontSize: 16, color: Colors.text },
  mealCals: { color: Colors.textDim },
  empty: { color: Colors.textDim, fontStyle: "italic" },
  foodRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 8 },
  foodDot: { width: 7, height: 7, borderRadius: 4 },
  foodName: { color: Colors.text, flex: 1, fontSize: 14 },
  foodCals: { color: Colors.textDim, fontSize: 13 },
  waterTopCard: {
    flex: 1,
    minHeight: 164,
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
    position: "relative",
    marginBottom: 0,
  },
  waterFillOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 225, 255, 0.22)",
  },
  waterCardContent: {
    padding: 14,
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  waterTitle: {
    color: "#7FDBFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  waterAmount: {
    color: "#7FDBFF",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  waterSub: {
    color: "#BEEFFF",
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
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
  modalSub: { color: Colors.textDim, fontSize: 13, marginTop: 4, marginBottom: 18 },
  waterInputWrap: { alignItems: "center", marginBottom: 20 },
  waterInput: {
    color: Colors.white,
    fontSize: 36,
    fontWeight: "700",
    textAlign: "center",
    minWidth: 110,
  },
  waterInputLabel: { color: Colors.textDim, fontSize: 12, marginTop: 2 },
  adjustmentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  adjustmentBtn: {
    width: "31%",
    backgroundColor: Colors.tabBackground,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  adjustmentBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  confirmBtn: {
    backgroundColor: "#7FDBFF",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  confirmBtnText: { color: Colors.black, fontSize: 15, fontWeight: "700" },
});
