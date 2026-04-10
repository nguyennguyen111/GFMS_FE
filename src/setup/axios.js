// src/setup/axios.js
import axios from "axios";
import { clearAuthSession, getAccessToken, setAuthSession } from "../services/authSession";

const resolveBaseURL = () => {
  // CRA/Vercel: đặt REACT_APP_API_BASE=https://your-backend
  const envBase = process.env.REACT_APP_API_BASE;
  const winBase = typeof window !== "undefined" ? window.__API_BASE__ : null;
  if (envBase) return String(envBase).replace(/\/+$/, "");
  if (winBase) return String(winBase).replace(/\/+$/, "");
  // Dev: cùng origin với FE (3000) + package.json "proxy" → /api/* sang BE; iframe PDF không cross-origin 8080.
  if (process.env.NODE_ENV === "development") return "";
  return "http://localhost:8080".replace(/\/+$/, "");
};

const instance = axios.create({
  baseURL: resolveBaseURL(),
  // Enterprise-friendly: some actions (generate PDF + upload + send email) can take >10s.
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

instance.defaults.withCredentials = true;

/** Ký hợp đồng nhượng quyền: chỉ cần token trên URL, không dùng JWT — tránh gửi Bearer gây lệch xử lý / redirect 401 oan. */
const isPublicFranchiseSigningRequest = (config) => {
  const url = String(config?.url || "");
  const base = String(config?.baseURL || "");
  return url.includes("/api/public/franchise-contract") || base.includes("/api/public/franchise-contract");
};

instance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token && !isPublicFranchiseSigningRequest(config)) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let pendingRequests = [];

const flushPendingRequests = (token) => {
  pendingRequests.forEach((cb) => cb(token));
  pendingRequests = [];
};

const requestRefreshToken = async () => {
  const response = await instance.post("/auth/refresh", {}, { _skipAuthRefresh: true });
  const dt = response?.data?.DT || {};
  const nextToken = dt?.accessToken || "";
  if (nextToken && dt?.user) {
    setAuthSession({
      token: nextToken,
      user: dt.user,
      roles: dt.roles || [],
      role: localStorage.getItem("role") || "",
    });
  }
  return nextToken;
};

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config || {};

    if (
      status === 401 &&
      !isPublicFranchiseSigningRequest(originalRequest) &&
      !originalRequest._skipAuthRefresh &&
      !originalRequest._retry &&
      !String(originalRequest?.url || "").includes("/auth/login") &&
      !String(originalRequest?.url || "").includes("/auth/me") &&
      !String(originalRequest?.url || "").includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingRequests.push((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(instance(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const newToken = await requestRefreshToken();
        flushPendingRequests(newToken);
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return instance(originalRequest);
        }
      } catch (_) {
        flushPendingRequests(null);
        clearAuthSession();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.replace("/login");
        }
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default instance;
