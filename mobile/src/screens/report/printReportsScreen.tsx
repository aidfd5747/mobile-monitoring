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
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import api from "../../services/api";
import { AuthContext } from "../../context/authContext";

// Tipe data untuk satu item laporan yang dipilih atau ditampilkan
interface ReportItem {
  id: string;
  petugasName?: string;
  categoryName?: string;
  description: string;
  status?: string;
  createdAt?: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  photoDataUrl?: string;
  mapCacheUri?: string;
  mapDataUrl?: string;
}

// Escape karakter HTML agar string aman digunakan di dalam konten HTML PDF
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Hitung grid tile OpenStreetMap dan offset untuk menempatkan posisi koordinat di tengah pratinjau
// Hitung grid tile OpenStreetMap untuk preview peta dan offset penempatan marker
const getOsmTileGrid = (latitude: number, longitude: number, zoom = 15) => {
  // Konversi lintang ke radian untuk perhitungan mercator
  const latRad = (latitude * Math.PI) / 180;
  const n = 2 ** zoom;
  // Posisi tile dalam koordinat Web Mercator
  const x = ((longitude + 180) / 360) * n;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const xTile = Math.floor(x);
  const yTile = Math.floor(y);
  const xFrac = x - xTile;
  const yFrac = y - yTile;
  const xBase = xTile - 1;
  const yBase = yTile - 1;
  const subdomains = ["a", "b", "c"];
  const tileUrl = (tx: number, ty: number) => `https://${subdomains[(tx + ty) % 3]}.tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;

  // Offset untuk menempatkan titik koordinat di tengah kotak preview
  const centerOffsetX = 90 - ((xTile - xBase) * 256 + xFrac * 256);
  const centerOffsetY = 57.5 - ((yTile - yBase) * 256 + yFrac * 256);

  return {
    urls: [
      tileUrl(xBase, yBase),
      tileUrl(xBase + 1, yBase),
      tileUrl(xBase + 2, yBase),
      tileUrl(xBase, yBase + 1),
      tileUrl(xBase + 1, yBase + 1),
      tileUrl(xBase + 2, yBase + 1),
      tileUrl(xBase, yBase + 2),
      tileUrl(xBase + 1, yBase + 2),
      tileUrl(xBase + 2, yBase + 2),
    ],
    translateX: centerOffsetX,
    translateY: centerOffsetY,
    tileOffsetX: 110 - (256 + xFrac * 256),
    tileOffsetY: 70 - (256 + yFrac * 256),
    fractionX: xFrac,
    fractionY: yFrac,
  };
};

// Ambil URL tile pusat OSM sebagai fallback untuk caching
const getOsmTileUrl = (latitude: number, longitude: number, zoom = 15) => {
  const tileInfo = getOsmTileGrid(latitude, longitude, zoom);
  return { url: tileInfo.urls[4] };
};

// Hitung hash sederhana dari string untuk nama file cache unik
const hashString = (value: string) =>
  value.split("").reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 0);

// Bangun URI file cache lokal untuk URL tile peta yang diberikan
const getMapCacheUri = (url: string) => {
  const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
  const fileName = `osm-map-${Math.abs(hashString(url))}.png`;
  return `${cacheDir}${fileName}`;
};

// Download tile peta jika belum ada di cache, lalu kembalikan URI lokalnya
const cacheMapFile = async (url: string): Promise<string | undefined> => {
  try {
    const fileUri = getMapCacheUri(url);
    console.log("[print] cache directories", {
      cacheDirectory: FileSystem.cacheDirectory,
      documentDirectory: FileSystem.documentDirectory,
      fileUri,
    });
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    console.log("[print] cache file info", { exists: fileInfo.exists, uri: fileInfo.uri });
    if (fileInfo.exists) {
      console.log("[print] map cache hit", fileUri);
      return fileUri;
    }

    console.log("[print] downloading map tile", url);
    const downloadResult = await FileSystem.downloadAsync(url, fileUri);
    console.log("[print] download result", downloadResult);
    if (downloadResult.status !== 200) {
      throw new Error(`tile download failed with status ${downloadResult.status}`);
    }

    const downloadedFileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
    if (!downloadedFileInfo.exists || downloadedFileInfo.size === 0) {
      throw new Error("tile download returned empty file");
    }

    console.log("[print] map cached", downloadResult.uri);
    return downloadResult.uri;
  } catch (error) {
    console.warn("[print] failed to cache map image", error, url);
    return undefined;
  }
};

// Buat HTML laporan PDF dengan format yang mengikuti `format_laporan.html`
const buildPdfHtml = (reports: ReportItem[]) => {
  const statusLabel =
    reports.length === 1 ? reports[0].status || "-" : "Semua";
  const rows = reports
    .map((report, index) => {
      const date = report.createdAt
        ? new Date(report.createdAt).toLocaleString("id-ID")
        : "-";
      const photoSrc = report.photoDataUrl || report.photoUrl || "";
      const photoCell = photoSrc
        ? `<div class="image-cell"><img src="${escapeHtml(photoSrc)}" alt="Foto laporan" width="160" height="120" /></div>`
        : "-";
      const tileInfo = report.latitude !== undefined && report.longitude !== undefined
        ? getOsmTileGrid(report.latitude, report.longitude)
        : undefined;
      const mapSrc = report.mapDataUrl ||
        (report.latitude !== undefined && report.longitude !== undefined
          ? getOsmTileUrl(report.latitude, report.longitude).url
          : "");
      const mapCell = mapSrc
        ? `<img class="map-img" src="${escapeHtml(mapSrc)}" alt="Peta lokasi" width="160" height="120" />`
        : "-";

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(report.petugasName || "Petugas")}</td>
          <td>${escapeHtml(report.categoryName || "-")}</td>
          <td>${escapeHtml(report.description || "-")}</td>
          <td>${escapeHtml(report.status || "submitted")}</td>
          <td>${escapeHtml(date)}</td>
          <td>${mapCell}</td>
          <td>${photoCell}</td>
        </tr>`;
    })
    .join("");

  const printedDate = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `<!DOCTYPE html>
  <html lang="id">
    <head>
      <meta charset="utf-8" />
      <style>
        @page { size: A4 landscape; margin: 16mm; }
        body { font-family: "Times New Roman", serif; color: #000; margin: 24px; }
        .header { display: flex; align-items: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .logo { width: 90px; height: 90px; border: 2px solid #000; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 20px; }
        .header-text { flex: 1; text-align: center; }
        .header-text h2, .header-text h3, .header-text p { margin: 2px; }
        .header-text h2 { font-size: 18px; text-transform: uppercase; }
        .header-text h3 { font-size: 14px; margin-top: 4px; }
        .header-text p { font-size: 12px; }
        .title { text-align: center; margin-top: 24px; margin-bottom: 16px; }
        .title h3 { margin: 0; text-decoration: underline; font-size: 16px; }
        .info { display: none; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
        table, th, td { border: 1px solid #000; }
        th, td { padding: 8px; font-size: 12px; word-wrap: break-word; vertical-align: top; }
        th { background-color: #f3f4f6; }
        th:nth-child(1), td:nth-child(1) { width: 3%; }
        th:nth-child(2), td:nth-child(2) { width: 10%; }
        th:nth-child(3), td:nth-child(3) { width: 10%; }
        th:nth-child(4), td:nth-child(4) { width: 24%; text-align: left; }
        th:nth-child(5), td:nth-child(5) { width: 8%; }
        th:nth-child(6), td:nth-child(6) { width: 8%; }
        th:nth-child(7), td:nth-child(7) { width: 20%; text-align: left; }
        th:nth-child(8), td:nth-child(8) { width: 17%; }
        .map-img { width: 160px; height: 120px; object-fit: cover; border-radius: 4px; display: block; }
        .image-cell { display: inline-block; width: 160px; height: 120px; overflow: hidden; }
        .image-cell img { width: 160px; height: 120px; object-fit: cover; display: block; border-radius: 4px; }
        .footer { width: 300px; margin-left: auto; margin-top: 44px; text-align: center; font-size: 12px; }
        .signature { margin-top: 60px; }
        @media print { body { margin: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">LOGO</div>
        <div class="header-text">
          <h2>DINAS PEKERJAAN UMUM DAN PENATAAN RUANG</h2>
          <h3>Bidang Monitoring Kegiatan Lapangan</h3>
          <p>Jl. Sultan Syarif Kasim No. XX Dumai</p>
          <p>Telp. (0765) XXXXXXX</p>
          <p>Email : pupr@dumai.go.id</p>
        </div>
      </div>
      <div class="title">
        <h3>LAPORAN MONITORING KEGIATAN</h3>
      </div>
      <div class="info">
        <p><strong>Status</strong> : ${escapeHtml(statusLabel)}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Petugas</th>
            <th>Kategori</th>
            <th>Deskripsi</th>
            <th>Status</th>
            <th>Tanggal</th>
            <th>Lokasi</th>
            <th>Foto</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">
        <p>Dumai, ${escapeHtml(printedDate)}</p>
        <p>Mengetahui,</p>
        <div class="signature">
          <p><strong>Administrator</strong></p>
        </div>
      </div>
    </body>
  </html>`;
};

