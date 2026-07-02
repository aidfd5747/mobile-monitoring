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

export default function ProfileScreen() {
  const { user, logout } = useContext(AuthContext);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const isWorker = user?.role === "worker";

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/auth/profile");
      setProfile(response.data.user);
      setUsername(response.data.user?.username ?? "");
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

  const handleSave = async () => {
    if (!username.trim() && !password.trim()) {
      Alert.alert("Tidak ada perubahan", "Isi username atau password untuk memperbarui profil.");
      return;
    }

    setSaving(true);

    try {
      await api.patch("/auth/profile", {
        username: username.trim(),
        password: password.trim(),
      });

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
        <Text style={styles.label}>Role: {user?.role === "worker" ? "Pekerja" : user?.role === "admin" ? "Administrator" : user?.role || "-"}</Text>
      </View>

      {isWorker ? (
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Username baru</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Username baru"
            autoCapitalize="none"
          />
          <Text style={styles.inputLabel}>Password baru</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password baru"
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
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Profil</Text>
        <Text style={styles.label}>Nama: {user?.nama || "-"}</Text>
        <Text style={styles.label}>Role: {user?.role === "worker" ? "Pekerja" : user?.role || "-"}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
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
});