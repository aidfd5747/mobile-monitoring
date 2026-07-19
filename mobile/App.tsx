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

          // Retry helper for flaky FCM / Play Services errors
          const fetchPushTokenWithRetry = async (attempts = 5, delay = 1000) => {
            let lastError: any = null;
            for (let i = 0; i < attempts; i++) {
              try {
                const t = await Notifications.getExpoPushTokenAsync();
                return t;
              } catch (err) {
                lastError = err;
                console.warn(`[push] getExpoPushTokenAsync attempt ${i + 1} failed`, err);
                // SERVICE_NOT_AVAILABLE often transient; wait and retry
                await new Promise((res) => setTimeout(res, delay * Math.pow(2, i)));
              }
            }
            throw lastError;
          };

          try {
            const pushToken = await fetchPushTokenWithRetry();
            console.log("[push] expo token", pushToken?.data);

            if (pushToken?.data) {
              const response = await api.post("/auth/push-token", {
                expoPushToken: pushToken.data,
              });
              console.log("[push] server save response", response.data);
              registered.current = true;
              console.log("[push] token saved to server", pushToken.data);
            }
          } catch (err) {
            console.error("[push] token registration ultimately failed", err);
            // Helpful hint for debugging
            console.info("[push] hints: ensure device has Google Play Services, network connectivity, and that the app is a standalone build with FCM configured (EAS build). If using emulator, use an image with Google Play.");
          }
        }
      } catch (error) {
        console.log("[push] token registration failed outer", error);
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