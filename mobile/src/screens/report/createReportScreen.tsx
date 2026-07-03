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
import MapView, { Marker, UrlTile, MapPressEvent } from "react-native-maps";
import { useContext, useRef, useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import { AuthContext } from "../../context/authContext";
import { useLocation } from "../../hooks/useLocation";
import api from "../../services/api";

export default function CreateReportScreen() {
  const { user } = useContext(AuthContext);
  const { location, error: locationError } = useLocation();
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("inspection");
  const [customCategory, setCustomCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [selectedCoordinate, setSelectedCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: -6.200000,
    longitude: 106.816666,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  });
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

  const pickImage = async () => {
    Alert.alert("Pilih sumber foto", "Ambil foto langsung dari kamera atau pilih dari galeri", [
      { text: "Batal", style: "cancel" },
      {
        text: "Kamera",
        onPress: async () => {
          const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
          if (!cameraPermission.granted) {
            Alert.alert("Izin dibutuhkan", "Izinkan akses kamera untuk mengambil foto");
            return;
          }

          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
            base64: true,
          });

          if (result.canceled) {
            return;
          }

          const asset = result.assets?.[0];
          if (!asset?.uri || !asset.base64) {
            Alert.alert("Gagal", "Foto tidak bisa dibaca");
            return;
          }

          setPhotoUri(asset.uri);
          setPhotoBase64(asset.base64);
          scrollToBottom();
        },
      },
      {
        text: "Galeri",
        onPress: async () => {
          const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!mediaPermission.granted) {
            Alert.alert("Izin dibutuhkan", "Izinkan akses galeri untuk memilih foto");
            return;
          }

          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
            base64: true,
            selectionLimit: 1,
          });

          if (result.canceled) {
            return;
          }

          const asset = result.assets?.[0];
          if (!asset?.uri || !asset.base64) {
            Alert.alert("Gagal", "Foto tidak bisa dibaca");
            return;
          }

          setPhotoUri(asset.uri);
          setPhotoBase64(asset.base64);
          scrollToBottom();
        },
      },
    ]);
  };

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
          <Text style={styles.imageButtonText}>{photoUri ? "Ganti foto" : "Pilih foto"}</Text>
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
          <MapView
            style={styles.map}
            region={mapRegion}
            onPress={(event: MapPressEvent) => {
              setSelectedCoordinate(event.nativeEvent.coordinate);
            }}
            onRegionChangeComplete={(region) => setMapRegion(region)}
          >
            <UrlTile
              urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maximumZ={19}
              flipY={false}
            />
            {selectedCoordinate ? <Marker coordinate={selectedCoordinate} /> : null}
          </MapView>
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
  imageButton: {
    backgroundColor: "#e0e7ff",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  imageButtonText: {
    color: "#3730a3",
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