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

export default function AdminDashboardScreen() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation<any>();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === "admin";
  const visibleRecentReports = (summary?.recentReports ?? []).filter(
    (item) => (item.status || "submitted").toLowerCase() === "submitted"
  );

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

  useEffect(() => {
    loadSummary();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
      return () => undefined;
    }, [])
  );

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
        <Text style={styles.subtitle}>Monitor semua laporan lapangan secara realtime.</Text>
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
                  <Text style={styles.itemMeta}>{item.status || "submitted"}</Text>
                </View>
                {isAdmin ? (
                  <TouchableOpacity style={styles.actionButton} onPress={() => openReportDetail(item)}>
                    <Text style={styles.actionText}>Inspect</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Belum ada laporan.</Text>
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
    color: "#16a34a",
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
  empty: {
    color: "#64748b",
  },
});
