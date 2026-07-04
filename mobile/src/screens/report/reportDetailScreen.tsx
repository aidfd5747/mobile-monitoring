import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import api from "../../services/api";
import OpenStreetMapView from "../../components/OpenStreetMapView";

interface ReportDetailItem {
  id: string;
  petugasName?: string;
  categoryName?: string;
  categoryId?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
}

// Halaman detail untuk melihat dan mengubah status laporan tertentu
export default function ReportDetailScreen() {
  const route = useRoute<any>();
  // Data laporan yang ditampilkan di halaman detail
  const [report, setReport] = useState<ReportDetailItem | null>(route.params?.report ?? null);
  // Status loading awal jika data belum dikirim lewat parameter
  const [loading, setLoading] = useState(!route.params?.report);
  // Status pemrosesan permintaan update status laporan
  const [processing, setProcessing] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: route.params?.report?.latitude ?? -6.200000,
    longitude: route.params?.report?.longitude ?? 106.816666,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  });

  // Jika detail laporan tidak tersedia di params, ambil kembali dari backend
  useEffect(() => {
    const loadReport = async () => {
      if (route.params?.report) {
        setReport(route.params.report);
        setLoading(false);
        return;
      }

      if (!route.params?.reportId) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/reports");
        const foundReport = (response.data.reports || []).find((item: ReportDetailItem) => item.id === route.params.reportId);
        setReport(foundReport ?? null);
      } catch (error) {
        Alert.alert("Gagal", "Tidak bisa memuat detail laporan");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [route.params?.report, route.params?.reportId]);

  useEffect(() => {
    if (report?.latitude !== undefined && report?.longitude !== undefined) {
      setMapRegion((prev) => ({
        ...prev,
        latitude: report.latitude,
        longitude: report.longitude,
      }));
    }
  }, [report]);

  // Tandai laporan sebagai selesai dengan mengirim status ke backend
  const handleComplete = async () => {
    if (!report?.id) {
      console.log("[report] complete blocked: missing report id");
      return;
    }

    console.log("[report] updating status", { reportId: report.id, fromStatus: report.status });
    setProcessing(true);
    try {
      const response = await api.patch(`/reports/${report.id}/status`, { status: "completed" });
      console.log("[report] status update response", response.status, response.data);
      setReport((prev) => prev ? { ...prev, status: "completed" } : prev);
      Alert.alert("Berhasil", "Laporan telah ditandai selesai");
    } catch (error) {
      console.log("[report] status update failed", error);
      Alert.alert("Gagal", "Tidak bisa memperbarui status laporan");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Memuat detail laporan...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Detail laporan tidak tersedia.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Detail Laporan</Text>
        <Text style={styles.subtitle}>Tinjau informasi laporan dan lanjutkan prosesnya.</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>Nama Petugas</Text>
        <Text style={styles.value}>{report.petugasName || "-"}</Text>

        <Text style={styles.label}>Kategori</Text>
        <Text style={styles.value}>{report.categoryName || "-"}</Text>

        <Text style={styles.label}>Deskripsi</Text>
        <Text style={styles.value}>{report.description || "-"}</Text>

        <Text style={styles.label}>Status</Text>
        <Text style={[styles.value, report.status === "completed" ? styles.completed : styles.submitted]}>
          {report.status === "completed" ? "Completed" : "Submitted"}
        </Text>

        <Text style={styles.label}>Waktu Dibuat</Text>
        <Text style={styles.value}>{report.createdAt ? new Date(report.createdAt).toLocaleString("id-ID") : "-"}</Text>

        {report.latitude !== undefined && report.longitude !== undefined ? (
          <>
            <Text style={styles.label}>Lokasi</Text>
            <Text style={styles.value}>{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</Text>
          </>
        ) : null}

        <View style={styles.mapContainer}>
          <OpenStreetMapView
            style={styles.map}
            latitude={mapRegion.latitude}
            longitude={mapRegion.longitude}
            zoom={14}
            markerCoordinate={
              report.latitude !== undefined && report.longitude !== undefined
                ? { latitude: report.latitude, longitude: report.longitude }
                : null
            }
          />
          <Text style={styles.mapHint}>Ketuk peta untuk membuka OpenStreetMap</Text>
        </View>

        {report.photoUrl ? (
          <>
            <Text style={styles.label}>Foto</Text>
            <Image source={{ uri: report.photoUrl }} style={styles.photo} />
          </>
        ) : null}

        {report.status !== "completed" ? (
          <TouchableOpacity style={styles.button} onPress={handleComplete} disabled={processing}>
            {processing ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.buttonText}>Memproses...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Tandai selesai</Text>
            )}
          </TouchableOpacity>
        ) : null}
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  headerCard: {
    backgroundColor: "#2563eb",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 6,
  },
  subtitle: {
    color: "#dbeafe",
    fontSize: 13,
  },
  panel: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  label: {
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
  },
  value: {
    color: "#0f172a",
    marginTop: 4,
  },
  completed: {
    color: "#16a34a",
    fontWeight: "700",
  },
  submitted: {
    color: "#dc2626",
    fontWeight: "700",
  },
  mapContainer: {
    height: 250,
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  map: {
    flex: 1,
  },
  mapHint: {
    padding: 10,
    color: "#64748b",
    fontSize: 12,
    backgroundColor: "#f8fafc",
  },
  photo: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
  button: {
    marginTop: 18,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  loadingText: {
    marginTop: 10,
    color: "#64748b",
  },
  emptyText: {
    color: "#64748b",
  },
});
