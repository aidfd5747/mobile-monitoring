import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
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

  // Ganti file ini dengan gambar background tempat kerja Anda.
  // Simpan file di mobile/src/assets/ dan ganti path berikut setelah file valid tersedia.
  const backgroundSource = require("../../assets/images.png");

  return (
    <ImageBackground
      source={backgroundSource}
      resizeMode="cover"
      style={styles.container}
      imageStyle={styles.backgroundImage}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Monitoring Lapangan</Text>
          <Text style={styles.subtitle}>Masuk sebagai petugas lapangan</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Memproses..." : "Login"}</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    opacity: 0.6,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
  },
  card: {
    backgroundColor: "rgba(23, 19, 19, 0.82)",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#ffffff",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    color: "white",
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