import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { calculateBMR } from "../utils/nutrition";
import { connectAppleHealth, isAppleHealthSupported } from "../utils/health";
import { getProfile, getStepSyncSettings, saveProfile, saveStepSyncSettings } from "../utils/storage";
import { UserProfile, ThemeType } from "../types";
import { useTheme } from "../style/ThemeContext";
import { Themes } from "../style/themes";

const ACTIVITY_OPTIONS = [
  { key: "sedentary", label: "Sedentary", hint: "Mostly sitting", multiplier: 1.2 },
  { key: "light", label: "Light", hint: "A few active days", multiplier: 1.375 },
  { key: "moderate", label: "Moderate", hint: "Regular movement", multiplier: 1.55 },
  { key: "active", label: "Active", hint: "Training often", multiplier: 1.725 },
  { key: "very_active", label: "Very active", hint: "Hard training + active days", multiplier: 1.9 },
] as const;

type ActivityLevel = (typeof ACTIVITY_OPTIONS)[number]["key"];
type Gender = UserProfile["gender"];

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  age: 25,
  weightKg: 70,
  heightCm: 175,
  gender: "male",
  activityLevel: "moderate",
  goalCalories: 2500,
  goalProtein: 140,
  goalCarbs: 280,
  goalFat: 70,
  waterGoalMl: 2000,
  stepGoal: 8000,
};

