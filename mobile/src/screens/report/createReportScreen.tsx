import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useContext, useRef, useState, useEffect } from "react";
import { useRoute } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { AuthContext } from "../../context/authContext";
import { useLocation } from "../../hooks/useLocation";
import api from "../../services/api";
import OpenStreetMapView from "../../components/OpenStreetMapView";

// Halaman untuk membuat laporan baru dengan foto, kategori, dan lokasi GPS
export default function CreateReportScreen() {
  const route = useRoute<any>();
  // Data pengguna yang membuat laporan
  const { user } = useContext(AuthContext);
  // Lokasi saat ini dari hook custom useLocation
  const { location, error: locationError } = useLocation();
  // Input deskripsi laporan
  const [description, setDescription] = useState("");
  // Pilihan kategori laporan
  const [category, setCategory] = useState("inspection");
  const [customCategory, setCustomCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [selectedCoordinate, setSelectedCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: -6.200000,
    longitude: 106.816666,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  });
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 250);
  };

  useEffect(() => {
    if (!selectedCoordinate && location) {
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setSelectedCoordinate(coords);
      setMapRegion((prev) => ({
        ...prev,
        ...coords,
      }));
    }
  }, [location, selectedCoordinate]);

  useEffect(() => {
    if (selectedCoordinate) {
      setMapRegion((prev) => ({
        ...prev,
        latitude: selectedCoordinate.latitude,
        longitude: selectedCoordinate.longitude,
      }));
    }
  }, [selectedCoordinate]);

  useEffect(() => {
    if (!route.params?.autoCamera || photoUri) {
      return;
    }

    const openCameraImmediately = async () => {
      if (!cameraPermission?.granted) {
        const requested = await requestCameraPermission();
        if (!requested.granted) {
          Alert.alert("Izin dibutuhkan", "Izinkan akses kamera untuk mengambil foto");
          return;
        }
      }

      setShowCamera(true);
    };

    openCameraImmediately();
  }, [route.params?.autoCamera, photoUri, cameraPermission?.granted, requestCameraPermission]);

  const takePhoto = async () => {
    if (!cameraPermission?.granted) {
      const requested = await requestCameraPermission();
      if (!requested.granted) {
        Alert.alert("Izin dibutuhkan", "Izinkan akses kamera untuk mengambil foto");
        return;
      }
    }

    const result = await cameraRef.current?.takePictureAsync({
      quality: 0.8,
      base64: true,
      skipProcessing: true,
    });

    if (!result?.uri || !result.base64) {
      Alert.alert("Gagal", "Foto tidak bisa dibaca");
      return;
    }

    setPhotoUri(result.uri);
    setPhotoBase64(result.base64);
    setShowCamera(false);
    scrollToBottom();
  };

  // Ambil foto melalui kamera dan simpan sebagai base64
  const pickImage = async () => {
    if (!cameraPermission?.granted) {
      const requested = await requestCameraPermission();
      if (!requested.granted) {
        Alert.alert("Izin dibutuhkan", "Izinkan akses kamera untuk mengambil foto");
        return;
      }
    }

    setShowCamera(true);
  };

  // Kirim data laporan ke backend setelah validasi input
  const handleSubmit = async () => {
    console.log("[report] submit started", { description, category, customCategory, photoUri: !!photoUri, selectedCoordinate });

    if (!description.trim()) {
      console.log("[report] submit blocked: empty description");
      Alert.alert("Data belum lengkap", "Isi deskripsi kegiatan");
      return;
    }

    if (!selectedCoordinate) {
      Alert.alert("Pilih lokasi", "Tap pada peta untuk memilih lokasi aktivitas");
      return;
    }

    setLoading(true);
    try {
      const resolvedCategoryName = customCategory.trim()
        ? customCategory.trim()
        : category === "inspection"
          ? "Inspeksi Lapangan"
          : category === "visit"
            ? "Kunjungan Petugas"
            : "Pemeliharaan";

      const payload = {
        petugasId: user?.id || "unknown",
        petugasName: user?.nama || "Petugas",
        categoryId: category,
        categoryName: resolvedCategoryName,
        description,
        photoBase64: photoBase64 || undefined,
        photoName: photoBase64 ? `reports/${Date.now()}.jpg` : undefined,
        latitude: selectedCoordinate.latitude,
        longitude: selectedCoordinate.longitude,
        status: "submitted",
      };

      console.log("[report] sending payload", payload);
      const response = await api.post("/reports", payload);
      console.log("[report] submit response", response.status, response.data);
      Alert.alert("Berhasil", "Laporan berhasil dikirim");
      setDescription("");
      setCustomCategory("");
      setCategory("inspection");
      setPhotoUri(null);
      setPhotoBase64(null);
    } catch (err: any) {
      const message = err?.response?.data?.message || "Laporan gagal dikirim";
      Alert.alert("Gagal", message);
    } finally {
      setLoading(false);
    }
  };

  if (showCamera) {
    return (
      <View style={styles.cameraScreen}>
        <CameraView
          ref={cameraRef}
          style={styles.cameraView}
          facing="back"
        >
          <View style={styles.frameOverlay} />

          <View style={styles.overlayTopLeft}>
            <Text style={styles.overlayCompass}>N</Text>
            <Text style={styles.overlayCompassLabel}>Compass</Text>
          </View>

          <View style={styles.overlayBottomLeft}>
            <View style={styles.mapBadge}>
              <View style={styles.mapIconWrap}>
                <Text style={styles.mapBadgeIcon}>⌖</Text>
              </View>
              <View>
                <Text style={styles.mapBadgeTitle}>Map</Text>
                <Text style={styles.mapBadgeText}>
                  {selectedCoordinate
                    ? `${selectedCoordinate.latitude.toFixed(4)}, ${selectedCoordinate.longitude.toFixed(4)}`
                    : "Lokasi aktif"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.overlayBottomRight}>
            <Text style={styles.watermarkText}>MOBILE MONITORING</Text>
          </View>

          <View style={styles.cameraCaptureBar}>
            <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCamera(false)}>
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={[styles.container, { paddingBottom: 140 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerCard}>
        <Text style={styles.title}>Buat Laporan Aktivitas</Text>
        <Text style={styles.subtitle}>Tambahkan detail kegiatan, foto, dan lokasi GPS untuk monitoring lapangan.</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>Kategori</Text>
        <TextInput
          style={styles.input}
          placeholder="Masukkan kategori sendiri"
          value={customCategory}
          onChangeText={setCustomCategory}
        />
        <Text style={styles.helperText}>Kosongkan jika ingin memakai kategori default.</Text>

        <Text style={styles.label}>Deskripsi kegiatan</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={5}
          placeholder="Jelaskan pekerjaan yang dilakukan"
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Foto aktivitas</Text>
        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          <Text style={styles.imageButtonText}>{photoUri ? "Ambil ulang foto" : "Ambil foto"}</Text>
        </TouchableOpacity>
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.previewImage} /> : null}

        <Text style={styles.label}>Lokasi GPS</Text>
        <TextInput
          style={styles.input}
          value={selectedCoordinate
            ? `${selectedCoordinate.latitude.toFixed(6)}, ${selectedCoordinate.longitude.toFixed(6)}`
            : location
              ? `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`
              : "Mencari lokasi..."}
          editable={false}
        />
        {locationError ? <Text style={styles.helper}>{locationError}</Text> : null}

        <View style={styles.mapContainer}>
          <Text style={styles.mapLabel}>Pilih lokasi di peta</Text>
          <OpenStreetMapView
            style={styles.map}
            latitude={mapRegion.latitude}
            longitude={mapRegion.longitude}
            zoom={14}
            interactive
            markerCoordinate={selectedCoordinate}
            onCoordinateSelected={(coordinate) => setSelectedCoordinate(coordinate)}
          />
        </View>

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.buttonText}>Mengirim...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Kirim Laporan</Text>
          )}
        </TouchableOpacity>
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
    fontSize: 13,
    color: "#dbeafe",
    lineHeight: 18,
  },
  panel: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    backgroundColor: "#ffffff",
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  helper: {
    color: "#dc2626",
    marginBottom: 10,
  },
  helperText: {
    color: "#64748b",
    marginTop: -8,
    marginBottom: 12,
    fontSize: 12,
  },
  mapContainer: {
    height: 300,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  mapLabel: {
    padding: 10,
    backgroundColor: "#f8fafc",
    color: "#334155",
    fontWeight: "700",
  },
  map: {
    flex: 1,
  },
  cameraScreen: {
    flex: 1,
    backgroundColor: "#020617",
  },
  cameraView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  frameOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
    bottom: 12,
    left: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.45)",
    zIndex: 1,
  },
  overlayTopLeft: {
    position: "absolute",
    top: 26,
    left: 20,
    zIndex: 2,
    backgroundColor: "rgba(15, 23, 42, 0.62)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: 72,
  },
  overlayCompass: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 20,
    lineHeight: 20,
  },
  overlayCompassLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 9,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  overlayBottomLeft: {
    position: "absolute",
    bottom: 96,
    left: 18,
    zIndex: 2,
  },
  mapBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    minWidth: 172,
  },
  mapIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },
  mapBadgeIcon: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  mapBadgeTitle: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  mapBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    marginTop: 1,
  },
  overlayBottomRight: {
    position: "absolute",
    right: 20,
    bottom: 96,
    zIndex: 2,
    backgroundColor: "rgba(15, 23, 42, 0.52)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  watermarkText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  cameraCaptureBar: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(37, 99, 235, 0.5)",
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563eb",
  },
  cancelButton: {
    position: "absolute",
    right: 20,
    bottom: 24,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  imageButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  imageButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 14,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.8,
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
});