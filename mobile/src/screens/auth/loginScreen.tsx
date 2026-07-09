import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { useState, useContext } from "react";

import { AuthContext } from "../../context/authContext";
import api from "../../services/api";

// Layar login untuk autentikasi pengguna petugas
export default function LoginScreen() {
  // Fungsi login dari context autentikasi
  const { login } = useContext(AuthContext);
  // Nilai input username pada form
  const [username, setUsername] = useState("");
  // Nilai input password pada form
  const [password, setPassword] = useState("");
  // Status loading saat menunggu respons API
  const [loading, setLoading] = useState(false);

  // Tangani submit form login ke backend
  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Lengkapi data", "Masukkan username dan password");
      return;
    }

    try {
      setLoading(true);
      const normalizedUsername = username.trim().toLowerCase();
      const response = await api.post("/auth/login", {
        username: normalizedUsername,
        password,
      });

      const { token, user } = response.data;
      await login(user, token);
    } catch (error) {
      Alert.alert("Login gagal", "Username atau password tidak valid");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Monitoring Lapangan</Text>
        <Text style={styles.subtitle}>Masuk sebagai petugas lapangan</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Memproses..." : "Login"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    color: "black",
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});