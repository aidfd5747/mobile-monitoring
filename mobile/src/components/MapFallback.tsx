import { StyleSheet, Text, View } from "react-native";

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Coordinate = {
  latitude: number;
  longitude: number;
} | null;

type MapFallbackProps = {
  region: Region;
  onPress?: (event: any) => void;
  onRegionChangeComplete?: (region: Region) => void;
  markerCoordinate?: Coordinate;
  tileTemplate?: string;
  style?: any;
};

const mapModule = (() => {
  try {
    return require("react-native-maps");
  } catch (_error) {
    return null;
  }
})();

const MapView = mapModule?.default || mapModule;
const Marker = mapModule?.Marker;
const UrlTile = mapModule?.UrlTile;

export default function MapFallback({
  region,
  onPress,
  onRegionChangeComplete,
  markerCoordinate,
  tileTemplate,
  style,
}: MapFallbackProps) {
  if (!MapView || !Marker || !UrlTile) {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <Text style={styles.fallbackText}>Peta tidak tersedia saat ini.</Text>
        <Text style={styles.fallbackSubText}>
          Pastikan dependensi peta terpasang dan jalankan ulang aplikasi.
        </Text>
      </View>
    );
  }

  return (
    <MapView
      style={[styles.map, style]}
      region={region}
      onPress={onPress}
      onRegionChangeComplete={onRegionChangeComplete}
    >
      <UrlTile
        urlTemplate={tileTemplate ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png"}
        maximumZ={19}
        flipY={false}
      />
      {markerCoordinate ? <Marker coordinate={markerCoordinate} /> : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#e2e8f0",
  },
  fallbackText: {
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  fallbackSubText: {
    color: "#475569",
    textAlign: "center",
  },
  map: {
    flex: 1,
  },
});
