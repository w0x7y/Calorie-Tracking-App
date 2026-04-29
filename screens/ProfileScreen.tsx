import React, { useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { calculateBMR } from "../utils/nutrition";
import { getProfile, saveProfile } from "../utils/storage";
import { UserProfile } from "../types";
import { Colors } from "../style/theme";

const ACTIVITY_OPTIONS = [
  { key: "sedentary", label: "Sedentary", multiplier: 1.2 },
  { key: "light", label: "Light", multiplier: 1.375 },
  { key: "moderate", label: "Moderate", multiplier: 1.55 },
  { key: "active", label: "Active", multiplier: 1.725 },
  { key: "very_active", label: "Very Active", multiplier: 1.9 },
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

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      getProfile().then((profile) => {
        if (!active || !profile) return;
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

  function applyRecommendedCalories() {
    setGoalCalories(String(stats.maintenanceCalories));
    setGoalProtein(String(stats.recommendedMacros.goalProtein));
    setGoalCarbs(String(stats.recommendedMacros.goalCarbs));
    setGoalFat(String(stats.recommendedMacros.goalFat));
  }

  async function handleSave() {
    const parsedAge = parseNumber(age, DEFAULT_PROFILE.age);
    const parsedWeight = parseNumber(weightKg, DEFAULT_PROFILE.weightKg);
    const parsedHeight = parseNumber(heightCm, DEFAULT_PROFILE.heightCm);
    const parsedGoalCalories = parseNumber(goalCalories, stats.maintenanceCalories);
    const parsedGoalProtein = parseNumber(goalProtein, stats.recommendedMacros.goalProtein);
    const parsedGoalCarbs = parseNumber(goalCarbs, stats.recommendedMacros.goalCarbs);
    const parsedGoalFat = parseNumber(goalFat, stats.recommendedMacros.goalFat);
    const parsedWaterGoalMl = parseNumber(waterGoalMl, DEFAULT_PROFILE.waterGoalMl);

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
    };

    await saveProfile(profile);
    Alert.alert("Saved", "Your profile and goals were updated.");
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.calculatorCard}>
        <Text style={styles.sectionEyebrow}>Calorie Calculator</Text>
        <Text style={styles.calorieNumber}>{stats.maintenanceCalories}</Text>
        <Text style={styles.calorieLabel}>daily maintenance calories</Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryValue}>{stats.bmr}</Text>
            <Text style={styles.summaryLabel}>BMR</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryValue}>{stats.bmi}</Text>
            <Text style={styles.summaryLabel}>BMI</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={applyRecommendedCalories}>
          <Text style={styles.primaryButtonText}>Use This As My Goal</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Info</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={Colors.textDim}
          />
        </View>

        <View style={styles.twoColRow}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              placeholder="25"
              placeholderTextColor={Colors.textDim}
            />
          </View>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="decimal-pad"
              placeholder="70"
              placeholderTextColor={Colors.textDim}
            />
          </View>
        </View>

        <View style={styles.twoColRow}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={heightCm}
              onChangeText={setHeightCm}
              keyboardType="decimal-pad"
              placeholder="175"
              placeholderTextColor={Colors.textDim}
            />
          </View>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.segmentedControl}>
              {(["male", "female"] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.segment,
                    gender === option && styles.segmentActive,
                  ]}
                  onPress={() => setGender(option)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      gender === option && styles.segmentTextActive,
                    ]}
                  >
                    {option === "male" ? "Male" : "Female"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Activity Level</Text>
          <View style={styles.optionGrid}>
            {ACTIVITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionButton,
                  activityLevel === option.key && styles.optionButtonActive,
                ]}
                onPress={() => setActivityLevel(option.key)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    activityLevel === option.key && styles.optionButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Goals</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Daily Calories</Text>
          <TextInput
            style={styles.input}
            value={goalCalories}
            onChangeText={setGoalCalories}
            keyboardType="number-pad"
            placeholder={String(stats.maintenanceCalories)}
            placeholderTextColor={Colors.textDim}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Water Goal (ml)</Text>
          <TextInput
            style={styles.input}
            value={waterGoalMl}
            onChangeText={setWaterGoalMl}
            keyboardType="number-pad"
            placeholder={String(DEFAULT_PROFILE.waterGoalMl)}
            placeholderTextColor={Colors.textDim}
          />
        </View>

        <View style={styles.threeColRow}>
          <View style={[styles.field, styles.thirdField]}>
            <Text style={styles.label}>Protein</Text>
            <TextInput
              style={styles.input}
              value={goalProtein}
              onChangeText={setGoalProtein}
              keyboardType="number-pad"
              placeholder={String(stats.recommendedMacros.goalProtein)}
              placeholderTextColor={Colors.textDim}
            />
          </View>
          <View style={[styles.field, styles.thirdField]}>
            <Text style={styles.label}>Carbs</Text>
            <TextInput
              style={styles.input}
              value={goalCarbs}
              onChangeText={setGoalCarbs}
              keyboardType="number-pad"
              placeholder={String(stats.recommendedMacros.goalCarbs)}
              placeholderTextColor={Colors.textDim}
            />
          </View>
          <View style={[styles.field, styles.thirdField]}>
            <Text style={styles.label}>Fat</Text>
            <TextInput
              style={styles.input}
              value={goalFat}
              onChangeText={setGoalFat}
              keyboardType="number-pad"
              placeholder={String(stats.recommendedMacros.goalFat)}
              placeholderTextColor={Colors.textDim}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
  },
  calculatorCard: {
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 12,
    padding: 18,
  },
  sectionEyebrow: {
    color: Colors.textDim,
    fontSize: 13,
    marginBottom: 8,
  },
  calorieNumber: {
    color: Colors.white,
    fontSize: 40,
    fontWeight: "700",
  },
  calorieLabel: {
    color: Colors.text,
    fontSize: 15,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    marginBottom: 16,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: Colors.tabBackground,
    borderRadius: 10,
    padding: 12,
  },
  summaryValue: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: "700",
  },
  summaryLabel: {
    color: Colors.textDim,
    fontSize: 12,
    marginTop: 3,
  },
  primaryButton: {
    backgroundColor: Colors.bar,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: Colors.black,
    fontSize: 15,
    fontWeight: "700",
  },
  section: {
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    color: Colors.text,
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.tabBackground,
    color: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  threeColRow: {
    flexDirection: "row",
    gap: 10,
  },
  halfField: {
    flex: 1,
  },
  thirdField: {
    flex: 1,
  },
  segmentedControl: {
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    flex: 1,
    backgroundColor: Colors.tabBackground,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  segmentActive: {
    borderColor: Colors.bar,
  },
  segmentText: {
    color: Colors.textDim,
    fontSize: 14,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: Colors.white,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    backgroundColor: Colors.tabBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionButtonActive: {
    borderColor: Colors.bar,
  },
  optionButtonText: {
    color: Colors.textDim,
    fontSize: 13,
    fontWeight: "600",
  },
  optionButtonTextActive: {
    color: Colors.white,
  },
  saveButton: {
    backgroundColor: Colors.rosyGranite,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
});
