import { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthContext } from "../context/authContext";
import LoginScreen from "../screens/auth/loginScreen";
import { RootStackParamList } from "./types";
import LoadingScreen from "../screens/loadingScreen";
import MainTabs from "./mainTabs";
import ReportDetailScreen from "../screens/report/reportDetailScreen";

const Stack =
  createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {

  const {
    user,
    loading,
  } = useContext(AuthContext);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>

      <Stack.Navigator>

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
              name="ReportDetail"
              component={ReportDetailScreen}
              options={{
                title: "Detail Laporan",
                headerShown: true,
              }}
            />
          </>
        )}

      </Stack.Navigator>

    </NavigationContainer>
  );
}