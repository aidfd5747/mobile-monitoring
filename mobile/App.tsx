import { Platform } from "react-native";
import { useContext, useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { AuthContext, AuthProvider } from "./src/context/authContext";
import AppNavigator from "./src/navigation/appNavigator";
import api from "./src/services/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function NotificationBootstrap() {
  const { user, token } = useContext(AuthContext);
  const registered = useRef(false);

  useEffect(() => {
    let subscription: any;
    let responseSubscription: any;

    const initializeNotifications = async () => {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
          });
        }
      } catch (error) {
        console.log("[push] channel setup failed", error);
      }

      try {
        if (Device.isDevice && user?.id && token && !registered.current) {
          const permission = await Notifications.requestPermissionsAsync();
          console.log("[push] permissions", permission);

          const pushToken = await Notifications.getExpoPushTokenAsync();
          console.log("[push] expo token", pushToken?.data);

          if (pushToken?.data) {
            const response = await api.post("/auth/push-token", {
              expoPushToken: pushToken.data,
            });
            console.log("[push] server save response", response.data);
            registered.current = true;
            console.log("[push] token saved to server", pushToken.data);
          }
        }
      } catch (error) {
        console.log("[push] token registration failed", error);
      }

      subscription = Notifications.addNotificationReceivedListener((notification) => {
        console.log("[push] foreground notification", notification.request.content.title, notification.request.content.body);
      });

      responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("[push] user tapped notification", response.notification.request.content.title);
      });
    };

    initializeNotifications();

    return () => {
      subscription?.remove();
      responseSubscription?.remove();
    };
  }, [user?.id, token]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationBootstrap />
      <AppNavigator />
    </AuthProvider>
  );
}