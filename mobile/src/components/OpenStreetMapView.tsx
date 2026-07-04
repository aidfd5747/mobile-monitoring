import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

type Coordinate = {
  latitude: number;
  longitude: number;
};

type OpenStreetMapViewProps = {
  latitude: number;
  longitude: number;
  zoom?: number;
  markerCoordinate?: Coordinate | null;
  interactive?: boolean;
  onCoordinateSelected?: (coordinate: Coordinate) => void;
  style?: any;
};

export default function OpenStreetMapView({
  latitude,
  longitude,
  zoom = 14,
  markerCoordinate,
  interactive = false,
  onCoordinateSelected,
  style,
}: OpenStreetMapViewProps) {
  const [loading, setLoading] = useState(true);

  const html = useMemo(() => {
    const marker = markerCoordinate
      ? `setMarker(${markerCoordinate.latitude}, ${markerCoordinate.longitude}); map.setView([${markerCoordinate.latitude}, ${markerCoordinate.longitude}], ${zoom});`
      : `setMarker(${latitude}, ${longitude});`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .leaflet-container { background: #f8fafc; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const initial = { lat: ${latitude}, lng: ${longitude} };
    const zoom = ${zoom};
    const interactive = ${interactive ? "true" : "false"};

    const map = L.map("map", {
      center: initial,
      zoom,
      zoomControl: true,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: false,
      tap: interactive,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const markerLayer = L.layerGroup().addTo(map);

    function setMarker(lat, lng) {
      markerLayer.clearLayers();
      L.marker([lat, lng]).addTo(markerLayer);
    }

    setMarker(initial.lat, initial.lng);

    if (interactive) {
      map.on("click", function (event) {
        const coords = event.latlng;
        setMarker(coords.lat, coords.lng);
        window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: coords.lat, longitude: coords.lng }));
      });
    }

    ${marker}
  </script>
</body>
</html>
`;
  }, [latitude, longitude, zoom, markerCoordinate, interactive]);

  const handleMessage = (event: WebViewMessageEvent) => {
    if (!onCoordinateSelected) {
      return;
    }

    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload?.latitude && payload?.longitude) {
        onCoordinateSelected({ latitude: payload.latitude, longitude: payload.longitude });
      }
    } catch {
      // ignore malformed messages
    }
  };

  return (
    <View style={[styles.container, style]}>
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#2563eb" />
        </View>
      ) : null}
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={handleMessage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    backgroundColor: "rgba(248,250,252,0.85)",
  },
});
