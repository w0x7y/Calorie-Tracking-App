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
import {
  deleteMeal,
  getMealsByDate,
  getProfile,
  getStepRecordByDate,
  getStepSyncSettings,
  getWaterByDate,
  saveStepRecord,
  saveStepSyncSettings,
  setWaterByDate,
  updateMeal,
} from "../utils/storage";
import { getAppleHealthStepCountForDate, isAppleHealthSupported } from "../utils/health";
import { calculateTotals, formatDate, todayISO } from "../utils/nutrition";
import { DailyTotals, MealEntry } from "../types";
import { useTheme } from "../style/ThemeContext";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;
const DEFAULT_GOAL_CALORIES = 2000;
const DEFAULT_WATER_GOAL_ML = 2500;
const DEFAULT_STEP_GOAL = 8000;
const DAY_PILL_WIDTH = 58;
const DAY_PILL_GAP = 8;
const DAY_PILL_FULL_WIDTH = DAY_PILL_WIDTH + DAY_PILL_GAP;
const HORIZONTAL_PAGE_PADDING = 20;
const WATER_ADJUSTMENTS = [-500, -250, -100, 100, 250, 500] as const;

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

function mealEntryGrams(entry: MealEntry): number {
  return Math.max(0, Math.round(entry.food.servingSize * entry.servings));
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const MEAL_COLORS: Record<string, string> = useMemo(() => ({
    Breakfast: colors.mealBreakfast,
    Lunch: colors.mealLunch,
    Dinner: colors.mealDinner,
    Snacks: colors.mealSnacks,
  }), [colors]);

  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [totals, setTotals] = useState<DailyTotals>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [goalCalories, setGoalCalories] = useState(DEFAULT_GOAL_CALORIES);
  const [goalProtein, setGoalProtein] = useState(0);
  const [goalCarbs, setGoalCarbs] = useState(0);
  const [goalFat, setGoalFat] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [waterMl, setWaterMl] = useState(0);
  const [waterGoalMl, setWaterGoalMl] = useState(DEFAULT_WATER_GOAL_ML);
  const [stepCount, setStepCount] = useState(0);
  const [stepGoal, setStepGoal] = useState(DEFAULT_STEP_GOAL);
  const [appleHealthConnected, setAppleHealthConnected] = useState(false);
  const [lastStepSyncedAt, setLastStepSyncedAt] = useState<string | null>(null);
  const [stepMessage, setStepMessage] = useState<string>("");
  const [isSyncingSteps, setIsSyncingSteps] = useState(false);
  const [waterModalVisible, setWaterModalVisible] = useState(false);
  const [draftWaterMl, setDraftWaterMl] = useState("100");
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);
  const [draftMealType, setDraftMealType] = useState<(typeof MEAL_TYPES)[number]>("Breakfast");
  const [draftMealGrams, setDraftMealGrams] = useState("100");

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
    dayStripRef.current?.scrollTo({ x: todayIndex * DAY_PILL_FULL_WIDTH, animated });
  }
  function clearRecenterTimer() {
    if (recenterTimeoutRef.current) { clearTimeout(recenterTimeoutRef.current); recenterTimeoutRef.current = null; }
  }
  function scheduleRecenter() {
    clearRecenterTimer();
    recenterTimeoutRef.current = setTimeout(() => centerToday(true), 5000);
  }

  async function syncSteps(date: string, shouldSync: boolean) {
    const [settings, cachedRecord] = await Promise.all([
      getStepSyncSettings(),
      getStepRecordByDate(date),
    ]);

    setAppleHealthConnected(settings.appleHealthConnected);
    setStepCount(cachedRecord?.stepCount ?? 0);
    setLastStepSyncedAt(cachedRecord?.syncedAt ?? settings.lastSyncedAt ?? null);
    setStepMessage(
      settings.appleHealthConnected
        ? cachedRecord
          ? "Apple Health"
          : "Waiting for first sync"
        : isAppleHealthSupported()
          ? "Connect Apple Health in Profile"
          : "Apple Health sync is only available on iPhone",
    );

    if (!shouldSync) {
      return;
    }

    setIsSyncingSteps(true);
    const result = await getAppleHealthStepCountForDate(date);
    setIsSyncingSteps(false);

    if (!result.success) {
      setStepMessage(result.message);
      return;
    }

    const nextRecord = {
      date,
      stepCount: result.steps,
      source: "apple_health" as const,
      syncedAt: result.syncedAt,
    };
    await saveStepRecord(nextRecord);
    await saveStepSyncSettings({
      appleHealthConnected: true,
      lastSyncedAt: result.syncedAt,
    });
    setAppleHealthConnected(true);
    setStepCount(result.steps);
    setLastStepSyncedAt(result.syncedAt);
    setStepMessage("Apple Health");
  }

  function reload(date: string = selectedDate) {
    Promise.all([
      getMealsByDate(date),
      getProfile(),
      getWaterByDate(date),
      getStepSyncSettings(),
      getStepRecordByDate(date),
    ]).then(async ([data, profile, water, stepSyncSettings, cachedStepRecord]) => {
      setMeals(data);
      setTotals(calculateTotals(data));
      setGoalCalories(profile?.goalCalories || DEFAULT_GOAL_CALORIES);
      setGoalProtein(profile?.goalProtein || 0);
      setGoalCarbs(profile?.goalCarbs || 0);
      setGoalFat(profile?.goalFat || 0);
      setWaterGoalMl(profile?.waterGoalMl || DEFAULT_WATER_GOAL_ML);
      setStepGoal(profile?.stepGoal || DEFAULT_STEP_GOAL);
      setWaterMl(water);
      setAppleHealthConnected(stepSyncSettings.appleHealthConnected);
      setStepCount(cachedStepRecord?.stepCount ?? 0);
      setLastStepSyncedAt(cachedStepRecord?.syncedAt ?? stepSyncSettings.lastSyncedAt ?? null);
      setStepMessage(
        stepSyncSettings.appleHealthConnected
          ? cachedStepRecord
            ? "Apple Health"
            : "Waiting for first sync"
          : isAppleHealthSupported()
            ? "Connect Apple Health in Profile"
            : "Apple Health sync is only available on iPhone"
      );

      if (stepSyncSettings.appleHealthConnected && isAppleHealthSupported()) {
        await syncSteps(date, true);
      }
    });
  }

  useFocusEffect(React.useCallback(() => {
    reload(selectedDate);
    scheduleRecenter();
    return () => { clearRecenterTimer(); };
  }, [selectedDate]));

  useEffect(() => {
    const timer = setTimeout(() => centerToday(false), 50);
    return () => clearTimeout(timer);
  }, [screenWidth, today]);

  async function handleDelete(id: string, name: string) {
    Alert.alert("Remove", `Remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => { await deleteMeal(id); reload(selectedDate); } },
    ]);
  }

  function openWaterModal() { setDraftWaterMl(String(waterMl)); setWaterModalVisible(true); }
  function closeWaterModal() { setWaterModalVisible(false); setDraftWaterMl(String(waterMl)); }
  function adjustDraftWater(delta: number) {
    const current = parseFloat(draftWaterMl);
    const safeCurrent = Number.isFinite(current) ? current : waterMl;
    setDraftWaterMl(String(Math.max(0, safeCurrent + delta)));
  }
  async function handleConfirmWater() {
    const parsed = parseFloat(draftWaterMl);
    const safeAmount = Number.isFinite(parsed) && parsed >= 0 ? parsed : waterMl;
    setWaterMl(safeAmount);
    await setWaterByDate(selectedDate, safeAmount);
    setWaterModalVisible(false);
  }

  function openMealEditor(entry: MealEntry) {
    setEditingMeal(entry);
    setDraftMealType(entry.mealType);
    setDraftMealGrams(String(Math.max(25, mealEntryGrams(entry))));
  }
  function closeMealEditor() { setEditingMeal(null); setDraftMealType("Breakfast"); setDraftMealGrams("100"); }
  async function handleSaveMealEdit() {
    if (!editingMeal) return;
    const parsedGrams = parseFloat(draftMealGrams);
    const validGrams = Number.isFinite(parsedGrams) && parsedGrams > 0 ? parsedGrams : mealEntryGrams(editingMeal);
    const baseServingSize = editingMeal.food.servingSize > 0 ? editingMeal.food.servingSize : 100;
    const updatedEntry: MealEntry = { ...editingMeal, mealType: draftMealType, servings: validGrams / baseServingSize, date: selectedDate };
    await updateMeal(updatedEntry);
    closeMealEditor();
    reload(selectedDate);
  }

  const remaining = goalCalories - totals.calories;
  const progress = goalCalories > 0 ? Math.min(totals.calories / goalCalories, 1) : 0;
  const waterProgress = waterGoalMl > 0 ? Math.min(waterMl / waterGoalMl, 1) : 0;
  const stepProgress = stepGoal > 0 ? Math.min(stepCount / stepGoal, 1) : 0;
  const waterLitres = (waterMl / 1000).toFixed(1);
  const waterGoalLitres = (waterGoalMl / 1000).toFixed(1);
  const formattedStepSync = lastStepSyncedAt
    ? new Date(lastStepSyncedAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Day strip */}
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
                style={[styles.dayPill, !isLast && styles.dayPillSpaced, isToday && styles.dayPillToday, isSelected && !isToday && styles.dayPillActive]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dayPillWeekday, isToday && styles.dayPillTodayText, isSelected && !isToday && styles.dayPillTextActive]}>
                  {label.weekday}
                </Text>
                <Text style={[styles.dayPillDay, isToday && styles.dayPillTodayText, isSelected && !isToday && styles.dayPillTextActive]}>
                  {label.day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.date}>{formatDate(selectedDate)}</Text>

        {/* Calories + Water cards */}
        <View style={styles.topSummaryRow}>
          {/* Calories */}
          <View style={[styles.card, styles.caloriesCard]}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Calories</Text>
              <Ionicons name="flame-outline" size={16} color={colors.primaryContainer} />
            </View>
            <Text style={styles.bigNumber}>{Math.round(totals.calories).toLocaleString()}</Text>
            <Text style={styles.sub}>/ {goalCalories.toLocaleString()} kcal</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={[styles.remaining, remaining < 0 && { color: colors.error }]}>
              {remaining > 0 ? `${Math.round(remaining)} remaining` : remaining === 0 ? "Goal reached!" : `${Math.abs(Math.round(remaining))} over goal`}
            </Text>
          </View>

          {/* Water */}
          <TouchableOpacity style={styles.waterTopCard} onPress={openWaterModal} activeOpacity={0.9}>
            <View style={[styles.waterFillOverlay, { height: `${waterProgress * 100}%` }]} />
            <View style={styles.waterCardContent}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.waterTitle}>Water</Text>
                <Ionicons name="water-outline" size={16} color={colors.waterAccent} />
              </View>
              <Text style={styles.waterAmount}>{waterLitres}</Text>
              <Text style={styles.waterUnit}>litres</Text>
              <Text style={styles.waterSub}>/ {waterGoalLitres} L goal</Text>
              <Text style={styles.waterPct}>{Math.round(waterProgress * 100)}% of goal</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, styles.stepsCard]}>
          <View style={styles.stepsHeader}>
            <View>
              <Text style={styles.cardTitle}>Steps</Text>
              <Text style={styles.stepsSourceText}>
                {stepMessage}
                {formattedStepSync && stepMessage === "Apple Health" ? ` - ${formattedStepSync}` : ""}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.stepsSyncButton,
                (!appleHealthConnected || isSyncingSteps) && styles.stepsSyncButtonDisabled,
              ]}
              onPress={() => syncSteps(selectedDate, appleHealthConnected && isAppleHealthSupported())}
              disabled={!appleHealthConnected || isSyncingSteps}
            >
              <Text style={styles.stepsSyncButtonText}>
                {isSyncingSteps ? "Syncing..." : "Sync"}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.stepsValueRow}>
            <Text style={styles.stepsBigNumber}>{stepCount.toLocaleString()}</Text>
            <Text style={styles.stepsGoalText}>/ {stepGoal.toLocaleString()} goal</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.stepsProgressFill, { width: `${stepProgress * 100}%` }]} />
          </View>
          <Text style={styles.stepsRemainingText}>
            {stepGoal <= 0
              ? "Set a step goal in Profile"
              : stepCount >= stepGoal
                ? "Step goal reached!"
                : `${(stepGoal - stepCount).toLocaleString()} steps to go`}
          </Text>
        </View>

        {/* Macros */}
        <View style={styles.macroRow}>
          {[
            { label: "PROTEIN", value: totals.protein, goal: goalProtein, color: colors.proteine },
            { label: "CARBS",   value: totals.carbs,   goal: goalCarbs,   color: colors.carbohydrates },
            { label: "FAT",     value: totals.fat,     goal: goalFat,     color: colors.fats },
          ].map((m) => {
            const macroProgress = m.goal > 0 ? Math.min(m.value / m.goal, 1) : 0;
            return (
              <View key={m.label} style={[styles.macroCard, { borderTopColor: m.color }]}>
                <Text style={[styles.macroLabel, { color: m.color }]}>{m.label}</Text>
                <Text style={styles.macroValue}>{Math.round(m.value)}<Text style={styles.macroUnit}>g</Text></Text>
                <View style={styles.macroProgressBar}>
                  <View style={[styles.macroProgressFill, { width: `${macroProgress * 100}%`, backgroundColor: m.color }]} />
                </View>
                <Text style={styles.macroGoalText}>/ {m.goal}g</Text>
              </View>
            );
          })}
        </View>

        {/* Meals header */}
        <View style={styles.mealsHeader}>
          <Text style={styles.mealsTitle}>Meals</Text>
          <Text style={styles.viewAll}>View All</Text>
        </View>

        {/* Meal cards */}
        {MEAL_TYPES.map((type) => {
          const color = MEAL_COLORS[type];
          const entries = meals.filter((m) => m.mealType === type);
          const typeCals = entries.reduce((sum, e) => sum + e.food.calories * e.servings, 0);
          return (
            <View key={type} style={[styles.card, styles.mealCard, { borderLeftColor: color }]}>
              <View style={styles.mealHeader}>
                <Text style={[styles.mealType, { color }]}>{type}</Text>
                <Text style={styles.mealCals}>
                  {entries.length === 0 ? "-- kcal" : `${Math.round(typeCals)} kcal`}
                </Text>
              </View>
              <View style={styles.mealDivider} />
              {entries.length === 0 ? (
                <TouchableOpacity style={styles.addMealBtn}>
                  <Ionicons name="add" size={14} color={colors.textDim} />
                  <Text style={styles.addMealText}>Add {type}</Text>
                </TouchableOpacity>
              ) : (
                entries.map((e) => (
                  <View key={e.id} style={styles.foodRow}>
                    <View style={[styles.foodDot, { backgroundColor: color }]} />
                    <Text style={styles.foodName}>{e.food.name.charAt(0).toUpperCase() + e.food.name.slice(1)}</Text>
                    <Text style={styles.foodCals}>{Math.round(e.food.calories * e.servings)} kcal</Text>
                    <TouchableOpacity onPress={() => openMealEditor(e)} hitSlop={8} style={styles.editIcon}>
                      <Ionicons name="create-outline" size={15} color={colors.textDim} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Water Modal */}
      <Modal visible={waterModalVisible} transparent animationType="slide" onRequestClose={closeWaterModal}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeWaterModal}>
          <View style={styles.modalSheet}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>Water Log</Text>
            <Text style={styles.modalSub}>{formatDate(selectedDate)}</Text>
            <View style={styles.waterInputWrap}>
              <TextInput style={styles.waterInput} value={draftWaterMl} onChangeText={setDraftWaterMl} keyboardType="numbers-and-punctuation" selectTextOnFocus />
              <Text style={styles.waterInputLabel}>ml logged</Text>
            </View>
            <View style={styles.adjustmentGrid}>
              {WATER_ADJUSTMENTS.map((amount) => (
                <TouchableOpacity key={amount} style={styles.adjustmentBtn} onPress={() => adjustDraftWater(amount)}>
                  <Text style={styles.adjustmentBtnText}>{amount > 0 ? `+${amount}ml` : `${amount}ml`}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmWater}>
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit meal modal */}
      <Modal visible={!!editingMeal} transparent animationType="slide" onRequestClose={closeMealEditor}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeMealEditor}>
          <View style={styles.modalSheet}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>Edit Logged Meal</Text>
            <Text style={styles.modalSub}>{editingMeal?.food.name}</Text>
            <View style={styles.waterInputWrap}>
              <TextInput style={styles.waterInput} value={draftMealGrams} onChangeText={setDraftMealGrams} keyboardType="numbers-and-punctuation" selectTextOnFocus />
              <Text style={styles.waterInputLabel}>grams</Text>
            </View>
            <View style={styles.modalMealGrid}>
              {MEAL_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.modalMealBtn, { borderColor: MEAL_COLORS[type] }, draftMealType === type && styles.modalMealBtnActive]}
                  onPress={() => setDraftMealType(type)}
                >
                  <View style={[styles.mealDot, { backgroundColor: MEAL_COLORS[type] }]} />
                  <Text style={styles.mealBtnText}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.editMacroRow}>
              {(() => {
                const grams = Math.max(0, parseFloat(draftMealGrams) || 0);
                const servingSize = editingMeal?.food.servingSize ?? 100;
                const multiplier = grams / servingSize;
                return [
                  { label: "Cal",     value: Math.round((editingMeal?.food.calories ?? 0) * multiplier),          color: colors.bar },
                  { label: "Protein", value: `${Math.round((editingMeal?.food.protein ?? 0) * multiplier)}g`,     color: colors.proteine },
                  { label: "Carbs",   value: `${Math.round((editingMeal?.food.carbs ?? 0) * multiplier)}g`,       color: colors.carbohydrates },
                  { label: "Fat",     value: `${Math.round((editingMeal?.food.fat ?? 0) * multiplier)}g`,         color: colors.fats },
                ].map((macro) => (
                  <View key={macro.label} style={[styles.editMacroPill, { borderColor: macro.color }]}>
                    <Text style={[styles.editMacroValue, { color: macro.color }]}>{macro.value}</Text>
                    <Text style={styles.editMacroLabel}>{macro.label}</Text>
                  </View>
                ));
              })()}
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveMealEdit}>
              <Text style={styles.confirmBtnText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={closeMealEditor}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: HORIZONTAL_PAGE_PADDING, paddingTop: 12, paddingBottom: 32 },

  // Day strip
  dayStrip: { paddingBottom: 14 },
  dayPill: {
    width: DAY_PILL_WIDTH,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayPillSpaced: { marginRight: DAY_PILL_GAP },
  dayPillToday: { backgroundColor: colors.secondaryContainer, borderColor: colors.todayHighlight, borderWidth: 1.5 },
  dayPillActive: { borderColor: colors.bar, borderWidth: 1.5 },
  dayPillWeekday: { color: colors.textDim, fontSize: 11, fontWeight: "600" },
  dayPillDay: { color: colors.text, fontSize: 17, fontWeight: "700", marginTop: 2 },
  dayPillTodayText: { color: colors.onTodayHighlight },
  dayPillTextActive: { color: colors.primary },

  date: { fontSize: 22, fontWeight: "700", marginBottom: 14, color: colors.text },

  // Summary row
  topSummaryRow: { flexDirection: "row", gap: 12, marginBottom: 12, alignItems: "stretch" },
  card: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  caloriesCard: { flex: 1, marginBottom: 0, borderWidth: 1, borderColor: colors.outlineVariant },
  cardTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  cardTitle: { fontSize: 13, color: colors.textDim, fontWeight: "500", letterSpacing: 0.5 },
  bigNumber: { fontSize: 48, fontWeight: "800", color: colors.text, letterSpacing: -1, lineHeight: 56 },
  sub: { color: colors.textDim, fontSize: 13, marginBottom: 10 },
  progressBar: { height: 6, backgroundColor: colors.outlineVariant, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.bar, borderRadius: 3 },
  remaining: { marginTop: 8, color: colors.primary, fontSize: 13, fontWeight: "500" },

  // Water card
  waterTopCard: {
    flex: 1,
    minHeight: 168,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    marginBottom: 0,
  },
  waterFillOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.waterFill },
  waterCardContent: { padding: 14, flex: 1, zIndex: 1 },
  waterTitle: { fontSize: 13, color: colors.textDim, fontWeight: "500", letterSpacing: 0.5 },
  waterAmount: { fontSize: 40, fontWeight: "800", color: colors.waterAccent, marginTop: 4, letterSpacing: -1 },
  waterUnit: { fontSize: 12, color: colors.waterAccent, fontWeight: "500", marginTop: -2 },
  waterSub: { color: colors.textDim, fontSize: 12, marginTop: 6 },
  waterPct: { color: colors.waterAccent, fontSize: 11, marginTop: 2, fontWeight: "600" },
  stepsCard: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: 16,
  },
  stepsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  stepsSourceText: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 3,
  },
  stepsSyncButton: {
    backgroundColor: colors.tabBackground,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  stepsSyncButtonDisabled: {
    opacity: 0.45,
  },
  stepsSyncButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  stepsValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  stepsBigNumber: {
    color: colors.text,
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 44,
  },
  stepsGoalText: {
    color: colors.textDim,
    fontSize: 14,
    paddingBottom: 4,
  },
  stepsProgressFill: {
    height: "100%",
    backgroundColor: colors.tertiary,
    borderRadius: 3,
  },
  stepsRemainingText: {
    marginTop: 8,
    color: colors.tertiary,
    fontSize: 13,
    fontWeight: "600",
  },

  // Macro row
  macroRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  macroCard: {
    flex: 1,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    padding: 12,
    borderTopWidth: 3,
  },
  macroLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8, marginBottom: 4 },
  macroValue: { fontSize: 22, fontWeight: "700", color: colors.text },
  macroUnit: { fontSize: 13, fontWeight: "400", color: colors.textDim },
  macroProgressBar: { height: 4, backgroundColor: colors.outlineVariant, borderRadius: 2, overflow: "hidden", marginTop: 8 },
  macroProgressFill: { height: "100%", borderRadius: 2 },
  macroGoalText: { fontSize: 11, color: colors.textDim, marginTop: 4 },

  // Meals section
  mealsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  mealsTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  viewAll: { fontSize: 14, color: colors.primary, fontWeight: "600" },

  mealCard: { borderLeftWidth: 4, paddingLeft: 12, marginBottom: 10 },
  mealHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  mealType: { fontSize: 16, fontWeight: "700" },
  mealCals: { color: colors.textDim, fontSize: 14 },
  mealDivider: { height: 1, backgroundColor: colors.outlineVariant, marginBottom: 8 },
  addMealBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  addMealText: { color: colors.textDim, fontSize: 14 },
  foodRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5, gap: 8 },
  foodDot: { width: 7, height: 7, borderRadius: 4 },
  foodName: { color: colors.text, flex: 1, fontSize: 14 },
  foodCals: { color: colors.textDim, fontSize: 13 },
  editIcon: { paddingLeft: 4 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: {
    backgroundColor: colors.cardSurface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 44,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant, alignSelf: "center", marginBottom: 20 },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: "700" },
  modalSub: { color: colors.textDim, fontSize: 13, marginTop: 4, marginBottom: 18 },
  waterInputWrap: { alignItems: "center", marginBottom: 20 },
  waterInput: { color: colors.text, fontSize: 36, fontWeight: "700", textAlign: "center", minWidth: 110 },
  waterInputLabel: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  adjustmentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  adjustmentBtn: { width: "31%", backgroundColor: colors.secondaryBackground, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  adjustmentBtnText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  confirmBtn: { backgroundColor: colors.primaryContainer, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  confirmBtnText: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },
  modalMealGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  modalMealBtn: {
    flexDirection: "row", alignItems: "center", gap: 8, width: "47%",
    borderWidth: 1.5, borderRadius: 12, padding: 14, backgroundColor: colors.secondaryBackground,
  },
  modalMealBtnActive: { backgroundColor: colors.background },
  mealDot: { width: 10, height: 10, borderRadius: 5 },
  mealBtnText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  editMacroRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  editMacroPill: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  editMacroValue: { fontSize: 14, fontWeight: "700" },
  editMacroLabel: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  cancelBtn: { alignItems: "center", paddingTop: 14 },
  cancelBtnText: { color: colors.textDim, fontSize: 15 },
});
