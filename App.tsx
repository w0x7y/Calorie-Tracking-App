import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import DashboardScreen from "./screens/DashboardScreen";
import LogScreen from "./screens/LogScreen";
import SearchScreen from "./screens/SearchScreen";
import HistoryScreen from "./screens/HistoryScreen";
import ProfileScreen from "./screens/ProfileScreen";

import { Colors } from "./style/theme";

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light"/>
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
              <Ionicons
                name={icons[route.name] as any}
                size={size}
                color={color}
              />
            );
          },
          tabBarStyle: { backgroundColor: Colors.tabBackground, borderTopWidth: 0.5, borderTopColor: Colors.rosyGranite },
          headerStyle: { backgroundColor: Colors.tabBackground },
          headerTintColor: Colors.white,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.dimGrey,
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
