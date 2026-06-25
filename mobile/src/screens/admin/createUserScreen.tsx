import { useContext, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from "react-native";
import { AuthContext } from "../../context/authContext";
import api from "../../services/api";

export default function CreateUserScreen() {
  const { token } = useContext(AuthContext);
  const [nama, setNama] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!nama.trim() || !username.trim() || !password.trim()) {
      Alert.alert("Data belum lengkap", "Isi semua field untuk membuat akun");
      return;
    }

    setLoading(true);
    try {
      await api.post(
        "/auth/users",
        {
          nama,
          username,
          password,
          role: "worker",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert("Berhasil", "Akun worker berhasil dibuat");
      setNama("");
      setUsername("");
      setPassword("");
    } catch (error) {
      Alert.alert("Gagal", "Tidak bisa membuat akun worker");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Buat Akun Worker</Text>
        <Text style={styles.subtitle}>Admin dapat membuat akun petugas baru untuk tim lapangan.</Text>

        <Text style={styles.label}>Nama lengkap</Text>
        <TextInput style={styles.input} value={nama} onChangeText={setNama} placeholder="Contoh: Budi Santoso" />

        <Text style={styles.label}>Username</Text>
        <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="username" autoCapitalize="none" />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="password" secureTextEntry />

        <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Buat Akun</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    color: "#64748b",
    marginTop: 6,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
