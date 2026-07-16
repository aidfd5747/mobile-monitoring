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
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function NotificationBootstrap() {
  const { user, token } = useContext(AuthContext);
  const registered = useRef(false);

  useEffect(() => {
    const registerPushToken = async () => {
      if (!Device.isDevice || !user?.id || !token || registered.current) {
        return;
      }

      await Notifications.requestPermissionsAsync();

      const pushToken = await Notifications.getExpoPushTokenAsync();

      if (!pushToken?.data) {
        return;
      }

      registered.current = true;
      await api.post("/auth/push-token", {
        expoPushToken: pushToken.data,
      });
    };

    registerPushToken().catch((error) => {
      console.log("[push] token registration failed", error);
    });
  }, [user?.id, token]);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log("[push] foreground notification", notification.request.content.title, notification.request.content.body);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("[push] user tapped notification", response.notification.request.content.title);
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

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