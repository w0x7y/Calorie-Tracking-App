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
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { MealEntry, ProfileSnapshot, UserProfile } from "../types";
import {
  addMeal,
  deleteProfileSnapshot,
  getFoodHistory,
  getProfileHistory,
  getProfile,
  saveProfile,
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

// --- Mini chart component ---

type ChartPoint = { label: string; value: number };

function MiniLineChart({
  data,
  color,
  unit,
  width,
}: {
  data: ChartPoint[];
  color: string;
  unit: string;
  width: number;
}) {
  if (data.length < 2) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 12 }}>
        <Text style={{ color: Colors.textDim, fontSize: 13 }}>
          Log at least 2 profile saves to see the chart.
        </Text>
      </View>
    );
  }

  const CHART_HEIGHT = 90;
  const LABEL_HEIGHT = 22;
  const PADDING_H = 24;
  const plotWidth = width - PADDING_H * 2;
  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  // Convert value → y position (top = high value)
  function toY(val: number) {
    return CHART_HEIGHT - ((val - minVal) / range) * CHART_HEIGHT;
  }

  // Convert index → x position
  function toX(index: number) {
    return PADDING_H + (index / (data.length - 1)) * plotWidth;
  }

  const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < data.length - 1; i++) {
    segments.push({
      x1: toX(i),
      y1: toY(data[i].value),
      x2: toX(i + 1),
      y2: toY(data[i + 1].value),
    });
  }

  return (
    <View style={{ width }}>
      {/* Chart area */}
      <View style={{ height: CHART_HEIGHT, position: "relative" }}>
        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((pct) => (
          <View
            key={pct}
            style={{
              position: "absolute",
              left: PADDING_H,
              right: PADDING_H,
              top: pct * CHART_HEIGHT,
              height: 1,
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
          />
        ))}

        {/* Line segments rendered as thin rotated views */}
        {segments.map((seg, i) => {
          const dx = seg.x2 - seg.x1;
          const dy = seg.y2 - seg.y1;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <View
              key={i}
              style={{
                position: "absolute",
                left: seg.x1,
                top: seg.y1,
                width: length,
                height: 2,
                backgroundColor: color,
                borderRadius: 1,
                transformOrigin: "0 50%",
                transform: [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}

        {/* Dots + value labels */}
        {data.map((point, i) => {
          const x = toX(i);
          const y = toY(point.value);
          const isFirst = i === 0;
          const isLast = i === data.length - 1;
          const showLabel = isFirst || isLast || data.length <= 5;
          return (
            <View
              key={i}
              style={{ position: "absolute", left: x - 4, top: y - 4 }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: color,
                  borderWidth: 2,
                  borderColor: Colors.secondaryBackground,
                }}
              />
              {showLabel && (
                <Text
                  style={{
                    position: "absolute",
                    top: -18,
                    left: -16,
                    width: 40,
                    textAlign: "center",
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: "700",
                  }}
                >
                  {point.value}
                  {unit}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* X-axis labels */}
      <View style={{ height: LABEL_HEIGHT, position: "relative" }}>
        {data.map((point, i) => {
          const x = toX(i);
          const isFirst = i === 0;
          const isLast = i === data.length - 1;
          const showLabel = isFirst || isLast || data.length <= 4;
          if (!showLabel) return null;
          return (
            <Text
              key={i}
              style={{
                position: "absolute",
                left: x - 20,
                width: 40,
                textAlign: "center",
                color: Colors.textDim,
                fontSize: 9,
                top: 4,
              }}
            >
              {point.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const [foodHistory, setFoodHistory] = useState<MealEntry[]>([]);
  const [profileHistory, setProfileHistory] = useState<ProfileSnapshot[]>([]);
  const [selectedHistoryEntry, setSelectedHistoryEntry] =
    useState<MealEntry | null>(null);
  const [grams, setGrams] = useState("100");
  const [chartMetric, setChartMetric] = useState<"weight" | "height">("weight");
  const [metricsExpanded, setMetricsExpanded] = useState(true);
  const [foodsExpanded, setFoodsExpanded] = useState(true);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logWeight, setLogWeight] = useState("");
  const [logHeight, setLogHeight] = useState("");
  const { width: screenWidth } = useWindowDimensions();

  function toggleMetricsExpanded() {
    setMetricsExpanded((prev) => !prev);
  }

  function toggleFoodsExpanded() {
    setFoodsExpanded((prev) => !prev);
  }

  async function handleLogMetrics() {
    const weight = parseFloat(logWeight);
    const height = parseFloat(logHeight);

    if (!Number.isFinite(weight) || weight <= 0) {
      Alert.alert("Invalid", "Please enter a valid weight.");
      return;
    }

    if (!Number.isFinite(height) || height <= 0) {
      Alert.alert("Invalid", "Please enter a valid height.");
      return;
    }

    const profile = await getProfile();
    if (!profile) {
      Alert.alert(
        "Error",
        "Profile not found. Please set up your profile first.",
      );
      return;
    }

    const updatedProfile: UserProfile = {
      ...profile,
      weightKg: weight,
      heightCm: height,
    };

    await saveProfile(updatedProfile);
    Alert.alert("Logged", `Weight: ${weight}kg, Height: ${height}cm`);
    setLogModalVisible(false);
    setLogWeight("");
    setLogHeight("");
    reload();
  }

  function reload() {
    Promise.all([getFoodHistory(), getProfileHistory()]).then(
      ([mealData, historyData]) => {
        setFoodHistory(mealData);
        setProfileHistory(historyData);
      },
    );
  }

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      Promise.all([getFoodHistory(), getProfileHistory()]).then(
        ([mealData, historyData]) => {
          if (!active) return;
          setFoodHistory(mealData);
          setProfileHistory(historyData);
        },
      );

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
    const validGrams =
      Number.isFinite(parsedGrams) && parsedGrams > 0 ? parsedGrams : 100;
    const servingMultiplier =
      validGrams / selectedHistoryEntry.food.servingSize;

    const entry: MealEntry = {
      id: generateId(),
      food: selectedHistoryEntry.food,
      mealType,
      servings: servingMultiplier,
      date: todayISO(),
      loggedAt: new Date().toISOString(),
    };

    await addMeal(entry);
    Alert.alert(
      "Logged",
      `${selectedHistoryEntry.food.name} added to ${mealType}.`,
    );
    setSelectedHistoryEntry(null);
    setGrams("100");
    reload();
  }

  const recentMeals = useMemo(() => {
    const sorted = [...foodHistory]
      .sort(
        (a, b) =>
          new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
      )
      .slice(0, 20);

    // Remove duplicates by food name, keeping only the most recent
    const seen = new Set<string>();
    return sorted.filter((entry) => {
      const foodKey = entry.food.name;
      if (seen.has(foodKey)) {
        return false;
      }
      seen.add(foodKey);
      return true;
    });
  }, [foodHistory]);

  const bodyTimeline = useMemo(
    () =>
      [...profileHistory]
        .sort(
          (a, b) =>
            new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
        )
        .slice(0, 12),
    [profileHistory],
  );

  // Chronological order for chart (oldest → newest)
  const chartData = useMemo(() => {
    const sorted = [...profileHistory].sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );
    return sorted.map((s) => ({
      label: new Date(s.recordedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value: chartMetric === "weight" ? s.weightKg : s.heightCm,
    }));
  }, [profileHistory, chartMetric]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Weight & Height Over Time</Text>
              <Text style={styles.sectionSub}>
                Saved from your profile updates
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => setLogModalVisible(true)}
                hitSlop={8}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color={Colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleMetricsExpanded} hitSlop={8}>
                <Ionicons
                  name={metricsExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {profileHistory.length === 0 ? (
            <Text style={styles.emptyText}>
              Save your profile to start tracking body stats over time.
            </Text>
          ) : (
            <>
              {/* Metric toggle */}
              <View style={styles.chartToggleRow}>
                {(["weight", "height"] as const).map((metric) => (
                  <TouchableOpacity
                    key={metric}
                    style={[
                      styles.chartToggleBtn,
                      chartMetric === metric && styles.chartToggleBtnActive,
                    ]}
                    onPress={() => setChartMetric(metric)}
                  >
                    <Text
                      style={[
                        styles.chartToggleText,
                        chartMetric === metric && styles.chartToggleTextActive,
                      ]}
                    >
                      {metric === "weight" ? "Weight (kg)" : "Height (cm)"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Chart */}
              <View style={styles.chartContainer}>
                <MiniLineChart
                  data={chartData}
                  color={
                    chartMetric === "weight" ? Colors.bar : Colors.proteine
                  }
                  unit={chartMetric === "weight" ? "kg" : "cm"}
                  width={screenWidth - 32 - 32 - 16}
                />
              </View>

              {/* History rows */}
              {metricsExpanded && (
                <>
                  {bodyTimeline.map((snapshot) => (
                    <View key={snapshot.id} style={styles.timelineRow}>
                      <View style={styles.timelineDot} />
                      <View style={styles.timelineContent}>
                        <View style={styles.timelineHeader}>
                          <Text style={styles.timelineDate}>
                            {formatDateTime(snapshot.recordedAt)}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleDeleteSnapshot(snapshot)}
                            hitSlop={8}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={16}
                              color={Colors.textDim}
                            />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.metricRow}>
                          <View style={styles.metricCard}>
                            <Text style={styles.metricValue}>
                              {snapshot.weightKg}
                            </Text>
                            <Text style={styles.metricLabel}>kg</Text>
                          </View>
                          <View style={styles.metricCard}>
                            <Text style={styles.metricValue}>
                              {snapshot.heightCm}
                            </Text>
                            <Text style={styles.metricLabel}>cm</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent Foods</Text>
              <Text style={styles.sectionSub}>
                Last 20 foods you logged, even if later removed from meals
              </Text>
            </View>
            <TouchableOpacity onPress={toggleFoodsExpanded} hitSlop={8}>
              <Ionicons
                name={foodsExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={Colors.primary}
              />
            </TouchableOpacity>
          </View>

          {recentMeals.length === 0 ? (
            <Text style={styles.emptyText}>No foods logged yet.</Text>
          ) : (
            foodsExpanded && (
              <>
                {recentMeals.map((entry) => (
                  <View
                    key={`${entry.id}-${entry.loggedAt}`}
                    style={styles.historyRow}
                  >
                    <View style={styles.historyMain}>
                      <Text style={styles.foodName}>
                        {entry.food.name.charAt(0).toUpperCase() +
                          entry.food.name.slice(1)}
                      </Text>
                      <Text style={styles.historyMeta}>
                        {entry.mealType} • {mealAmountLabel(entry)} •{" "}
                        {formatDateTime(entry.loggedAt)}
                      </Text>
                    </View>
                    <Text style={styles.calories}>
                      {Math.round(entry.food.calories * entry.servings)} kcal
                    </Text>
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => {
                        setSelectedHistoryEntry(entry);
                        setGrams(
                          String(
                            Math.max(
                              25,
                              Math.round(
                                entry.food.servingSize * entry.servings,
                              ),
                            ),
                          ),
                        );
                      }}
                      hitSlop={8}
                    >
                      <Ionicons name="add" size={16} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )
          )}
        </View>
      </ScrollView>

      <Modal
        visible={logModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setLogModalVisible(false);
          setLogWeight("");
          setLogHeight("");
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setLogModalVisible(false);
            setLogWeight("");
            setLogHeight("");
          }}
        >
          <View style={styles.logModalSheet}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>Log Weight & Height</Text>
            <Text style={styles.modalSub}>Track your body measurements</Text>

            <View style={styles.logInputGroup}>
              <View style={styles.logInputWrapper}>
                <Text style={styles.logLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.logInput}
                  placeholder="Enter weight"
                  placeholderTextColor={Colors.textDim}
                  keyboardType="numbers-and-punctuation"
                  value={logWeight}
                  onChangeText={setLogWeight}
                />
              </View>

              <View style={styles.logInputWrapper}>
                <Text style={styles.logLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.logInput}
                  placeholder="Enter height"
                  placeholderTextColor={Colors.textDim}
                  keyboardType="numbers-and-punctuation"
                  value={logHeight}
                  onChangeText={setLogHeight}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleLogMetrics}>
              <Text style={styles.saveBtnText}>Save Metrics</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
            <Text style={styles.modalTitle}>
              {selectedHistoryEntry?.food.name}
            </Text>
            <Text style={styles.modalSub}>
              {selectedHistoryEntry
                ? `${Math.round(selectedHistoryEntry.food.calories)} kcal / 100g`
                : ""}
            </Text>

            <View style={styles.gramsRow}>
              <TouchableOpacity
                style={styles.gramsBtn}
                onPress={() =>
                  setGrams(
                    String(Math.max(25, (parseFloat(grams) || 100) - 25)),
                  )
                }
              >
                <Text style={styles.gramsBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.gramsInputWrap}>
                <TextInput
                  style={styles.gramsInput}
                  value={grams}
                  onChangeText={setGrams}
                  keyboardType="numbers-and-punctuation"
                  selectTextOnFocus
                />
                <Text style={styles.gramsLabel}>grams</Text>
              </View>
              <TouchableOpacity
                style={styles.gramsBtn}
                onPress={() =>
                  setGrams(String((parseFloat(grams) || 100) + 25))
                }
              >
                <Text style={styles.gramsBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.macroRow}>
              {(() => {
                const enteredGrams = Math.max(0, parseFloat(grams) || 0);
                const s =
                  enteredGrams /
                  (selectedHistoryEntry?.food.servingSize ?? 100);
                return [
                  {
                    label: "Cal",
                    value: Math.round(
                      (selectedHistoryEntry?.food.calories ?? 0) * s,
                    ),
                    color: Colors.bar,
                  },
                  {
                    label: "Protein",
                    value: `${Math.round((selectedHistoryEntry?.food.protein ?? 0) * s)}g`,
                    color: Colors.proteine,
                  },
                  {
                    label: "Carbs",
                    value: `${Math.round((selectedHistoryEntry?.food.carbs ?? 0) * s)}g`,
                    color: Colors.carbohydrates,
                  },
                  {
                    label: "Fat",
                    value: `${Math.round((selectedHistoryEntry?.food.fat ?? 0) * s)}g`,
                    color: Colors.fats,
                  },
                ].map((macro) => (
                  <View
                    key={macro.label}
                    style={[styles.macroPill, { borderColor: macro.color }]}
                  >
                    <Text style={[styles.macroValue, { color: macro.color }]}>
                      {macro.value}
                    </Text>
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
                  <View
                    style={[
                      styles.mealDot,
                      { backgroundColor: MEAL_COLORS[type] },
                    ]}
                  />
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
  section: {
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: { color: Colors.white, fontSize: 18, fontWeight: "700" },
  sectionSub: {
    color: Colors.textDim,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
  },
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
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
  chartToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  chartToggleBtn: {
    flex: 1,
    backgroundColor: Colors.tabBackground,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  chartToggleBtnActive: {
    borderColor: Colors.bar,
  },
  chartToggleText: {
    color: Colors.textDim,
    fontSize: 13,
    fontWeight: "600",
  },
  chartToggleTextActive: {
    color: Colors.white,
  },
  chartContainer: {
    backgroundColor: Colors.tabBackground,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 0,
    marginBottom: 16,
    overflow: "hidden",
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
  modalSub: {
    color: Colors.textDim,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  gramsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 20,
  },
  gramsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.tabBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  gramsBtnText: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: "300",
    lineHeight: 26,
  },
  gramsInputWrap: { alignItems: "center" },
  gramsInput: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    minWidth: 60,
  },
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
  logModalSheet: {
    backgroundColor: Colors.secondaryBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  logInputGroup: { gap: 16, marginBottom: 20 },
  logInputWrapper: { gap: 8 },
  logLabel: { color: Colors.white, fontSize: 14, fontWeight: "600" },
  logInput: {
    backgroundColor: Colors.tabBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: Colors.white,
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { color: Colors.secondaryBackground, fontSize: 16, fontWeight: "700" },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