function parseNumber(value: string, fallback: number): number {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function macroTargetsFromCalories(calories: number, weightKg: number) {
  const protein = Math.round(Math.max(weightKg * 1.8, calories * 0.25 / 4));
  const fat = Math.round(calories * 0.25 / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  return {
    goalProtein: Math.max(0, protein),
    goalCarbs: Math.max(0, carbs),
    goalFat: Math.max(0, fat),
  };
}

export default function ProfileScreen() {
  const { colors, theme, setTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState(DEFAULT_PROFILE.name);
  const [age, setAge] = useState(String(DEFAULT_PROFILE.age));
  const [weightKg, setWeightKg] = useState(String(DEFAULT_PROFILE.weightKg));
  const [heightCm, setHeightCm] = useState(String(DEFAULT_PROFILE.heightCm));
  const [gender, setGender] = useState<Gender>(DEFAULT_PROFILE.gender);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(DEFAULT_PROFILE.activityLevel);
  const [goalCalories, setGoalCalories] = useState(String(DEFAULT_PROFILE.goalCalories));
  const [goalProtein, setGoalProtein] = useState(String(DEFAULT_PROFILE.goalProtein));
  const [goalCarbs, setGoalCarbs] = useState(String(DEFAULT_PROFILE.goalCarbs));
  const [goalFat, setGoalFat] = useState(String(DEFAULT_PROFILE.goalFat));
  const [waterGoalMl, setWaterGoalMl] = useState(String(DEFAULT_PROFILE.waterGoalMl));
  const [stepGoal, setStepGoal] = useState(String(DEFAULT_PROFILE.stepGoal));
  const [appleHealthConnected, setAppleHealthConnected] = useState(false);
  const [lastStepSyncedAt, setLastStepSyncedAt] = useState<string | null>(null);
  const [isConnectingAppleHealth, setIsConnectingAppleHealth] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      Promise.all([getProfile(), getStepSyncSettings()]).then(([profile, stepSyncSettings]) => {
        if (!active) return;

        if (profile) {
          setName(profile.name ?? DEFAULT_PROFILE.name);
          setAge(String(profile.age ?? DEFAULT_PROFILE.age));
          setWeightKg(String(profile.weightKg ?? DEFAULT_PROFILE.weightKg));
          setHeightCm(String(profile.heightCm ?? DEFAULT_PROFILE.heightCm));
          setGender(profile.gender ?? DEFAULT_PROFILE.gender);
          setActivityLevel(profile.activityLevel ?? DEFAULT_PROFILE.activityLevel);
          setGoalCalories(String(profile.goalCalories ?? DEFAULT_PROFILE.goalCalories));
          setGoalProtein(String(profile.goalProtein ?? DEFAULT_PROFILE.goalProtein));
          setGoalCarbs(String(profile.goalCarbs ?? DEFAULT_PROFILE.goalCarbs));
          setGoalFat(String(profile.goalFat ?? DEFAULT_PROFILE.goalFat));
          setWaterGoalMl(String(profile.waterGoalMl ?? DEFAULT_PROFILE.waterGoalMl));
          setStepGoal(String(profile.stepGoal ?? DEFAULT_PROFILE.stepGoal));
        }

        setAppleHealthConnected(stepSyncSettings.appleHealthConnected);
        setLastStepSyncedAt(stepSyncSettings.lastSyncedAt ?? null);
      });

      return () => {
        active = false;
      };
    }, []),
  );

  const stats = useMemo(() => {
    const parsedAge = parseNumber(age, DEFAULT_PROFILE.age);
    const parsedWeight = parseNumber(weightKg, DEFAULT_PROFILE.weightKg);
    const parsedHeight = parseNumber(heightCm, DEFAULT_PROFILE.heightCm);
    const activityMultiplier =
      ACTIVITY_OPTIONS.find((option) => option.key === activityLevel)?.multiplier ?? 1.55;

    const bmr = calculateBMR(
      {
        ...DEFAULT_PROFILE,
        age: parsedAge,
        weightKg: parsedWeight,
        heightCm: parsedHeight,
      },
      gender,
    );
    const maintenanceCalories = Math.round(bmr * activityMultiplier);
    const bmi = parsedWeight / Math.pow(parsedHeight / 100, 2);

    return {
      bmr: Math.round(bmr),
      maintenanceCalories,
      bmi: Number.isFinite(bmi) ? bmi.toFixed(1) : "--",
      recommendedMacros: macroTargetsFromCalories(maintenanceCalories, parsedWeight),
    };
  }, [activityLevel, age, gender, heightCm, weightKg]);

  async function handleSave() {
    const parsedAge = parseNumber(age, DEFAULT_PROFILE.age);
    const parsedWeight = parseNumber(weightKg, DEFAULT_PROFILE.weightKg);
    const parsedHeight = parseNumber(heightCm, DEFAULT_PROFILE.heightCm);
    const parsedGoalCalories = parseNumber(goalCalories, stats.maintenanceCalories);
    const parsedGoalProtein = parseNumber(goalProtein, stats.recommendedMacros.goalProtein);
    const parsedGoalCarbs = parseNumber(goalCarbs, stats.recommendedMacros.goalCarbs);
    const parsedGoalFat = parseNumber(goalFat, stats.recommendedMacros.goalFat);
    const parsedWaterGoalMl = parseNumber(waterGoalMl, DEFAULT_PROFILE.waterGoalMl);
    const parsedStepGoal = parseNumber(stepGoal, DEFAULT_PROFILE.stepGoal);

    const profile: UserProfile = {
      name: name.trim(),
      age: parsedAge,
      weightKg: parsedWeight,
      heightCm: parsedHeight,
      gender,
      activityLevel,
      goalCalories: parsedGoalCalories,
      goalProtein: parsedGoalProtein,
      goalCarbs: parsedGoalCarbs,
      goalFat: parsedGoalFat,
      waterGoalMl: parsedWaterGoalMl,
      stepGoal: parsedStepGoal,
    };

    await saveProfile(profile);
    Alert.alert("Saved", "Your profile and daily goals were updated.");
  }

  async function handleConnectAppleHealth() {
    if (!isAppleHealthSupported()) {
      Alert.alert(
        "Apple Health",
        Platform.OS === "ios"
          ? "Apple Health requires a native iPhone build. Expo Go cannot access HealthKit."
          : "Apple Health step sync is only available on iPhone.",
      );
      return;
    }

    setIsConnectingAppleHealth(true);
    const result = await connectAppleHealth();
    setIsConnectingAppleHealth(false);

    if (!result.connected) {
      Alert.alert("Apple Health", result.message);
      return;
    }

    await saveStepSyncSettings({
      appleHealthConnected: true,
    });
    setAppleHealthConnected(true);
    Alert.alert("Connected", "Apple Health step access is enabled.");
  }

  const appleHealthStatusText = appleHealthConnected
    ? `Connected${lastStepSyncedAt ? ` - last sync ${new Date(lastStepSyncedAt).toLocaleString()}` : ""}`
    : "Not connected";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basics</Text>
        <Text style={styles.sectionText}>Only the details needed to calculate a useful daily target.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.textDim}
          />
        </View>

        <View style={styles.twoColRow}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              keyboardType="numbers-and-punctuation"
              placeholder="25"
              placeholderTextColor={colors.textDim}
            />
          </View>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.segmentedControl}>
              {(["male", "female"] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.segment, gender === option && styles.segmentActive]}
                  onPress={() => setGender(option)}
                >
                  <Text style={[styles.segmentText, gender === option && styles.segmentTextActive]}>
                    {option === "male" ? "Male" : "Female"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.twoColRow}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="numbers-and-punctuation"
              placeholder="70"
              placeholderTextColor={colors.textDim}
            />
          </View>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={heightCm}
              onChangeText={setHeightCm}
              keyboardType="numbers-and-punctuation"
              placeholder="175"
              placeholderTextColor={colors.textDim}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Activity level</Text>
          <View style={styles.activityList}>
            {ACTIVITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.activityCard, activityLevel === option.key && styles.activityCardActive]}
                onPress={() => setActivityLevel(option.key)}
              >
                <View style={styles.activityCopy}>
                  <Text style={[styles.activityTitle, activityLevel === option.key && styles.activityTitleActive]}>
                    {option.label}
                  </Text>
                  <Text style={styles.activityHint}>{option.hint}</Text>
                </View>
                <View style={[styles.radio, activityLevel === option.key && styles.radioActive]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Goals</Text>
        <Text style={styles.sectionText}>Set your daily targets. The recommended values are calculated from your profile above.</Text>

        {/* Recommended banner */}
        <View style={styles.recommendedCard}>
          <Text style={styles.recommendedEyebrow}>Calculated for you</Text>
          <View style={styles.recommendedCalRow}>
            <Text style={styles.recommendedCalValue}>{stats.maintenanceCalories}</Text>
            <Text style={styles.recommendedCalUnit}>kcal / day</Text>
          </View>
          <View style={styles.recommendedMacroRow}>
            <View style={styles.recommendedMacroItem}>
              <Text style={[styles.recommendedMacroValue, { color: colors.proteine }]}>{stats.recommendedMacros.goalProtein}g</Text>
              <Text style={styles.recommendedMacroLabel}>Protein</Text>
            </View>
            <View style={styles.recommendedMacroDivider} />
            <View style={styles.recommendedMacroItem}>
              <Text style={[styles.recommendedMacroValue, { color: colors.carbohydrates }]}>{stats.recommendedMacros.goalCarbs}g</Text>
              <Text style={styles.recommendedMacroLabel}>Carbs</Text>
            </View>
            <View style={styles.recommendedMacroDivider} />
            <View style={styles.recommendedMacroItem}>
              <Text style={[styles.recommendedMacroValue, { color: colors.fats }]}>{stats.recommendedMacros.goalFat}g</Text>
              <Text style={styles.recommendedMacroLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* Calories + Water row */}
        <View style={styles.twoColRow}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Daily calories</Text>
            <TextInput
              style={styles.input}
              value={goalCalories}
              onChangeText={setGoalCalories}
              keyboardType="numbers-and-punctuation"
              placeholder={String(stats.maintenanceCalories)}
              placeholderTextColor={colors.textDim}
            />
          </View>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Water (ml)</Text>
            <TextInput
              style={styles.input}
              value={waterGoalMl}
              onChangeText={setWaterGoalMl}
              keyboardType="numbers-and-punctuation"
              placeholder={String(DEFAULT_PROFILE.waterGoalMl)}
              placeholderTextColor={colors.textDim}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Daily step goal</Text>
          <TextInput
            style={styles.input}
            value={stepGoal}
            onChangeText={setStepGoal}
            keyboardType="numbers-and-punctuation"
            placeholder={String(DEFAULT_PROFILE.stepGoal)}
            placeholderTextColor={colors.textDim}
          />
        </View>

        {/* Macros */}
        <Text style={styles.macrosSectionLabel}>Macros</Text>
        <View style={styles.macrosRow}>
          <View style={styles.macroInputCard}>
            <View style={[styles.macroColorBar, { backgroundColor: colors.proteine }]} />
            <Text style={styles.macroInputLabel}>Protein</Text>
            <TextInput
              style={styles.macroInput}
              value={goalProtein}
              onChangeText={setGoalProtein}
              keyboardType="numbers-and-punctuation"
              placeholder={String(stats.recommendedMacros.goalProtein)}
              placeholderTextColor={colors.textDim}
            />
            <Text style={styles.macroInputUnit}>g</Text>
          </View>
          <View style={styles.macroInputCard}>
            <View style={[styles.macroColorBar, { backgroundColor: colors.carbohydrates }]} />
            <Text style={styles.macroInputLabel}>Carbs</Text>
            <TextInput
              style={styles.macroInput}
              value={goalCarbs}
              onChangeText={setGoalCarbs}
              keyboardType="numbers-and-punctuation"
              placeholder={String(stats.recommendedMacros.goalCarbs)}
              placeholderTextColor={colors.textDim}
            />
            <Text style={styles.macroInputUnit}>g</Text>
          </View>
          <View style={styles.macroInputCard}>
            <View style={[styles.macroColorBar, { backgroundColor: colors.fats }]} />
            <Text style={styles.macroInputLabel}>Fat</Text>
            <TextInput
              style={styles.macroInput}
              value={goalFat}
              onChangeText={setGoalFat}
              keyboardType="numbers-and-punctuation"
              placeholder={String(stats.recommendedMacros.goalFat)}
              placeholderTextColor={colors.textDim}
            />
            <Text style={styles.macroInputUnit}>g</Text>
          </View>
        </View>

        <View style={styles.integrationCard}>
          <View style={styles.integrationHeader}>
            <View>
              <Text style={styles.integrationTitle}>Apple Health</Text>
              <Text style={styles.integrationSubtitle}>
                {Platform.OS === "ios"
                  ? "Read your daily step count from Apple Health."
                  : "Apple Health step sync appears on iPhone builds only."}
              </Text>
            </View>
            <View
              style={[
                styles.integrationBadge,
                appleHealthConnected && styles.integrationBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.integrationBadgeText,
                  appleHealthConnected && styles.integrationBadgeTextActive,
                ]}
              >
                {appleHealthConnected ? "Connected" : "Inactive"}
              </Text>
            </View>
          </View>
          <Text style={styles.integrationStatus}>{appleHealthStatusText}</Text>
          <TouchableOpacity style={styles.integrationButton} onPress={handleConnectAppleHealth}>
            <Text style={styles.integrationButtonText}>
              {isConnectingAppleHealth
                ? "Connecting..."
                : appleHealthConnected
                  ? "Reconnect Apple Health"
                  : "Connect Apple Health"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <Text style={styles.sectionText}>Choose a theme that suits your style.</Text>
        <View style={styles.themeGrid}>
          {(Object.keys(Themes) as ThemeType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.themeCard, theme === t && styles.themeCardActive]}
              onPress={() => setTheme(t)}
            >
              <Text style={[styles.themeLabel, theme === t && styles.themeLabelActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
  },
  section: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  sectionText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 14,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.tabBackground,
    color: colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  halfField: {
    flex: 1,
  },
  segmentedControl: {
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    flex: 1,
    backgroundColor: colors.tabBackground,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  segmentActive: {
    borderColor: colors.bar,
  },
  segmentText: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: colors.white,
  },
  activityList: {
    gap: 8,
  },
  activityCard: {
    backgroundColor: colors.tabBackground,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "transparent",
  },
  activityCardActive: {
    borderColor: colors.bar,
  },
  activityCopy: {
    flex: 1,
    paddingRight: 12,
  },
  activityTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  activityTitleActive: {
    color: colors.white,
  },
  activityHint: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
  },
  radioActive: {
    borderColor: colors.bar,
    backgroundColor: colors.bar,
  },
  recommendedCard: {
    backgroundColor: colors.tabBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.bar + "55",
  },
  recommendedEyebrow: {
    color: colors.bar,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  recommendedCalRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 16,
  },
  recommendedCalValue: {
    color: colors.white,
    fontSize: 40,
    fontWeight: "800",
    lineHeight: 42,
  },
  recommendedCalUnit: {
    color: colors.textDim,
    fontSize: 15,
    fontWeight: "500",
    paddingBottom: 5,
  },
  recommendedMacroRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
  },
  recommendedMacroItem: {
    flex: 1,
    alignItems: "center",
  },
  recommendedMacroDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.outlineVariant + "44",
  },
  recommendedMacroValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  recommendedMacroLabel: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  macrosSectionLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  macrosRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  macroInputCard: {
    flex: 1,
    backgroundColor: colors.tabBackground,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  macroColorBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  macroInputLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 6,
  },
  macroInput: {
    backgroundColor: colors.background,
    color: colors.white,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: "700",
    width: "100%",
    textAlign: "center",
  },
  macroInputUnit: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: colors.primaryContainer,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 14,
  },
  saveButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  integrationCard: {
    marginTop: 2,
    backgroundColor: colors.tabBackground,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  integrationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  integrationTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  integrationSubtitle: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 3,
    maxWidth: 220,
  },
  integrationBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  integrationBadgeActive: {
    backgroundColor: colors.tertiaryContainer,
  },
  integrationBadgeText: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "700",
  },
  integrationBadgeTextActive: {
    color: colors.background,
  },
  integrationStatus: {
    color: colors.text,
    fontSize: 13,
    marginTop: 14,
    marginBottom: 12,
  },
  integrationButton: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  integrationButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  themeCard: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: colors.tabBackground,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  themeCardActive: {
    borderColor: colors.primary,
  },
  themeLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "600",
  },
  themeLabelActive: {
    color: colors.white,
  },
});
