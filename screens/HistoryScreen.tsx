import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Colors } from "../style/theme";

// These are starter placeholders — build them out as you go!

export function LogScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Quick Log</Text>
      <Text style={styles.sub}>
        Type a meal in plain English{"\n"}e.g. "2 eggs and a banana"
      </Text>
      {/* TODO: TextInput → call getNutrition() from utils/api.ts */}
    </View>
  );
}

export function HistoryScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.sub}>Browse past days here</Text>
      {/* TODO: FlatList of past dates, tap to see that day's meals */}
    </View>
  );
}

export function ProfileScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Profile & Goals</Text>
      <Text style={styles.sub}>Set your calorie and macro targets</Text>
      {/* TODO: Form → saveProfile() from utils/storage.ts */}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.platinum,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: Colors.dimGrey,
    textAlign: "center",
    lineHeight: 22,
  },
});

export default LogScreen;
