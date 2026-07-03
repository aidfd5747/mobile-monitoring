// useLocation.ts
// Hook custom untuk mengambil lokasi GPS device.
import { useEffect, useState } from "react";
import * as Location from "expo-location";

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (isActive) {
            setError("Izin lokasi ditolak");
            setLoading(false);
          }
          return;
        }

        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (isActive) {
          setLocation(current);
          setLoading(false);
        }
      } catch (err) {
        if (isActive) {
          setError("Gagal mengambil lokasi");
          setLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  return { location, error, loading };
}
