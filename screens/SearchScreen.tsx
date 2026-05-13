import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Keyboard,
  Animated,
} from "react-native";
import { searchFoods } from "../utils/api";
import { addMeal } from "../utils/storage";
import { generateId, todayISO } from "../utils/nutrition";
import { Food, MealEntry } from "../types";
import { useTheme } from "../style/ThemeContext";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;

export default function SearchScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const MEAL_COLORS: Record<string, string> = useMemo(() => ({
    Breakfast: colors.mealBreakfast,
    Lunch: colors.mealLunch,
    Dinner: colors.mealDinner,
    Snacks: colors.mealSnacks,
  }), [colors]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState("100");

  // Animation refs for search results
  const resultAnims = useRef<{ opacity: Animated.Value; translateY: Animated.Value }[]>([]).current;
  const resultScales = useRef<Animated.Value[]>([]).current;
  const visibleResults = useMemo(() => results.slice(0, 5), [results]);

  async function handleSearch() {
    if (!query.trim()) return;
    Keyboard.dismiss();
    setLoading(true);
    try {
      const foods = await searchFoods(query);
      resultAnims.length = 0;
      resultScales.length = 0;
      foods.slice(0, 5).forEach(() => {
        resultAnims.push({ opacity: new Animated.Value(0), translateY: new Animated.Value(15) });
        resultScales.push(new Animated.Value(1));
      });
      setResults(foods);
      setTimeout(() => {
        Animated.stagger(
          70,
          resultAnims.map((anim) =>
            Animated.parallel([
              Animated.timing(anim.opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
              Animated.spring(anim.translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 150 }),
            ])
          )
        ).start();
      }, 0);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not fetch results.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLog(mealType: (typeof MEAL_TYPES)[number]) {
    if (!selectedFood) return;
    const parsedGrams = parseFloat(grams);
    const validGrams = isNaN(parsedGrams) || parsedGrams <= 0 ? 100 : parsedGrams;
    const baseServingSize = selectedFood.servingSize > 0 ? selectedFood.servingSize : 100;
    const servingMultiplier = validGrams / baseServingSize;
    const entry: MealEntry = {
      id: generateId(),
      food: selectedFood,
      mealType,
      servings: servingMultiplier,
      date: todayISO(),
      loggedAt: new Date().toISOString(),
    };
    await addMeal(entry);
    const name = selectedFood.name;
    setSelectedFood(null);
    setGrams("100");
    Alert.alert("Logged!", `${name} added to ${mealType}`);
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search foods..."
          placeholderTextColor={colors.textDim}
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
        <ActivityIndicator style={{ marginTop: 20 }} color={colors.platinum} />
      )}

      <FlatList
        data={visibleResults}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => {
          const anim = resultAnims[index] ?? { opacity: new Animated.Value(1), translateY: new Animated.Value(0) };
          const scale = resultScales[index] ?? new Animated.Value(1);
          return (
            <TouchableOpacity
              activeOpacity={1}
              onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
              onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 200 }).start()}
              onPress={() => { setSelectedFood(item); setGrams("100"); }}
            >
              <Animated.View style={[styles.resultCard, { opacity: anim.opacity, transform: [{ translateY: anim.translateY }, { scale }] }]}>
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
              </Animated.View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.hint}>Search for a food to get started</Text>
          ) : null
        }
      />

      <Modal
        visible={!!selectedFood}
        transparent
        animationType="slide"
        onRequestClose={() => { setSelectedFood(null); setGrams("100"); }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setSelectedFood(null); setGrams("100"); }}
        >
          <View style={styles.modalSheet}>
            <View style={styles.handle} />

            <Text style={styles.modalTitle}>
              {selectedFood?.name.charAt(0).toUpperCase()}{selectedFood?.name.slice(1)}
            </Text>

            {/* Servings picker */}
            <View style={styles.servingsRow}>
              <TouchableOpacity
                style={styles.servingsBtn}
                onPress={() => {
                  const v = Math.max(25, (parseFloat(grams) || 100) - 25);
                  setGrams(String(v));
                }}
              >
                <Text style={styles.servingsBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.servingsInputWrap}>
                <TextInput
                  style={styles.servingsInput}
                  value={grams}
                  onChangeText={setGrams}
                  keyboardType="numbers-and-punctuation"
                  selectTextOnFocus
                />
                <Text style={styles.servingsLabel}>
                  grams
                </Text>
              </View>
              <TouchableOpacity
                style={styles.servingsBtn}
                onPress={() => {
                  const v = (parseFloat(grams) || 100) + 25;
                  setGrams(String(v));
                }}
              >
                <Text style={styles.servingsBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Live macros */}
            <View style={styles.macroRow}>
              {(() => {
                const enteredGrams = Math.max(0, parseFloat(grams) || 0);
                const baseServingSize = (selectedFood?.servingSize ?? 0) > 0 ? (selectedFood?.servingSize ?? 100) : 100;
                const s = enteredGrams / baseServingSize;
                return [
                  { label: "Cal",     value: Math.round((selectedFood?.calories ?? 0) * s),  color: colors.bar },
                  { label: "Protein", value: `${Math.round((selectedFood?.protein ?? 0) * s)}g`, color: colors.proteine },
                  { label: "Carbs",   value: `${Math.round((selectedFood?.carbs ?? 0) * s)}g`,   color: colors.carbohydrates },
                  { label: "Fat",     value: `${Math.round((selectedFood?.fat ?? 0) * s)}g`,     color: colors.fats },
                ].map((m) => (
                  <View key={m.label} style={[styles.macroPill, { borderColor: m.color }]}>
                    <Text style={[styles.macroPillVal, { color: m.color }]}>{m.value}</Text>
                    <Text style={styles.macroPillLabel}>{m.label}</Text>
                  </View>
                ));
              })()}
            </View>

            <Text style={styles.modalSub}>Add to which meal?</Text>
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

            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setSelectedFood(null); setGrams("100"); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  input: {
    flex: 1,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.white,
    elevation: 2,
  },
  searchBtn: {
    backgroundColor: colors.rosyGranite,
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  searchBtnText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  resultCard: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    elevation: 1,
  },
  resultLeft: { flex: 1 },
  resultRight: { alignItems: "flex-end", justifyContent: "center" },
  foodName: { fontSize: 15, fontWeight: "600", color: colors.white },
  brand: { fontSize: 12, color: colors.textDim, marginTop: 2 },
  serving: { fontSize: 12, color: colors.textDim, marginTop: 2 },
  calories: { fontSize: 22, fontWeight: "bold", color: colors.primary },
  kcal: { fontSize: 12, color: colors.textDim },
  hint: { textAlign: "center", color: colors.textDim, marginTop: 40, fontSize: 15 },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    backgroundColor: colors.secondaryBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 44,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.rosyGranite,
    alignSelf: "center", marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20, fontWeight: "700", color: colors.white, marginBottom: 14,
  },
  macroRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  macroPill: {
    flex: 1, borderWidth: 1.5, borderRadius: 10,
    paddingVertical: 8, alignItems: "center",
  },
  macroPillVal: { fontSize: 15, fontWeight: "700" },
  macroPillLabel: { fontSize: 11, color: colors.textDim, marginTop: 2 },
  servingsRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 16, marginBottom: 20,
  },
  servingsBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.tabBackground,
    alignItems: "center", justifyContent: "center",
  },
  servingsBtnText: { color: colors.white, fontSize: 22, fontWeight: "300", lineHeight: 26 },
  servingsInputWrap: { alignItems: "center" },
  servingsInput: {
    color: colors.white, fontSize: 28, fontWeight: "700",
    textAlign: "center", minWidth: 60,
  },
  servingsLabel: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  modalSub: { fontSize: 13, color: colors.textDim, marginBottom: 12 },
  mealGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  mealBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    width: "47%", borderWidth: 1.5, borderRadius: 12,
    padding: 14,
  },
  mealDot: { width: 10, height: 10, borderRadius: 5 },
  mealBtnText: { color: colors.white, fontSize: 15, fontWeight: "600" },
  cancelBtn: { alignItems: "center", paddingTop: 4 },
  cancelText: { color: colors.textDim, fontSize: 15 },
});
