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
import { useContext, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { AuthContext } from "../../context/authContext";
import { useLocation } from "../../hooks/useLocation";
import api from "../../services/api";

export default function CreateReportScreen() {
  const { user } = useContext(AuthContext);
  const { location, error: locationError } = useLocation();
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("inspection");
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Izin dibutuhkan", "Izinkan akses foto untuk melampirkan gambar");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const fileUri = result.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: "base64",
      });

      setPhotoUri(fileUri);
      setPhotoBase64(base64);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert("Data belum lengkap", "Isi deskripsi kegiatan");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        petugasId: user?.id || "unknown",
        petugasName: user?.nama || "Petugas",
        categoryId: category,
        categoryName: category === "inspection" ? "Inspeksi Lapangan" : category === "visit" ? "Kunjungan Petugas" : "Pemeliharaan",
        description,
        photoUrl: photoUri || "",
        photoBase64: photoBase64 || undefined,
        photoName: photoUri ? `reports/${Date.now()}.jpg` : undefined,
        latitude: location?.coords.latitude || 0,
        longitude: location?.coords.longitude || 0,
        status: "submitted",
      };

      await api.post("/reports", payload);
      Alert.alert("Berhasil", "Laporan berhasil dikirim");
      setDescription("");
      setPhotoUri(null);
      setPhotoBase64(null);
    } catch (err) {
      Alert.alert("Gagal", "Laporan gagal dikirim");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Buat Laporan Aktivitas</Text>
        <Text style={styles.subtitle}>Tambahkan detail kegiatan, foto, dan lokasi GPS untuk monitoring lapangan.</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>Kategori</Text>
        <TextInput
          style={styles.input}
          value={category === "inspection" ? "Inspeksi Lapangan" : category === "visit" ? "Kunjungan Petugas" : "Pemeliharaan"}
          editable={false}
        />

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
          value={location ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}` : "Mencari lokasi..."}
          editable={false}
        />
        {locationError ? <Text style={styles.helper}>{locationError}</Text> : null}

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