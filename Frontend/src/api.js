import axios from "axios";

const configuredBaseURL = import.meta.env.VITE_API_URL?.trim();
const isLocalBaseURL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/i.test(configuredBaseURL || "");
const baseURL = import.meta.env.PROD && isLocalBaseURL
  ? "/api"
  : configuredBaseURL || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;