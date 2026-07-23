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
  Modal,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import api from "../../services/api";
import { AuthContext } from "../../context/authContext";
import { formatReportDate } from "../../utils/date";

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

const defaultLogoUri = Image.resolveAssetSource(require("../../assets/logo.png")).uri;

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
    xTile,
    yTile,
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

// Ambil daftar URL peta yang bisa dipilih untuk cache/fallback.
// Gunakan penyedia Carto basemaps untuk menghindari penggunaan server tile OpenStreetMap volunteer-run.
const getOsmMapSources = (latitude: number, longitude: number, zoom = 15) => {
  const tileInfo = getOsmTileGrid(latitude, longitude, zoom);
  const tileKey = `${zoom}/${tileInfo.xTile}/${tileInfo.yTile}.png`;
  const apiRoot = (process.env.EXPO_PUBLIC_API_URL || "https://mobile-monitoring-production.up.railway.app/api").replace(/\/api\/?$/, "");
  const proxyBase = `${apiRoot}/tiles`;
  const tileVariants = [
    `${proxyBase}/${zoom}/${tileInfo.xTile}/${tileInfo.yTile}.png`,
    `${proxyBase}/${zoom}/${tileInfo.xTile}/${tileInfo.yTile}.png`,
    `${proxyBase}/${zoom}/${tileInfo.xTile}/${tileInfo.yTile}.png`,
  ];

  return {
    urls: tileVariants,
  };
};

// Build proxy URLs for the 3x3 tile grid returned by getOsmTileGrid
const getProxyTileGrid = (latitude: number, longitude: number, zoom = 15) => {
  const tileInfo = getOsmTileGrid(latitude, longitude, zoom);
  const apiRoot = (process.env.EXPO_PUBLIC_API_URL || "https://mobile-monitoring-production.up.railway.app/api").replace(/\/api\/?$/, "");
  const proxyBase = `${apiRoot}/tiles`;

  // reconstruct urls corresponding to the 3x3 block used by getOsmTileGrid
  const xBase = tileInfo.xTile - 1;
  const yBase = tileInfo.yTile - 1;
  const urls = [
    `${proxyBase}/${zoom}/${xBase}/${yBase}.png`,
    `${proxyBase}/${zoom}/${xBase + 1}/${yBase}.png`,
    `${proxyBase}/${zoom}/${xBase + 2}/${yBase}.png`,
    `${proxyBase}/${zoom}/${xBase}/${yBase + 1}.png`,
    `${proxyBase}/${zoom}/${xBase + 1}/${yBase + 1}.png`,
    `${proxyBase}/${zoom}/${xBase + 2}/${yBase + 1}.png`,
    `${proxyBase}/${zoom}/${xBase}/${yBase + 2}.png`,
    `${proxyBase}/${zoom}/${xBase + 1}/${yBase + 2}.png`,
    `${proxyBase}/${zoom}/${xBase + 2}/${yBase + 2}.png`,
  ];

  return {
    urls,
    fractionX: tileInfo.fractionX,
    fractionY: tileInfo.fractionY,
  };
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

// Download a list of tile URLs, cache them locally and return their base64 content array.
const downloadTilesAsBase64 = async (urls: string[]): Promise<string[]> => {
  const placeholderBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="; // 1x1 transparent PNG
  const results: string[] = [];

  for (const url of urls) {
    try {
      const fileUri = getMapCacheUri(url);
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists) {
        // attempt download
        try {
          await FileSystem.downloadAsync(url, fileUri);
        } catch (err) {
          console.warn("[print] tile download failed", url, err);
        }
      }

      const saved = await FileSystem.getInfoAsync(fileUri);
      if (saved.exists) {
        const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
        results.push(base64);
        continue;
      }
    } catch (err) {
      console.warn("[print] tile processing failed", url, err);
    }

    // fallback placeholder
    results.push(placeholderBase64);
  }

  return results;
};

