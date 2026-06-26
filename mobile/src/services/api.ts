import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || "https://mobile-monitoring-production.up.railway.app/api",
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  console.log("[api] request", config.method?.toUpperCase(), config.url);
  return config;
});

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