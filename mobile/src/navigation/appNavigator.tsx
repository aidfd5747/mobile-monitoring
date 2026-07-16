import { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthContext } from "../context/authContext";
import LoginScreen from "../screens/auth/loginScreen";
import { RootStackParamList } from "./types";
import LoadingScreen from "../screens/loadingScreen";
import MainTabs from "./mainTabs";
import ReportDetailScreen from "../screens/report/reportDetailScreen";
import CreateUserScreen from "../screens/admin/createUserScreen";
import CreateReportScreen from "../screens/report/createReportScreen";

// appNavigator.tsx
// Navigasi utama aplikasi yang menampilkan layar login atau tab utama.
const Stack =
  createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {

  const {
    user,
    loading,
  } = useContext(AuthContext);

  if (loading) {
    // Tampilkan loading saat context autentikasi masih dipulihkan.
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>

      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: "#2563eb",
          },
          headerTintColor: "#ffffff",
        }}
      >

        {!user ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen as any}
            options={{
              headerShown: false,
            }}
          />
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="CreateUser"
              component={CreateUserScreen}
              options={{
                title: "Buat Petugas",
              }}
            />
            <Stack.Screen
              name="CreateReport"
              component={CreateReportScreen}
              options={{
                title: "Buat Laporan",
              }}
            />
            <Stack.Screen
              name="ReportDetail"
              component={ReportDetailScreen}
              options={{
                title: "Detail Laporan",
              }}
            />
          </>
        )}

      </Stack.Navigator>

    </NavigationContainer>
  );
}