// Compose an inline SVG from nine base64 tiles and center-crop it to 160x120 with a marker at center.
const composeTilesToSvgDataUrl = (tileBase64s: string[], fractionX: number, fractionY: number) => {
  // tiles arranged left-to-right, top-to-bottom in tileBase64s (expect length 9)
  // big canvas size = 3 * 256 = 768
  const tileSize = 256;
  const bigSize = tileSize * 3; // 768

  // compute center pixel in the big canvas: (256 + xFrac*256, 256 + yFrac*256)
  const centerX = tileSize + fractionX * tileSize;
  const centerY = tileSize + fractionY * tileSize;

  const viewW = 160;
  const viewH = 120;
  const viewX = Math.max(0, centerX - viewW / 2);
  const viewY = Math.max(0, centerY - viewH / 2);

  // build image elements
  const images: string[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      const b64 = tileBase64s[idx] || "";
      const x = col * tileSize;
      const y = row * tileSize;
      images.push(`<image x="${x}" y="${y}" width="${tileSize}" height="${tileSize}" href="data:image/png;base64,${b64}" />`);
    }
  }

  // marker at center of view (relative to view box)
  const markerCx = viewW / 2;
  const markerCy = viewH / 2;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${viewW}" height="${viewH}" viewBox="${viewX} ${viewY} ${viewW} ${viewH}">
    <defs>
      <style> .pin { stroke: #fff; stroke-width: 2px; }</style>
    </defs>
    ${images.join("\n    ")}
    <g transform="translate(${viewX}, ${viewY})"></g>
    <circle cx="${viewX + markerCx}" cy="${viewY + markerCy}" r="8" fill="#ff3b30" class="pin" />
    <circle cx="${viewX + markerCx}" cy="${viewY + markerCy}" r="3" fill="#fff" />
  </svg>`;

  // encode as data url (URI-encoded to avoid btoa portability issues)
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return svgDataUrl;
};

// Buat HTML laporan PDF dengan format yang mengikuti `format_laporan.html`
const buildPdfHtml = (
  reports: ReportItem[],
  logoSrc?: string,
  filters?: {
    selectedYear?: string;
    selectedMonth?: string;
  }
) => {
  const rows = reports
    .map((report, index) => {
      const date = formatReportDate(report.createdAt);
      const photoSrc = report.photoDataUrl || report.photoUrl || "";
      const photoCell = photoSrc
        ? `<div class="image-cell"><img src="${escapeHtml(photoSrc)}" alt="Foto laporan" /></div>`
        : "-";

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(report.petugasName || "Petugas")}</td>
          <td>${escapeHtml(report.categoryName || "-")}</td>
          <td>${escapeHtml(report.description || "-")}</td>
          <td>${escapeHtml(date)}</td>
          <td>${photoCell}</td>
        </tr>`;
    })
    .join("");

  const printedDate = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const titleLabel =
    filters?.selectedYear && filters.selectedYear !== "All" && filters?.selectedMonth && filters.selectedMonth !== "All"
      ? `LAPORAN KEGIATAN BULAN ${filters.selectedMonth.toUpperCase()}`
      : filters?.selectedYear && filters.selectedYear !== "All"
        ? `LAPORAN KEGIATAN TAHUN ${filters.selectedYear}`
        : filters?.selectedMonth && filters.selectedMonth !== "All"
          ? `LAPORAN BULAN ${filters.selectedMonth.toUpperCase()}`
          : "LAPORAN KEGIATAN";

  return `<!DOCTYPE html>
  <html lang="id">
    <head>
      <meta charset="utf-8" />
      <style>
        @page { size: A4 landscape; margin: 16mm; }
        body { font-family: "Times New Roman", serif; color: #000; margin: 24px; }
        .header { display: flex; align-items: center; border-bottom: 3px solid #000; padding-bottom: 12px; margin-bottom: 20px; gap: 16px; }
        .logo { width: 92px; height: 92px; border: 2px solid #000; display: flex; align-items: center; justify-content: center; font-weight: bold; overflow: hidden; background: #fff; flex-shrink: 0; }
        .logo img { width: 100%; height: 100%; object-fit: contain; display: block; }
        .logo-placeholder { font-size: 12px; text-align: center; }
        .header-text { flex: 1; text-align: center; }
        .header-text h2, .header-text h3, .header-text p { margin: 2px; }
        .header-title { font-size: 11px; font-weight: 700; letter-spacing: 0.7px; margin-bottom: 3px; }
        .header-subtitle { font-size: 12px; font-weight: 700; margin-top: 3px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.4px; }
        .header-text h2 { font-size: 20px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.6px; }
        .header-text h3 { font-size: 14px; margin-top: 4px; }
        .header-text p { font-size: 11px; line-height: 1.3; }
        .kop-line { border-top: 1px solid #000; margin-top: 8px; }
        .doc-meta { display: flex; justify-content: space-between; align-items: flex-start; gap: 40px; margin-top: 10px; margin-bottom: 18px; }
        .doc-meta-left { width: 42%; font-size: 11px; line-height: 1.6; padding-top: 6px; }
        .doc-meta-left .field-row { display: flex; align-items: center; min-height: 24px; }
        .doc-meta-left .field-label { min-width: 72px; }
        .doc-meta-right { width: 20%; font-size: 11px; line-height: 1.5; text-align: left; margin-left: auto; padding-top: 2px; }
        .doc-meta-right .date-line { margin-bottom: 12px; font-weight: 700; }
        .doc-meta-right .recipient-block { margin-top: 8px; }
        .doc-meta-right .underline { display: inline-block; min-width: 110px; border-bottom: 1px solid #000; padding-bottom: 1px; }
        .title { text-align: center; margin-top: 10px; margin-bottom: 16px; }
        .title h3 { margin: 0; text-decoration: underline; font-size: 16px; }
        .info { display: none; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
        table, th, td { border: 1px solid #000; }
        th, td { padding: 8px; font-size: 12px; word-wrap: break-word; vertical-align: top; }
        th { background-color: #f3f4f6; }
        th:nth-child(1), td:nth-child(1) { width: 3%; }
        th:nth-child(2), td:nth-child(2) { width: 12%; }
        th:nth-child(3), td:nth-child(3) { width: 18%; text-align: left; }
        th:nth-child(4), td:nth-child(4) { width: 25%; }
        th:nth-child(5), td:nth-child(5) { width: 18%; }
        th:nth-child(6), td:nth-child(6) { width: 24%; }
        .map-img { width: 160px; height: 120px; object-fit: cover; border-radius: 4px; display: block; }
        .image-cell { display: block; width: 100%; max-width: 100%; overflow: hidden; }
        .image-cell img { width: 100%; height: auto; object-fit: cover; display: block; border-radius: 4px; }
        .footer-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-top: 44px; }
        .footer { width: 300px; text-align: center; font-size: 12px; }
        .footeradmin { width: 300px; text-align: center; font-size: 12px; }
        .signature { margin-top: 60px; }
        .signatureadmin { margin-top: 80px; }
        .spasi { margin-left: 16px; }
        @media print { body { margin: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">${logoSrc ? `<img src="${escapeHtml(logoSrc)}" alt="Logo instansi" />` : `<div class="logo-placeholder">LOGO</div>`}</div>
        <div class="header-text">
          <div class="header-title">PEMERINTAH KOTA DUMAI</div>
          <h2>DINAS PEKERJAAN UMUM</h2>
          <div class="header-subtitle">BIDANG BINA MARGA</div>
          <p>Jl. Tuanku Tambusai, Bagan Besar, Kecamatan Bukit Kapur, Kota Dumai, Riau</p>
          <p>Kode Pos 28826</p>
          <p>Email : pu.kotadumai@gmail.com</p>
        </div>
      </div>
      <div class="kop-line"></div>
      <div class="doc-meta">
        <div class="doc-meta-left">
          <div class="field-row"><span class="field-label">Nomor</span><span>:</span></div>
          <div class="field-row"><span class="field-label">Lampiran</span><span>:</span></div>
          <div class="field-row"><span class="field-label">Perihal</span><span>:</span></div>
        </div>
        <div class="doc-meta-right">
          <div class="date-line">Dumai, ${escapeHtml(printedDate)}</div>
          <div class="recipient-block">
            <div>Kepada</div>
            <div>Yth,</div>
            <div>Kepala Bidang Bina Marga</div>
            <div>di- </div>
            <div class="spasi">Dumai</div>
          </div>
        </div>
      </div>
      <div class="title">
        <h3>${titleLabel}</h3>
      </div>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Petugas</th>
            <th>Kategori</th>
            <th>Deskripsi</th>
            <th>Tanggal</th>
            <th>Foto</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer-row">
        <div class="footeradmin">
          <p>Dumai, ${escapeHtml(printedDate)}</p>
          <p>Dibuat Oleh,</p>
          <div class="signatureadmin">
            <p><strong>Admin</strong></p>
          </div>
        </div>
        <div class="footer">
          <p>Dumai, ${escapeHtml(printedDate)}</p>
          <p>Diketahui Oleh,</p>
          <p>Kepala Bidang Bina Marga</p>
          <div class="signature">
            <p><strong><u>Yomi Idriansyah, S.T</u></strong></p>
            <p>NIP. 198501014200904 1 001</p>
          </div>
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
  // ID laporan yang dipilih untuk dicetak
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Status loading saat mengambil daftar laporan
  const [loading, setLoading] = useState(true);
  // Status sedang membuat PDF
  const [generating, setGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState("Mengolah laporan...");
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

  const reportYears = Array.from(
    new Set(
      reports
        .filter((report) => (report.status || "").toLowerCase() === "completed")
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

    const matchesSearch = (report: ReportItem) => {
      if (!normalized) return true;
      const haystack = [report.petugasName, report.categoryName, report.description, report.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    };

    const matchesDateFilter = (report: ReportItem) => {
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
    };

    return reports.filter(
      (r) =>
        matchesSearch(r) &&
        (r.status || "").toLowerCase() === "completed" &&
        matchesDateFilter(r)
    );
  }, [reports, search, selectedYear, selectedMonth, selectedDay]);

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

  const savePdfToDevice = async (sourceUri: string, fileName: string) => {
    try {
      Alert.alert("Pilih folder penyimpanan", "Pilih folder Download agar file PDF tampil di folder unduhan perangkat Anda.");
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions.granted) {
        throw new Error("storage access denied");
      }

      const createdUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        fileName,
        "application/pdf"
      );

      const base64 = await FileSystem.readAsStringAsync(sourceUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await FileSystem.writeAsStringAsync(createdUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return createdUri;
    } catch (err) {
      console.warn("[print] save pdf to selected folder failed", err);
      const fallbackDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
      const fallbackPath = `${fallbackDir}${fileName}`;

      if (fallbackDir) {
        await FileSystem.makeDirectoryAsync(fallbackDir, { intermediates: true });
      }
      await FileSystem.deleteAsync(fallbackPath, { idempotent: true });
      await FileSystem.copyAsync({ from: sourceUri, to: fallbackPath });
      return fallbackPath;
    }
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
    setGeneratingMessage("Mengolah laporan...");
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
            !mapDataUrl
          ) {
            // build centered map image by downloading 3x3 tiles, composing into SVG and embedding as data URL
            try {
                const grid = getProxyTileGrid(report.latitude, report.longitude);
                console.log("[print] map tile urls", grid.urls);
                const tileBase64s = await downloadTilesAsBase64(grid.urls);
                mapDataUrl = composeTilesToSvgDataUrl(tileBase64s, grid.fractionX, grid.fractionY);
              console.log("[print] composed map data url length", mapDataUrl?.length);
            } catch (err) {
              console.warn("[print] failed to compose map image", err);
            }
          }

          return { ...report, photoDataUrl, mapCacheUri, mapDataUrl };
        })
      );

      setGeneratingMessage("Membuat file PDF...");
      const html = buildPdfHtml(enrichedItems, defaultLogoUri, {
        selectedYear,
        selectedMonth,
      });
      console.log("[print] pdf html ready", html.length);
      console.log("[print] starting pdf generation");
      const file = await Print.printToFileAsync({ html, width: 842, height: 595 });
      console.log("[print] pdf created", file.uri);
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      console.log("[print] pdf file info", fileInfo);

      try {
        setGeneratingMessage("Menyimpan PDF ke perangkat...");
        const destinationFileName = "Laporan Kegiatan.pdf";
        const dest = await savePdfToDevice(file.uri, destinationFileName);
        const destInfo = await FileSystem.getInfoAsync(dest);
        console.log("[print] saved pdf info", destInfo);
        Alert.alert("Berhasil", `PDF berhasil disimpan sebagai ${destinationFileName}\nLokasi: ${dest}`);
      } catch (err) {
        console.warn("[print] save pdf failed", err);
        Alert.alert("Gagal", "Tidak dapat menyimpan file PDF ke perangkat");
      }
    } catch (error) {
      Alert.alert("Gagal", "Tidak dapat membuat file PDF");
    } finally {
      setGenerating(false);
      setGeneratingMessage("Mengolah laporan...");
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
        placeholder="Cari laporan berdasarkan petugas atau kategori"
        placeholderTextColor="#94a3b8"
        returnKeyType="search"
        value={search}
        onChangeText={setSearch}
      />

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
              ).map((option, index) => {
                const isActive =
                  (openDropdown === "year" && selectedYear === option) ||
                  (openDropdown === "month" && selectedMonth === option) ||
                  (openDropdown === "day" && selectedDay === option);

                return (
                  <TouchableOpacity
                    key={`${openDropdown}-${option}-${index}`}
                    style={[styles.dropdownOption, isActive ? styles.dropdownOptionActive : null]}
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
                    <Text style={[styles.dropdownOptionText, isActive ? styles.dropdownOptionTextActive : null]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
            <View style={styles.loadingButtonContent}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.primaryButtonText}>Memproses...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Buat PDF</Text>
          )}
        </TouchableOpacity>
      </View>

      {generating ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>{generatingMessage}</Text>
        </View>
      ) : loading ? (
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
    textAlign: "center",
  },
  loadingButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
  dropdownOptionTextActive: {
    color: "#ffffff",
  },
});
