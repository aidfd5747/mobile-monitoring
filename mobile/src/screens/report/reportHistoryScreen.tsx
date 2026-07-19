import { View, Text, StyleSheet, FlatList, ActivityIndicator, Animated, TouchableOpacity, Alert, Modal, ScrollView } from "react-native";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../../services/api";
import { AuthContext } from "../../context/authContext";
import { formatReportDate } from "../../utils/date";

interface ReportItem {
  id: string;
  petugasId?: string;
  petugasName?: string;
  categoryName?: string;
  description: string;
  status?: string;
  createdAt?: string;
}

// Halaman untuk menampilkan riwayat laporan dan tindakan admin/petugas
export default function ReportHistoryScreen() {
  // Data pengguna saat ini untuk menentukan akses dan filter
  const { user } = useContext(AuthContext);
  const navigation = useNavigation<any>();
  // Daftar laporan yang diambil dari backend
  const [reports, setReports] = useState<ReportItem[]>([]);
  // Status loading saat mengambil laporan
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const isAdmin = user?.role === "admin";
  const [selectedYear, setSelectedYear] = useState<string>("All");
  const [selectedMonth, setSelectedMonth] = useState<string>("All");
  const [selectedDay, setSelectedDay] = useState<string>("All");
  const [openDropdown, setOpenDropdown] = useState<"year" | "month" | "day" | null>(null);

  const monthNames = [
    "All",
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const accessibleReports = isAdmin
    ? reports.filter((report) => (report.status || "submitted").toLowerCase() === "completed")
    : reports.filter((report) => report.petugasId === user?.id || report.petugasName === user?.nama);

  const reportYears = Array.from(
    new Set(
      accessibleReports
        .map((report) => report.createdAt)
        .filter(Boolean)
        .map((createdAt) => new Date(createdAt!).getFullYear())
        .filter((year) => !Number.isNaN(year))
    )
  );

  const baseYears = [2026, 2025, 2024, 2023, 2022, 2021, 2020];
  const allYears = Array.from(new Set([...baseYears, ...reportYears])).sort((a, b) => b - a);
  const availableYears = ["All", ...allYears.map(String)];

  const availableDays = ["All", ...Array.from({ length: 31 }, (_, i) => String(i + 1))];

  const filteredReports = accessibleReports.filter((report) => {
    if (!report.createdAt) {
      return selectedYear === "All" && selectedMonth === "All" && selectedDay === "All";
    }

    const createdDate = new Date(report.createdAt);
    if (Number.isNaN(createdDate.getTime())) {
      return false;
    }

    if (selectedYear !== "All" && String(createdDate.getFullYear()) !== selectedYear) {
      return false;
    }

    if (selectedMonth !== "All" && monthNames[createdDate.getMonth() + 1] !== selectedMonth) {
      return false;
    }

    if (selectedDay !== "All" && String(createdDate.getDate()) !== selectedDay) {
      return false;
    }

    return true;
  });

  const reportsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / reportsPerPage));
  const displayedReports = filteredReports.slice(page * reportsPerPage, (page + 1) * reportsPerPage);
  const hasPagination = totalPages > 1;

  useEffect(() => {
    if (page >= totalPages) {
      setPage(Math.max(totalPages - 1, 0));
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(0);
  }, [selectedYear, selectedMonth, selectedDay]);

  // Ambil daftar laporan dari backend dan set animasi fade setelah selesai
  const loadReports = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get("/reports");
      setReports(response.data.reports || []);
      setPage(0);
    } catch (err) {
      setReports([]);
      setPage(0);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [fadeAnim]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [spinAnim]);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Buka halaman detail laporan ketika salah satu laporan diklik
  const openReportDetail = (report: ReportItem) => {
    navigation.navigate("ReportDetail", { report });
  };

  const openReportEdit = (report: ReportItem) => {
    navigation.navigate("CreateReport", { report, isEdit: true });
  };

  // Hapus laporan dengan konfirmasi dari admin
  const deleteReport = async (report: ReportItem) => {
    Alert.alert("Hapus laporan", `Apakah Anda yakin ingin menghapus laporan milik ${report.petugasName || "petugas"}?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingId(report.id);
            await api.delete(`/reports/${report.id}`);
            setReports((prev) => prev.filter((item) => item.id !== report.id));
            Alert.alert("Berhasil", "Laporan berhasil dihapus");
          } catch (error) {
            Alert.alert("Gagal", "Tidak bisa menghapus laporan saat ini");
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
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
      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterButton} onPress={() => setOpenDropdown("year")}>
          <Text style={styles.filterLabel}>Tahun</Text>
          <Text style={styles.filterValue}>{selectedYear}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => setOpenDropdown("month")}>
          <Text style={styles.filterLabel}>Bulan</Text>
          <Text style={styles.filterValue}>{selectedMonth}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => setOpenDropdown("day")}>
          <Text style={styles.filterLabel}>Tanggal</Text>
          <Text style={styles.filterValue}>{selectedDay}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={openDropdown !== null} transparent animationType="fade" onRequestClose={() => setOpenDropdown(null)}>
        <View style={styles.dropdownBackdrop}>
          <TouchableOpacity style={styles.dropdownBackdropArea} activeOpacity={1} onPress={() => setOpenDropdown(null)} />
          <View style={styles.dropdownCard}>
            <Text style={styles.dropdownTitle}>
              Pilih {openDropdown === "year" ? "Tahun" : openDropdown === "month" ? "Bulan" : "Tanggal"}
            </Text>
            <ScrollView contentContainerStyle={styles.dropdownList}>
              {(
                openDropdown === "year"
                  ? availableYears
                  : openDropdown === "month"
                  ? monthNames
                  : availableDays
              ).map((option, index) => (
                <TouchableOpacity
                  key={`${openDropdown}-${option}-${index}`}
                  style={[
                    styles.dropdownOption,
                    (openDropdown === "year" && selectedYear === option) ||
                    (openDropdown === "month" && selectedMonth === option) ||
                    (openDropdown === "day" && selectedDay === option)
                      ? styles.dropdownOptionActive
                      : null,
                  ]}
                  onPress={() => {
                    if (openDropdown === "year") {
                      setSelectedYear(option);
                    } else if (openDropdown === "month") {
                      setSelectedMonth(option);
                    } else if (openDropdown === "day") {
                      setSelectedDay(option);
                    }
                    setOpenDropdown(null);
                  }}
                >
                  <Text style={styles.dropdownOptionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {hasPagination ? (
        <View style={styles.paginationContainer}>
          <Text style={styles.pageInfo}>Halaman {page + 1} dari {totalPages}</Text>
          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={[styles.pageButton, page === 0 && styles.pageButtonDisabled]}
              disabled={page === 0}
              onPress={() => setPage((prev) => Math.max(prev - 1, 0))}
            >
              <Text style={styles.pageButtonText}>Sebelumnya</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.pageButton,
                (page + 1) * reportsPerPage >= filteredReports.length && styles.pageButtonDisabled,
              ]}
              disabled={(page + 1) * reportsPerPage >= filteredReports.length}
              onPress={() => setPage((prev) => prev + 1)}
            >
              <Text style={styles.pageButtonText}>Berikutnya</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      <FlatList
        data={displayedReports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Animated.View style={[styles.card, { opacity: fadeAnim }] }>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{item.petugasName || "Petugas"}</Text>
              <View style={styles.badge}>
                <Text style={[styles.badge, item.status === "completed" ? styles.completed : styles.submitted]}>
                          {item.status === "completed" ? "Selesai" : "Menunggu"}</Text>
              </View>
            </View>
            <Text style={styles.cardMeta}>{item.categoryName || "Kategori"}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.date}>{formatReportDate(item.createdAt)}</Text>
            {item.status !== "completed" ? (
              <TouchableOpacity style={styles.editButton} onPress={() => openReportEdit(item)}>
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            ) : null}
            {isAdmin ? (
              <View style={styles.adminActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => openReportDetail(item)}>
                  <Text style={styles.actionText}>Lihat Detail</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteButton, deletingId === item.id && styles.deleteButtonDisabled]}
                  onPress={() => deleteReport(item)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.deleteButtonText}>Hapus</Text>
                  )}
                </TouchableOpacity>
              </View>
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
  adminActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    flex: 1,
  },
  actionText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
  editButton: {
    backgroundColor: "#10b981",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    marginTop: 10,
  },
  editButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: "#dc2626",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
  },
  deleteButtonDisabled: {
    opacity: 0.7,
  },
  deleteButtonText: {
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
  paginationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  pageButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  pageButtonDisabled: {
    opacity: 0.5,
    backgroundColor: "#94a3b8",
  },
  pageButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  pageInfo: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  filterButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  filterLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  filterValue: {
    color: "#0f172a",
    fontWeight: "700",
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "center",
    padding: 24,
  },
  dropdownBackdropArea: {
    ...StyleSheet.absoluteFillObject,
  },
  dropdownCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    maxHeight: "60%",
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  dropdownList: {
    paddingBottom: 12,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  dropdownOptionActive: {
    backgroundColor: "#2563eb",
  },
  dropdownOptionText: {
    color: "#0f172a",
    fontWeight: "600",
  },
  paginationContainer: {
    marginBottom: 14,
  },
  completed: {
    color: "#16a34a",
    fontWeight: "700",
  },
  submitted: {
    color: "#dc2626",
    fontWeight: "700",
}});