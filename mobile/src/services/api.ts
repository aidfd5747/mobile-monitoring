import axios from "axios";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || "https://mobile-monitoring-production.up.railway.app/api",
});

export default api;