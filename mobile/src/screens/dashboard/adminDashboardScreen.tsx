import { useCallback, useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import api from "../../services/api";
import { AuthContext } from "../../context/authContext";

interface SummaryData {
  totalReports: number;
  submitted: number;
  completed: number;
  recentReports: Array<{
    id: string;
    petugasName?: string;
    description?: string;
    status?: string;
    createdAt?: string;
  }>;
}

interface NotificationItem {
  id: string;
  message: string;
  createdAt?: string;
}

// Layar dashboard khusus admin untuk monitoring laporan dan ringkasan statistik
export default function AdminDashboardScreen() {
  // Data pengguna dan navigasi untuk membuka detail laporan
  const { user } = useContext(AuthContext);
  const navigation = useNavigation<any>();
  // Ringkasan statistik laporan dari backend
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  // Status loading saat memuat data summary
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === "admin";
  // Hanya tampilkan laporan terbaru yang berstatus submitted
  const visibleRecentReports = (summary?.recentReports ?? []).filter(
    (item) => (item.status || "submitted").toLowerCase() === "submitted"
  );

  // Ambil ringkasan laporan dari backend
  const loadSummary = async () => {
    setLoading(true);
    try {
      const response = await api.get("/reports/summary");
      setSummary(response.data.summary);
    } catch (error) {
      setSummary({
        totalReports: 0,
        submitted: 0,
        completed: 0,
        recentReports: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await api.get("/reports/notifications");
      const nextNotifications = response.data.notifications ?? [];
      setNotifications(nextNotifications);

      if (nextNotifications.length) {
        Alert.alert("Notifikasi", nextNotifications[0].message);
      }
    } catch (error) {
      setNotifications([]);
    }
  };

  useEffect(() => {
    loadSummary();
    loadNotifications();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
      loadNotifications();
      return () => undefined;
    }, [])
  );

  // Buka layar detail laporan ketika admin memilih item terbaru
  const openReportDetail = (item: SummaryData["recentReports"][number]) => {
    navigation.navigate("ReportDetail", { report: item });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Dashboard Admin</Text>
        <Text style={styles.subtitle}>Monitor Semua Laporan Secara Real Time.</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{summary?.totalReports ?? 0}</Text>
          <Text style={styles.cardLabel}>Total Laporan</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardValue}>{summary?.submitted ?? 0}</Text>
          <Text style={styles.cardLabel}>Menunggu</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardValue}>{summary?.completed ?? 0}</Text>
          <Text style={styles.cardLabel}>Selesai</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Laporan Terbaru</Text>
        {visibleRecentReports.length ? (
          visibleRecentReports.map((item) => (
            <View key={item.id} style={styles.item}>
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.petugasName || "Petugas"}</Text>
                  <Text style={styles.itemDesc}>{item.description || "-"}</Text>
                  <Text style={styles.itemMeta}>{item.status === "submitted" ? "Menunggu" : "Selesai"}</Text>
                </View>
                {isAdmin ? (
                  <TouchableOpacity style={styles.actionButton} onPress={() => openReportDetail(item)}>
                    <Text style={styles.actionText}>Verifikasi</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Belum ada laporan.</Text>
        )}
      </View>

      <View style={styles.notificationPanel}>
        <Text style={styles.panelTitle}>Notifikasi</Text>
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
          <Text style={styles.empty}>Belum ada notifikasi.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  hero: {
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
    color: "#0f172a",
  },
  subtitle: {
    color: "#64748b",
    marginTop: 6,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  card: {
    width: "31%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563eb",
  },
  cardLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  panel: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  notificationPanel: {
    marginTop: 16,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    color: "#0f172a",
  },
  item: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
    marginTop: 10,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  itemName: {
    fontWeight: "600",
    color: "#0f172a",
  },
  itemDesc: {
    color: "#334155",
    marginTop: 2,
  },
  itemMeta: {
    color: "red",
    marginTop: 4,
    fontSize: 12,
  },
  actionButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
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
  empty: {
    color: "#64748b",
  },
});
