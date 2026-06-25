import { View, Text, StyleSheet, FlatList, ActivityIndicator, Animated, TouchableOpacity, Alert } from "react-native";
import { useContext, useEffect, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../../services/api";
import { AuthContext } from "../../context/authContext";

interface ReportItem {
  id: string;
  petugasName?: string;
  categoryName?: string;
  description: string;
  status?: string;
  createdAt?: string;
}

export default function ReportHistoryScreen() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation<any>();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    ).start();

    const loadReports = async () => {
      try {
        const response = await api.get("/reports");
        setReports(response.data.reports || []);
      } catch (err) {
        setReports([]);
      } finally {
        setLoading(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    };

    loadReports();
  }, [fadeAnim, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const openReportDetail = (report: ReportItem) => {
    navigation.navigate("ReportDetail", { report });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Animated.View style={[styles.loader, { transform: [{ rotate: spin }] }]}>
          <Ionicons name="refresh" size={24} color="#2563eb" />
        </Animated.View>
        <Text style={styles.loadingText}>Memuat riwayat laporan...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Riwayat Laporan</Text>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Animated.View style={[styles.card, { opacity: fadeAnim }] }>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{item.petugasName || "Petugas"}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.status || "submitted"}</Text>
              </View>
            </View>
            <Text style={styles.cardMeta}>{item.categoryName || "Kategori"}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.date}>{item.createdAt ? new Date(item.createdAt).toLocaleString("id-ID") : "-"}</Text>
            {isAdmin ? (
              <TouchableOpacity style={styles.actionButton} onPress={() => openReportDetail(item)}>
                <Text style={styles.actionText}>Lihat Detail</Text>
              </TouchableOpacity>
            ) : null}
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={28} color="#94a3b8" />
            <Text style={styles.emptyTitle}>Belum ada laporan</Text>
            <Text style={styles.emptyText}>Laporan yang Anda kirim akan muncul di sini.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loader: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  loadingText: {
    color: "#64748b",
    fontWeight: "600",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    color: "#0f172a",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontWeight: "700",
    color: "#0f172a",
  },
  cardMeta: {
    color: "#2563eb",
    marginTop: 4,
    fontWeight: "600",
  },
  description: {
    marginTop: 8,
    color: "#334155",
  },
  badge: {
    backgroundColor: "#e0f2fe",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    color: "#0369a1",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  date: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 12,
  },
  actionButton: {
    marginTop: 10,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  actionText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyTitle: {
    color: "#0f172a",
    fontWeight: "700",
    marginTop: 8,
  },
  emptyText: {
    color: "#64748b",
    marginTop: 6,
    textAlign: "center",
  },
});