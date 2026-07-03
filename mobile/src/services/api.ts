// api.ts
// Modul service untuk melakukan panggilan HTTP ke backend.
// Menangani base URL dan menambahkan token Authorization otomatis.
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  // URL backend API. Bisa diganti lewat environment variable Expo.
  baseURL: process.env.EXPO_PUBLIC_API_URL || "https://mobile-monitoring-production.up.railway.app/api",
});

// Interceptor request: menyisipkan token JWT di header jika tersedia.
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  console.log("[api] request", config.method?.toUpperCase(), config.url);
  return config;
});

// Interceptor response: logging lalu meneruskan respon atau error.
api.interceptors.response.use(
  (response) => {
    console.log("[api] response", response.status, response.config.url);
    return response;
  },
  (error) => {
    console.log("[api] response error", error.response?.status, error.response?.data, error.config?.url);
    return Promise.reject(error);
  }
);

export default api;