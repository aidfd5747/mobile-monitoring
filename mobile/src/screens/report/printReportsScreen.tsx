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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getOsmTileGrid = (latitude: number, longitude: number, zoom = 15) => {
  const latRad = (latitude * Math.PI) / 180;
  const n = 2 ** zoom;
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

const getOsmTileUrl = (latitude: number, longitude: number, zoom = 15) => {
  const tileInfo = getOsmTileGrid(latitude, longitude, zoom);
  return { url: tileInfo.urls[4] };
};

const hashString = (value: string) =>
  value.split("").reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 0);

const getMapCacheUri = (url: string) => {
  const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
  const fileName = `osm-map-${Math.abs(hashString(url))}.png`;
  return `${cacheDir}${fileName}`;
};

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

const buildPdfHtml = (reports: ReportItem[]) => {
  const rows = reports
    .map((report, index) => {
      const date = report.createdAt
        ? new Date(report.createdAt).toLocaleString("id-ID")
        : "-";
      const photoSrc = report.photoDataUrl || report.photoUrl || "";
      const photoCell = photoSrc
        ? `<div class="image-cell"><img src="${escapeHtml(photoSrc)}" alt="Foto laporan" width="180" height="115" /></div>`
        : "-";
      const tileInfo = report.latitude !== undefined && report.longitude !== undefined
        ? getOsmTileGrid(report.latitude, report.longitude)
        : undefined;
      const mapCell = report.latitude !== undefined && report.longitude !== undefined
        ? `<div class="map-wrapper">
            <div class="tile-grid" style="transform: translate(${tileInfo?.translateX}px, ${tileInfo?.translateY}px);">
              ${tileInfo?.urls.map((url, index) => `<img class="tile tile-${index + 1}" src="${escapeHtml(url)}" alt="" />`).join("")}
            </div>
            <span class="marker"></span>
          </div>`
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

  return `<!DOCTYPE html>
  <html lang="id">
    <head>
      <meta charset="utf-8" />
      <style>
        @page { size: A4 landscape; margin: 16mm; }
        body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
        h1 { font-size: 22px; margin-bottom: 8px; }
        p { color: #475569; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; table-layout: fixed; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left; vertical-align: top; word-wrap: break-word; }
        th { background-color: #eff6ff; }
        th:nth-child(7), td:nth-child(7) { width: 180px; }
        th:nth-child(8), td:nth-child(8) { width: 180px; }
        .map-wrapper { position: relative; width: 180px; height: 115px; overflow: hidden; border-radius: 6px; }
        .tile-grid { position: absolute; width: 768px; height: 768px; top: 0; left: 0; }
        .tile { position: absolute; width: 256px; height: 256px; }
        .tile-1 { left: 0; top: 0; }
        .tile-2 { left: 256px; top: 0; }
        .tile-3 { left: 512px; top: 0; }
        .tile-4 { left: 0; top: 256px; }
        .tile-5 { left: 256px; top: 256px; }
        .tile-6 { left: 512px; top: 256px; }
        .tile-7 { left: 0; top: 512px; }
        .tile-8 { left: 256px; top: 512px; }
        .tile-9 { left: 512px; top: 512px; }
        .marker { position: absolute; left: 50%; top: 50%; width: 14px; height: 14px; background: #dc2626; border: 2px solid #ffffff; border-radius: 50%; transform: translate(-50%, -50%); }
        .image-cell { display: inline-block; width: 100%; max-width: 180px; height: 115px; overflow: hidden; }
        .image-cell img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 6px; }
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
            <th>Lokasi</th>
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
      const canShare = await Sharing.isAvailableAsync();
      console.log("[print] share available", canShare);
      if (!canShare) {
        throw new Error("Sharing is not available on this device");
      }
      console.log("[print] starting share dialog");
      const shareResult = await Sharing.shareAsync(file.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Bagikan laporan PDF",
        UTI: "com.adobe.pdf",
      });
      console.log("[print] share result", shareResult);
      console.log("[print] share complete");
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
