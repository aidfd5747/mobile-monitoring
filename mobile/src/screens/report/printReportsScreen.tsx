import { useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import api from "../../services/api";
import { AuthContext } from "../../context/authContext";

interface ReportItem {
  id: string;
  petugasName?: string;
  categoryName?: string;
  description: string;
  status?: string;
  createdAt?: string;
  photoUrl?: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildPdfHtml = (reports: ReportItem[]) => {
  const rows = reports
    .map((report, index) => {
      const date = report.createdAt
        ? new Date(report.createdAt).toLocaleString("id-ID")
        : "-";
      const photoCell = report.photoUrl
        ? `<img src="${escapeHtml(report.photoUrl)}" alt="Foto laporan" style="max-width: 140px; max-height: 100px; object-fit: cover;" />`
        : "-";

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(report.petugasName || "Petugas")}</td>
          <td>${escapeHtml(report.categoryName || "-")}</td>
          <td>${escapeHtml(report.description || "-")}</td>
          <td>${escapeHtml(report.status || "submitted")}</td>
          <td>${escapeHtml(date)}</td>
          <td>${photoCell}</td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
  <html lang="id">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
        h1 { font-size: 22px; margin-bottom: 8px; }
        p { color: #475569; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left; vertical-align: top; }
        th { background-color: #eff6ff; }
        img { border-radius: 6px; }
      </style>
    </head>
    <body>
      <h1>Daftar Laporan Monitoring</h1>
      <p>Dicetak dari aplikasi mobile monitoring.</p>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Petugas</th>
            <th>Kategori</th>
            <th>Deskripsi</th>
            <th>Status</th>
            <th>Tanggal</th>
            <th>Foto</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
  </html>`;
};

export default function PrintReportsScreen() {
  const { user } = useContext(AuthContext);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const response = await api.get("/reports");
        setReports(response.data.reports || []);
      } catch (error) {
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const filteredReports = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    console.log("[print] filtering reports", { search: normalized, total: reports.length });

    if (!normalized) {
      return reports;
    }

    return reports.filter((report) => {
      const haystack = [
        report.petugasName,
        report.categoryName,
        report.description,
        report.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [reports, search]);

  const toggleSelection = (reportId: string) => {
    setSelectedIds((prev) =>
      prev.includes(reportId) ? prev.filter((item) => item !== reportId) : [...prev, reportId]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredReports.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(filteredReports.map((item) => item.id));
  };

  const handleGeneratePdf = async () => {
    const itemsToExport = reports.filter((report) => selectedIds.includes(report.id));

    console.log("[print] generating pdf", { selectedCount: itemsToExport.length, selectedIds });

    if (!itemsToExport.length) {
      console.log("[print] no reports selected");
      Alert.alert("Pilih laporan", "Pilih minimal satu laporan untuk dicetak");
      return;
    }

    setGenerating(true);
    try {
      const html = buildPdfHtml(itemsToExport);
      console.log("[print] pdf html ready", html.length);
      const file = await Print.printToFileAsync({ html });
      console.log("[print] pdf created", file.uri);
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Bagikan laporan PDF",
        UTI: "com.adobe.pdf",
      });
    } catch (error) {
      Alert.alert("Gagal", "Tidak dapat membuat file PDF");
    } finally {
      setGenerating(false);
    }
  };

  const renderItem = ({ item }: { item: ReportItem }) => {
    const isSelected = selectedIds.includes(item.id);

    return (
      <TouchableOpacity style={styles.card} onPress={() => toggleSelection(item.id)}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.petugasName || "Petugas"}</Text>
            <Text style={styles.cardMeta}>{item.categoryName || "Kategori"}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description || "-"}
            </Text>
          </View>
          <Ionicons
            name={isSelected ? "checkbox" : "square-outline"}
            size={24}
            color={isSelected ? "#2563eb" : "#94a3b8"}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Cetak Laporan</Text>
        <Text style={styles.subtitle}>Cari laporan, pilih yang ingin dicetak, lalu ekspor ke PDF.</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Cari laporan berdasarkan petugas, kategori, atau status"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={selectAll}>
          <Text style={styles.secondaryButtonText}>
            {selectedIds.length === filteredReports.length ? "Batal pilih" : "Pilih semua"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, generating && styles.primaryButtonDisabled]}
          onPress={handleGeneratePdf}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Buat PDF</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Memuat laporan...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Tidak ada laporan</Text>
              <Text style={styles.emptyText}>Coba ubah kata kunci pencarian.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8fafc",
  },
  headerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    color: "#64748b",
    marginTop: 6,
    lineHeight: 18,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontWeight: "700",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#64748b",
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardInfo: {
    flex: 1,
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
  cardDesc: {
    color: "#475569",
    marginTop: 4,
  },
  emptyBox: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyTitle: {
    fontWeight: "700",
    color: "#0f172a",
  },
  emptyText: {
    color: "#64748b",
    marginTop: 5,
  },
});
