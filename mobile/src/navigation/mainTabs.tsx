import {
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import DashboardScreen
  from "../screens/dashboard/dashboardScreen";
import AdminDashboardScreen from "../screens/dashboard/adminDashboardScreen";

import ReportHistoryScreen
  from "../screens/report/reportHistoryScreen";
import PrintReportsScreen from "../screens/report/printReportsScreen";

import ProfileScreen
  from "../screens/profile/profileScreen";
import WorkerListScreen from "../screens/admin/workerListScreen";

import {
  MainTabParamList,
} from "./types";
import { useContext } from "react";
import { AuthContext } from "../context/authContext";

// mainTabs.tsx
// Navigasi bottom tab utama untuk user worker dan admin.
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
          height: 72,
          paddingBottom: 10,
          paddingTop: 6,
          paddingHorizontal: 8,
          borderRadius: 0,
          elevation: 0,
          shadowColor: "#0f172a",
          shadowOpacity: 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: "center",
          minWidth: 0,
        },
        headerStyle: {
          backgroundColor: "#2563eb",
        },
        headerTintColor: "#ffffff",
        tabBarIcon: ({ color, size, focused }) => {
          // Pilih ikon sesuai nama route.
          let iconName: keyof typeof Ionicons.glyphMap = "home-outline";

          if (route.name === "Dashboard") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "ReportHistory") {
            iconName = focused ? "list" : "list-outline";
          } else if (route.name === "Workers") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "PrintReports") {
            iconName = focused ? "print" : "print-outline";
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

      {!isAdmin ? null : (
        <>
          <Tab.Screen
            name="ReportHistory"
            component={ReportHistoryScreen}
            options={{
              title: "Riwayat Laporan",
            }}
          />

          <Tab.Screen
            name="PrintReports"
            component={PrintReportsScreen}
            options={{
              title: "Cetak Laporan",
            }}
          />

          <Tab.Screen
            name="Workers"
            component={WorkerListScreen}
            options={{
              title: "Buat Akun Petugas",
            }}
          />

          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              title: "Profil",
            }}
          />
        </>
      )}

      {!isAdmin ? (
        <>
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
        </>
      ) : null}

    </Tab.Navigator>
  );
}