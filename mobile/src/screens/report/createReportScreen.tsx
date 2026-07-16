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
  Modal,
} from "react-native";
import { useContext, useRef, useState, useEffect } from "react";
import * as Location from "expo-location";
import { useRoute } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { AuthContext } from "../../context/authContext";
import { useLocation } from "../../hooks/useLocation";
import api from "../../services/api";
import OpenStreetMapView from "../../components/OpenStreetMapView";
import ImageWatermarker from "../../components/ImageWatermarker";

// Halaman untuk membuat laporan baru dengan foto, kategori, dan lokasi GPS
export default function CreateReportScreen() {
  const route = useRoute<any>();
  // Data pengguna yang membuat laporan
  const { user } = useContext(AuthContext);
  // Lokasi saat ini dari hook custom useLocation
  const { location, error: locationError, loading: locationLoading } = useLocation();
  // Input deskripsi laporan
  const [description, setDescription] = useState("");
  // Pilihan kategori laporan
  const [category, setCategory] = useState("inspection");
  const [customCategory, setCustomCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<Array<{ uri?: string; base64?: string; watermarkedBase64?: string }>>([]);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [showWatermarker, setShowWatermarker] = useState(false);
  const [addressParts, setAddressParts] = useState<any>({});
  const [watermarkAddress, setWatermarkAddress] = useState<any>(null);
  const watermarkAddressRef = useRef<any>(null);
  const previewUri = null;
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
    if (showWatermarker) {
      console.log('[report] showWatermarker=true, watermarkAddress:', watermarkAddress, 'addressParts:', addressParts, 'currentProcessingIndex:', currentProcessingIndex);
    }
  }, [showWatermarker]);

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
    if (!route.params?.autoCamera || photos.length > 0) {
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
  }, [route.params?.autoCamera, photos.length, cameraPermission?.granted, requestCameraPermission]);

  // watch device heading while camera is open to use for compass needle
  useEffect(() => {
    let sub: any = null;
    let isActive = true;
    if (showCamera) {
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;
          sub = await Location.watchHeadingAsync((heading) => {
            if (!isActive) return;
            if (heading && typeof heading.trueHeading === 'number') {
              setHeading(heading.trueHeading);
            } else if (heading && typeof heading.magHeading === 'number') {
              setHeading(heading.magHeading);
            }
          });
        } catch (err) {
          // ignore
        }
      })();
    }

    return () => {
      isActive = false;
      if (sub && typeof sub.remove === 'function') sub.remove();
    };
  }, [showCamera]);

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

    // replace photos list with the latest photo (single-photo mode)
    setPhotos([{ uri: result.uri, base64: result.base64 }]);
    setCurrentProcessingIndex(0);
    if (result.width && result.height) {
      setImageAspectRatio(result.width / result.height);
    } else {
      setImageAspectRatio(null);
    }
    // perform reverse geocoding and watermarking then show preview
    try {
      let lat = selectedCoordinate?.latitude ?? location?.coords.latitude;
      let lon = selectedCoordinate?.longitude ?? location?.coords.longitude;

      if ((lat == null || lon == null) && !locationError) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            lat = current.coords.latitude;
            lon = current.coords.longitude;
            if (!selectedCoordinate) {
              const coords = { latitude: lat, longitude: lon };
              setSelectedCoordinate(coords);
              setMapRegion((prev) => ({ ...prev, ...coords }));
            }
          } else {
            Alert.alert('Izin lokasi dibutuhkan', 'Izinkan akses lokasi untuk mendapatkan alamat otomatis.');
          }
        } catch (err) {
          console.warn('[report] fallback GPS fetch failed', err);
        }
      }

      const resolvedAddress = {
        road: '',
        suburb: '',
        city: '',
        state: '',
        postcode: '',
        latitude: lat,
        longitude: lon,
      };

      if (lat && lon) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=id&lat=${lat}&lon=${lon}`,
            { headers: { 'User-Agent': 'mobile-monitoring/1.0' } }
          );
          if (res.ok) {
            const json = await res.json();
            const addr = json.address || {};
            const displayNameParts = (json.display_name || '').split(',').map((part: string) => part.trim()).filter(Boolean);
            let nextAddress = {
              ...resolvedAddress,
              road: addr.road || addr.pedestrian || addr.footway || addr.cycleway || addr.path || addr.residential || addr.neighbourhood || addr.amenity || displayNameParts[0] || '',
              suburb: addr.suburb || addr.neighbourhood || addr.city_district || addr.district || addr.county || addr.municipality || addr.region || displayNameParts[1] || '',
              city: addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state_district || addr.region || displayNameParts[2] || '',
              state: addr.state || addr.region || addr.province || addr.state_district || displayNameParts[3] || '',
              postcode: addr.postcode || '',
            };

            const isEmptyDetails = !nextAddress.road && !nextAddress.suburb && !nextAddress.city && !nextAddress.state;
            if (isEmptyDetails) {
                try {
                const photonRes = await fetch(
                  `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`
                );
                if (photonRes.ok) {
                  const photonJson = await photonRes.json();
                  const props = photonJson.features?.[0]?.properties || {};
                  nextAddress = {
                    ...nextAddress,
                    road: nextAddress.road || props.street || props.name || props.housenumber || '',
                    suburb: nextAddress.suburb || props.suburb || props.district || props.neighbourhood || props.city_district || '',
                    city: nextAddress.city || props.city || props.town || props.village || props.state || '',
                    state: nextAddress.state || props.state || props.region || '',
                    postcode: nextAddress.postcode || props.postcode || props.postcode || '',
                  };
                }
              } catch (photonErr) {
                console.warn('[report] photon fallback failed', photonErr);
              }
            }

            // If still empty, try Overpass to find nearby named ways/nodes (street/place)
            const stillEmpty = !nextAddress.road && !nextAddress.suburb && !nextAddress.city && !nextAddress.state;
            if (stillEmpty) {
                try {
                const overQ = `[out:json][timeout:25];(way(around:1000,${lat},${lon})["name"];node(around:1000,${lat},${lon})["addr:street"];way(around:1000,${lat},${lon})["highway"];node(around:1000,${lat},${lon})["place"];);out center;`;
                const overRes = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: overQ });
                if (overRes.ok) {
                  const overJson = await overRes.json();
                  const elements = overJson.elements || [];
                  // Prefer elements that contain address-like tags (addr:street, name)
                  let chosenTags: any = null;
                  for (const e of elements) {
                    if (e && e.tags) {
                      const t = e.tags;
                      if (t['addr:street'] || t.name) {
                        chosenTags = t;
                        break;
                      }
                    }
                  }
                  // fallback: pick first element that has any tags
                  if (!chosenTags) {
                    const anyWithTags = elements.find((e: any) => e && e.tags && Object.keys(e.tags).length > 0);
                    chosenTags = anyWithTags ? anyWithTags.tags : {};
                  }
                  console.log('[report] overpass chosen tags', chosenTags);
                  const tags = chosenTags || {};
                  if (tags && Object.keys(tags).length > 0) {
                    nextAddress = {
                      ...nextAddress,
                      road: nextAddress.road || tags['addr:street'] || tags.name || tags['ref'] || '',
                      suburb: nextAddress.suburb || tags.suburb || tags.district || tags.neighbourhood || '',
                      city: nextAddress.city || tags.city || tags.town || tags.village || tags.county || '',
                      state: nextAddress.state || tags.state || tags.region || '',
                      postcode: nextAddress.postcode || tags.postcode || '',
                    };
                  }
                }
              } catch (overErr) {
                console.warn('[report] overpass fallback failed', overErr);
              }
            }

              setAddressParts(nextAddress);
              setWatermarkAddress(nextAddress);
              watermarkAddressRef.current = nextAddress;
              console.log('[report] resolvedAddress (from reverse)', nextAddress);
          } else {
            setAddressParts(resolvedAddress);
            setWatermarkAddress(resolvedAddress);
            watermarkAddressRef.current = resolvedAddress;
            console.log('[report] resolvedAddress (fallback)', resolvedAddress);
          }
        } catch (err) {
          console.warn('[report] reverse geocode failed', err);
          setAddressParts(resolvedAddress);
          setWatermarkAddress(resolvedAddress);
          watermarkAddressRef.current = resolvedAddress;
          console.log('[report] resolvedAddress (error path)', resolvedAddress);
        }
      } else {
        setAddressParts(resolvedAddress);
        setWatermarkAddress(resolvedAddress);
        watermarkAddressRef.current = resolvedAddress;
        console.log('[report] resolvedAddress (no coords)', resolvedAddress);
      }

      setShowCamera(false);
      console.log('[report] opening watermarker', { currentProcessingIndex, photosLength: photos.length, watermarkAddress, watermarkAddressRef: watermarkAddressRef.current });
      setShowWatermarker(true);
      scrollToBottom();
    } catch (err) {
      setShowCamera(false);
      // if watermarking failed, leave photo in list as-is
      scrollToBottom();
    }
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

  // Local state: kept for backwards compatibility but not used as full-screen preview
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);

  // Kirim data laporan ke backend setelah validasi input
  const handleSubmit = async () => {
    console.log("[report] submit started", { description, category, customCategory, photos: photos.length, selectedCoordinate });

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

      const firstPhoto = photos[0];
      const payload = {
        petugasId: user?.id || "unknown",
        petugasName: user?.nama || "Petugas",
        categoryId: category,
        categoryName: resolvedCategoryName,
        description,
        photoBase64: (firstPhoto?.watermarkedBase64 || firstPhoto?.base64) || undefined,
        photoName: firstPhoto ? `reports/${Date.now()}.jpg` : undefined,
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
      setPhotos([]);
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
        />

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
          <Text style={styles.imageButtonText}>{photos.length ? "Ambil ulang foto" : "Ambil foto"}</Text>
        </TouchableOpacity>

        {/* Render all photos on the create page (no separate preview modal) */}
        {photos.length > 0 ? (
          photos.length === 1 ? (
            (() => {
              const p = photos[0];
              const src = p.watermarkedBase64
                ? `data:image/jpeg;base64,${p.watermarkedBase64}`
                : p.uri
                ? p.uri
                : p.base64
                ? `data:image/jpeg;base64,${p.base64}`
                : undefined;
              return src ? (
                <Image
                  source={{ uri: src }}
                  style={[
                    styles.fullWidthImage,
                    imageAspectRatio ? { aspectRatio: imageAspectRatio } : { height: 380 },
                  ]}
                  resizeMode="contain"
                />
              ) : null;
            })()
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {photos.map((p, idx) => {
                const src = p.watermarkedBase64
                  ? `data:image/jpeg;base64,${p.watermarkedBase64}`
                  : p.uri
                  ? p.uri
                  : p.base64
                  ? `data:image/jpeg;base64,${p.base64}`
                  : undefined;
                return src ? (
                  <Image key={`${idx}-${p.uri || idx}`} source={{ uri: src }} style={styles.previewImage} />
                ) : null;
              })}
            </ScrollView>
          )
        ) : null}

        {/* No full-screen preview modal anymore */}

        <Modal visible={showWatermarker} animationType="fade" onRequestClose={() => setShowWatermarker(false)}>
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            {currentProcessingIndex !== null && photos[currentProcessingIndex]?.base64 ? (
              <ImageWatermarker
                photoBase64={photos[currentProcessingIndex]!.base64!}
                heading={heading}
                dateStr={new Date().toLocaleString('id-ID')}
                address={watermarkAddressRef.current || watermarkAddress || addressParts}
                onDone={(newBase64) => {
                  // update the specific photo with watermarked base64
                  setPhotos((prev) => {
                    const next = [...prev];
                    if (next[currentProcessingIndex!] ) {
                      next[currentProcessingIndex!] = {
                        ...next[currentProcessingIndex!],
                        watermarkedBase64: newBase64,
                      };
                    }
                    return next;
                  });
                  setShowWatermarker(false);
                  setCurrentProcessingIndex(null);
                }}
                onError={(err) => {
                  console.warn('[watermarker] error', err);
                  // fallback: keep original base64 as watermarked so UI shows image
                  setPhotos((prev) => {
                    const next = [...prev];
                    if (next[currentProcessingIndex!]) {
                      next[currentProcessingIndex!] = {
                        ...next[currentProcessingIndex!],
                        watermarkedBase64: next[currentProcessingIndex!].base64,
                      };
                    }
                    return next;
                  });
                  setShowWatermarker(false);
                  setCurrentProcessingIndex(null);
                }}
              />
            ) : null}
          </View>
        </Modal>

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
          <Text style={styles.mapLabel}>
            {photos.length ? "Lokasi dikunci setelah foto diambil" : "Pilih lokasi di peta"}
          </Text>
          <OpenStreetMapView
            style={styles.map}
            latitude={mapRegion.latitude}
            longitude={mapRegion.longitude}
            zoom={14}
            interactive={photos.length === 0}
            markerCoordinate={selectedCoordinate}
            onCoordinateSelected={photos.length === 0 ? (coordinate) => setSelectedCoordinate(coordinate) : undefined}
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
    color:"black"
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
    color: "black",
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
    width: 240,
    height: 180,
    borderRadius: 12,
    marginBottom: 14,
    marginRight: 12,
  },
  fullWidthImage: {
    width: "100%",
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#000',
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
  previewModal: {
    flex: 1,
    backgroundColor: "#000",
    padding: 16,
    justifyContent: "center",
  },
  fullImage: {
    width: "100%",
    height: "80%",
    marginBottom: 20,
  },
  previewActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
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