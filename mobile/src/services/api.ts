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
  const validToken = token && token !== "null" && token !== "undefined" ? token : null;

  if (validToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${validToken}`;
  }

  console.log("[api] request", config.method?.toUpperCase(), config.url, validToken ? "(auth)" : "(no auth)");
  return config;
});

// Interceptor response: logging lalu meneruskan respon atau error.
api.interceptors.response.use(
  (response) => {
    console.log("[api] response", response.status, response.config.url);
    return response;
  },
  async (error) => {
    console.log("[api] response error", error.response?.status, error.response?.data, error.config?.url);
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
    }
    return Promise.reject(error);
  }
);

export default api;