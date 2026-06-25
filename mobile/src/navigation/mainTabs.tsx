import {
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import DashboardScreen
  from "../screens/dashboard/dashboardScreen";
import AdminDashboardScreen from "../screens/dashboard/adminDashboardScreen";

import CreateReportScreen
  from "../screens/report/createReportScreen";

import ReportHistoryScreen
  from "../screens/report/reportHistoryScreen";
import ReportDetailScreen from "../screens/report/reportDetailScreen";

import ProfileScreen
  from "../screens/profile/profileScreen";
import CreateUserScreen from "../screens/admin/createUserScreen";

import {
  MainTabParamList,
} from "./types";
import { useContext } from "react";
import { AuthContext } from "../context/authContext";

const Tab =
  createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === "admin";

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e2e8f0",
          height: 68,
          paddingBottom: 8,
          paddingTop: 6,
          position: "absolute",
          bottom: 10,
          left: 12,
          right: 12,
          borderRadius: 18,
          elevation: 6,
          shadowColor: "#0f172a",
          shadowOpacity: 0.08,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
        },
        headerStyle: {
          backgroundColor: "#2563eb",
        },
        headerTintColor: "#ffffff",
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home-outline";

          if (route.name === "Dashboard") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "CreateReport") {
            iconName = focused ? "add-circle" : "add-circle-outline";
          } else if (route.name === "ReportHistory") {
            iconName = focused ? "list" : "list-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person-circle" : "person-circle-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >

      <Tab.Screen
        name="Dashboard"
        component={isAdmin ? AdminDashboardScreen : DashboardScreen}
      />

      {!isAdmin ? (
        <Tab.Screen
          name="CreateReport"
          component={CreateReportScreen}
          options={{
            title: "Laporan",
          }}
        />
      ) : null}

      <Tab.Screen
        name="ReportHistory"
        component={ReportHistoryScreen}
        options={{
          title: "Riwayat",
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profil",
        }}
      />

      {isAdmin ? (
        <>
          <Tab.Screen
            name="CreateUser"
            component={CreateUserScreen}
            options={{
              title: "Buat User",
            }}
          />
          <Tab.Screen
            name="ReportDetail"
            component={ReportDetailScreen}
            options={{
              title: "Detail Laporan",
              tabBarButton: () => null,
            }}
          />
        </>
      ) : null}

    </Tab.Navigator>
  );
}