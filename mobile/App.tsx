import {
  AuthProvider,
} from "./src/context/authContext";

import AppNavigator
  from "./src/navigation/appNavigator";

export default function App() {
  return (
    <AuthProvider>

      <AppNavigator />

    </AuthProvider>
  );
}