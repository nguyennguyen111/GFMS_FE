// src/setup/axios.js
import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:8080",
  timeout: 10000,
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