export default function PrintReportsScreen() {
  // Data pengguna saat ini dari context otentikasi
  const { user } = useContext(AuthContext);
  // Daftar laporan yang dimuat dari backend
  const [reports, setReports] = useState<ReportItem[]>([]);
  // Teks filter pencarian laporan
  const [search, setSearch] = useState("");
  // Filter status (lowercase). Empty = no status filter applied.
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  // ID laporan yang dipilih untuk dicetak
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Status loading saat mengambil daftar laporan
  const [loading, setLoading] = useState(true);
  // Status sedang membuat PDF
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    // Ambil daftar laporan dari API saat komponen pertama kali dipasang
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

  // Hitung daftar laporan yang cocok berdasarkan kata kunci pencarian dan filter status
  const filteredReports = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    console.log("[print] filtering reports", { search: normalized, total: reports.length, statusFilters });

    const matchesSearch = (report: ReportItem) => {
      if (!normalized) return true;
      const haystack = [report.petugasName, report.categoryName, report.description, report.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    };

    const matchesStatus = (report: ReportItem) => {
      if (!statusFilters || statusFilters.length === 0) return true;
      return statusFilters.includes((report.status || "").toLowerCase());
    };

    return reports.filter((r) => matchesSearch(r) && matchesStatus(r));
  }, [reports, search, statusFilters]);

  // Toggle pemilihan laporan pada daftar cetak
  const toggleSelection = (reportId: string) => {
    setSelectedIds((prev) =>
      prev.includes(reportId) ? prev.filter((item) => item !== reportId) : [...prev, reportId]
    );
  };

  // Pilih semua laporan yang sedang ditampilkan atau batalkan pemilihannya
  const selectAll = () => {
    if (selectedIds.length === filteredReports.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(filteredReports.map((item) => item.id));
  };

  // Toggle status filter (completed/submitted)
  const toggleStatusFilter = (status: string) => {
    setStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  // Buat dan bagikan file PDF berdasarkan laporan yang dipilih
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
      const enrichedItems = await Promise.all(
        itemsToExport.map(async (report) => {
          let photoDataUrl = report.photoDataUrl;
          let mapCacheUri = report.mapCacheUri;
          let mapDataUrl = report.mapDataUrl;

          if (report.photoUrl && !photoDataUrl && !report.photoUrl.startsWith("data:")) {
            try {
              const response = await fetch(report.photoUrl);
              if (response.ok) {
                const blob = await response.blob();
                photoDataUrl = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = () => reject(new Error("failed to read image"));
                  reader.readAsDataURL(blob);
                });
              }
            } catch (error) {
              console.warn("[print] failed to embed photo", error);
            }
          }

          if (
            report.latitude !== undefined &&
            report.longitude !== undefined &&
            !mapCacheUri
          ) {
            const tileInfo = getOsmTileUrl(report.latitude, report.longitude);
            console.log("[print] map tile url", tileInfo.url, { latitude: report.latitude, longitude: report.longitude });
            mapCacheUri = await cacheMapFile(tileInfo.url);
            console.log("[print] map cache uri result", mapCacheUri);
          }

          if (mapCacheUri && !mapDataUrl) {
            try {
              const base64 = await FileSystem.readAsStringAsync(mapCacheUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              mapDataUrl = `data:image/png;base64,${base64}`;
              console.log("[print] map data url length", mapDataUrl.length);
              console.log("[print] map data url prefix", mapDataUrl.slice(0, 80));
            } catch (error) {
              console.warn("[print] failed to read cached map as base64", error, mapCacheUri);
            }
          }

          return { ...report, photoDataUrl, mapCacheUri, mapDataUrl };
        })
      );

      const html = buildPdfHtml(enrichedItems);
      console.log("[print] pdf html ready", html.length);
      console.log("[print] starting pdf generation");
      const file = await Print.printToFileAsync({ html, width: 842, height: 595 });
      console.log("[print] pdf created", file.uri);
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      console.log("[print] pdf file info", fileInfo);
      let canShare = false;
      try {
        canShare = await Sharing.isAvailableAsync();
      } catch (err) {
        console.warn("[print] Sharing.isAvailableAsync failed", err);
        canShare = false;
      }
      console.log("[print] share available", canShare);

      // Try normal sharing first. If not available, copy to cache and try again.
      const tryShare = async (uri: string) => {
        try {
          console.log("[print] starting share dialog", uri);
          const shareResult = await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: "Bagikan laporan PDF",
            UTI: "com.adobe.pdf",
          });
          console.log("[print] share result", shareResult);
          return true;
        } catch (err) {
          console.warn("[print] share failed", err);
          return false;
        }
      };

      let shared = false;
      if (canShare) {
        shared = await tryShare(file.uri);
      }

      if (!shared) {
        // fallback: copy file to a public cache location and try share again
        try {
          const destDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
          const dest = `${destDir}laporan-monitoring.pdf`;
          console.log("[print] copying pdf to", dest);
          await FileSystem.copyAsync({ from: file.uri, to: dest });
          const destInfo = await FileSystem.getInfoAsync(dest);
          console.log("[print] copied file info", destInfo);
          const shareOk = await tryShare(dest);
          if (!shareOk) {
            Alert.alert(
              "Berhasil membuat PDF",
              `File disimpan di: ${dest}`
            );
          }
        } catch (err) {
          console.warn("[print] fallback share failed", err);
          Alert.alert(
            "Gagal membagikan",
            `PDF dibuat tetapi tidak dapat dibagikan: ${file.uri}`
          );
        }
      }
    } catch (error) {
      Alert.alert("Gagal", "Tidak dapat membuat file PDF");
    } finally {
      setGenerating(false);
    }
  };

  // Render tampilan kartu untuk setiap laporan dalam daftar
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

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            statusFilters.includes("completed") && styles.filterButtonActive,
          ]}
          onPress={() => toggleStatusFilter("completed")}
        >
          <Ionicons
            name={statusFilters.includes("completed") ? "checkbox" : "square-outline"}
            size={16}
            color={statusFilters.includes("completed") ? "#ffffff" : "#2563eb"}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.filterButtonText, statusFilters.includes("completed") && styles.filterButtonTextActive]}>Selesai</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            statusFilters.includes("submitted") && styles.filterButtonActive,
          ]}
          onPress={() => toggleStatusFilter("submitted")}
        >
          <Ionicons
            name={statusFilters.includes("submitted") ? "checkbox" : "square-outline"}
            size={16}
            color={statusFilters.includes("submitted") ? "#ffffff" : "#2563eb"}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.filterButtonText, statusFilters.includes("submitted") && styles.filterButtonTextActive]}>Menunggu</Text>
        </TouchableOpacity>
      </View>

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
    color: "black",
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
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  filterButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  filterButtonText: {
    color: "#2563eb",
    fontWeight: "700",
    fontSize: 12,
  },
  filterButtonTextActive: {
    color: "#ffffff",
  },
});
