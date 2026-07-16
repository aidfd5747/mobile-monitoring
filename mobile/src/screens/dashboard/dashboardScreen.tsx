import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useCallback, useContext, useEffect, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { AuthContext } from "../../context/authContext";
import AppCard from "../../components/AppCard";
import api from "../../services/api";

interface NotificationItem {
  id: string;
  message: string;
  createdAt?: string;
}

// Layar dashboard utama yang menampilkan ringkasan untuk admin atau petugas
export default function DashboardScreen() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation<any>();
  const isAdmin = user?.role === "admin";
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const greetingTitle = isAdmin ? "Dashboard Admin" : "Dashboard Petugas";
  const greetingText = isAdmin
    ? "Pantau kegiatan lapangan dan kelola laporan secara cepat."
    : "Siapkan laporan harian dengan foto, lokasi, dan status terbaru.";

  const loadNotifications = async () => {
    try {
      const response = await api.get("/reports/notifications");
      setNotifications(response.data.notifications ?? []);
    } catch (error) {
      setNotifications([]);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
      return () => undefined;
    }, [])
  );

  const openCreateReport = () => {
    navigation.navigate("CreateReport", { autoCamera: true });
  };

  const showLatestNotification = () => {
    if (!notifications.length) {
      return;
    }

    Alert.alert("Notifikasi", notifications[0].message);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.greeting}>Selamat datang</Text>
        <Text style={styles.name}>{user?.nama || "Petugas"}</Text>
        <Text style={styles.role}>{isAdmin ? "Administrator" : "Petugas Lapangan"}</Text>
        <Text style={styles.subtitle}>{greetingTitle}</Text>
        <Text style={styles.message}>{greetingText}</Text>

        {!isAdmin ? (
          <TouchableOpacity style={styles.primaryButton} onPress={openCreateReport}>
            <Text style={styles.primaryButtonText}>Tambah Laporan</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.section}>
        <AppCard title="Status sistem" value="Realtime monitoring aktif" />
        <AppCard title="Peran" value={isAdmin ? "Administrator" : "Petugas Lapangan"} />
        <AppCard title="Fitur utama" value="Input laporan, foto, lokasi, dan riwayat" />
      </View>

      <View style={styles.notificationPanel}>
        <View style={styles.notificationHeader}>
          <Text style={styles.panelTitle}>Notifikasi</Text>
          {notifications.length ? (
            <TouchableOpacity onPress={showLatestNotification}>
              <Text style={styles.linkText}>Lihat</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {notifications.length ? (
          notifications.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.notificationItem}>
              <Text style={styles.notificationMessage}>{item.message}</Text>
              <Text style={styles.notificationMeta}>
                {item.createdAt ? new Date(item.createdAt).toLocaleString("id-ID") : "Baru"}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Belum ada notifikasi.</Text>
        )}
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
    color: "#2563eb",
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
  primaryButton: {
    marginTop: 14,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  section: {
    marginTop: 4,
  },
  notificationPanel: {
    marginTop: 14,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  linkText: {
    color: "#2563eb",
    fontWeight: "700",
  },
  notificationItem: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  notificationMessage: {
    color: "#0f172a",
    fontSize: 13,
  },
  notificationMeta: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 4,
  },
  emptyText: {
    color: "#64748b",
  },
});