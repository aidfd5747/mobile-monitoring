import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useContext } from "react";
import { AuthContext } from "../../context/authContext";
import AppCard from "../../components/AppCard";

// Layar dashboard utama yang menampilkan ringkasan untuk admin atau petugas
export default function DashboardScreen() {
  // Data pengguna saat ini untuk menentukan peran tampilan
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === "admin";
  // Judul dan pesan yang berubah sesuai peran pengguna
  const greetingTitle = isAdmin ? "Dashboard Admin" : "Dashboard Petugas";
  const greetingText = isAdmin
    ? "Pantau kegiatan lapangan dan kelola laporan secara cepat."
    : "Siapkan laporan harian dengan foto, lokasi, dan status terbaru.";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.greeting}>Selamat datang</Text>
        <Text style={styles.name}>{user?.nama || "Petugas"}</Text>
        <Text style={styles.role}>{isAdmin ? "Administrator" : "Petugas Lapangan"}</Text>
        <Text style={styles.subtitle}>{greetingTitle}</Text>
        <Text style={styles.message}>{greetingText}</Text>
      </View>

      <View style={styles.section}>
        <AppCard title="Status sistem" value="Realtime monitoring aktif" />
        <AppCard title="Peran" value={isAdmin ? "Administrator" : "Petugas Lapangan"} />
        <AppCard title="Fitur utama" value="Input laporan, foto, lokasi, dan riwayat" />
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
  hero: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  greeting: {
    fontSize: 15,
    color: "#64748b",
    marginBottom: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  role: {
    fontSize: 14,
    color: "blue",
    marginBottom: 2,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 6,
  },
  message: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 6,
    lineHeight: 18,
  },
  section: {
    marginTop: 4,
  },
});