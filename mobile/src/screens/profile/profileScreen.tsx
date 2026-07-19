import { useCallback, useContext, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert, ScrollView } from "react-native";
import { AuthContext } from "../../context/authContext";
import api from "../../services/api";

interface ProfileData {
  id: string;
  nama: string;
  username?: string;
  role: string;
}

// Layar profil pengguna, dengan opsi update username/password untuk petugas
export default function ProfileScreen() {
  const { user, token, logout, login } = useContext(AuthContext);
  // Profil detail yang terambil dari backend untuk petugas
  const [profile, setProfile] = useState<ProfileData | null>(null);
  // Status loading saat memuat data profil
  const [loading, setLoading] = useState(true);
  // Status ketika menyimpan perubahan profil
  const [saving, setSaving] = useState(false);
  // Nilai input nama pada form
  const [nama, setNama] = useState("");
  // Input username baru
  const [username, setUsername] = useState("");
  // Input password baru
  const [password, setPassword] = useState("");

  const isWorker = user?.role === "worker";

  // Ambil data profil pengguna dari backend
  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/auth/profile");
      setProfile(response.data.user);
      setUsername(response.data.user?.username ?? "");
      setNama(response.data.user?.nama ?? "");
    } catch (error) {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isWorker) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [isWorker, loadProfile]);

  // Simpan perubahan profil username/password ke backend
  const handleSave = async () => {
    if (!username.trim() && !password.trim() && !nama.trim()) {
      Alert.alert("Tidak ada perubahan", "Isi username, password, atau nama untuk memperbarui profil.");
      return;
    }

    setSaving(true);

    try {
      const response = await api.patch("/auth/profile", {
        username: username.trim(),
        password: password.trim(),
        nama: nama.trim(),
      });

      const updatedUser = response.data.user;
      if (updatedUser) {
        setProfile(updatedUser);
        await login(updatedUser, token ?? "");
      }

      Alert.alert("Berhasil", "Profil berhasil diperbarui.");
      setPassword("");
      await loadProfile();
    } catch (error) {
      Alert.alert("Gagal", "Tidak dapat memperbarui profil saat ini.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Profil</Text>
        <Text style={styles.label}>Nama: {profile?.nama || user?.nama || "-"}</Text>
        <Text style={styles.label}>{user?.role === "worker" ? "Petugas" : user?.role === "admin" ? "Admin" : user?.role || "-"}</Text>
      </View>

      {isWorker ? (
        
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Nama baru</Text>
          <TextInput
            style={styles.input}
            value={nama}
            onChangeText={setNama}
            placeholder="Nama baru"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
          />
          <Text style={styles.inputLabel}>Username baru</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Username baru"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
          />
          <Text style={styles.inputLabel}>Password baru</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password baru"
            placeholderTextColor="#94a3b8"
            secureTextEntry
          />
          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Simpan Perubahan</Text>}
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    color: "#0f172a",
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    color: "#334155",
  },
  button: {
    marginTop: 8,
    backgroundColor: "#dc2626",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  inputLabel: {
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
    marginBottom: 12,
    backgroundColor: "#ffffff",
    color: "black",
  },
  logoutButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  logoutButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});