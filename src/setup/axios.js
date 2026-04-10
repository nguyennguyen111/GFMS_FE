// src/setup/axios.js
import axios from "axios";

const resolveBaseURL = () => {
  // CRA/Vercel: đặt REACT_APP_API_BASE=https://your-backend
  const envBase = process.env.REACT_APP_API_BASE;
  const winBase = typeof window !== "undefined" ? window.__API_BASE__ : null;
  const base = (envBase || winBase || "http://localhost:8080").toString();
  return base.replace(/\/+$/, "");
};

const instance = axios.create({
  baseURL: resolveBaseURL(),
  // Enterprise-friendly: some actions (generate PDF + upload + send email) can take >10s.
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

instance.defaults.withCredentials = true;

/**
 * ✅ CHUẨN HOÁ:
 * - Token chỉ được lấy từ accessToken
 * - Không fallback lung tung
 */
const getAccessToken = () => {
  return localStorage.getItem("accessToken");
};

instance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // 🔥 CỰC KỲ QUAN TRỌNG
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");

      window.dispatchEvent(new Event("authChanged"));
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default instance;
