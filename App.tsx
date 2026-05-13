import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import DashboardScreen from "./screens/DashboardScreen";
import LogScreen from "./screens/LogScreen";
import SearchScreen from "./screens/SearchScreen";
import HistoryScreen from "./screens/HistoryScreen";
import ProfileScreen from "./screens/ProfileScreen";

import { ThemeProvider, useTheme } from "./style/ThemeContext";

const Tab = createBottomTabNavigator();

function Navigation() {
  const { colors, theme } = useTheme();

  return (
    <NavigationContainer>
      <StatusBar style={theme === "Light" ? "dark" : "light"} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const icons: Record<string, string> = {
              Dashboard: focused ? "home" : "home-outline",
              Log: focused ? "add-circle" : "add-circle-outline",
              Search: focused ? "search" : "search-outline",
              History: focused ? "calendar" : "calendar-outline",
              Profile: focused ? "person" : "person-outline",
            };
            return (
              <Ionicons name={icons[route.name] as any} size={size} color={color} />
            );
          },
          tabBarStyle: {
            backgroundColor: colors.tabBackground,
            borderTopWidth: 0.5,
            borderTopColor: colors.outlineVariant,
          },
          headerStyle: { backgroundColor: colors.tabBackground },
          headerTintColor: colors.white,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textDim,
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Log" component={LogScreen} />
        <Tab.Screen name="Search" component={SearchScreen} />
        <Tab.Screen name="History" component={HistoryScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Navigation />
    </ThemeProvider>
  );
}
