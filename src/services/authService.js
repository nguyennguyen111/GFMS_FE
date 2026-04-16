// src/services/authService.js
import axios from "../setup/axios";
import { clearAuthSession, getAccessToken, setAuthSession } from "./authSession";
import { disconnectSocket } from "./socketClient";

export const registerNewUser = (email, phone, username, password) => {
  return axios.post("/auth/register", { email, phone, username, password });
};

/** Chỉ gọi API; LoginPage (hoặc nơi khác) tự lưu session sau khi EC === 0 */
export const loginUser = (email, password, rememberMe = false) =>
  axios.post("/auth/login", { email, password, rememberMe });

/** Google Identity: gửi ID token (JWT) lên BE /auth/google — không tự ghi localStorage; LoginPage xử lý giống login thường */
export const loginWithGoogle = (credential, rememberMe = false) =>
  axios.post("/auth/google", { credential, rememberMe });

export const refreshAuthToken = () => axios.post("/auth/refresh");
export const getCurrentUserProfile = () => axios.get("/auth/me");

export const forgotPassword = (email) => {
  return axios.post("/auth/forgot-password", { email });
};

// ===== Forgot password (OTP) =====
export const verifyOtp = (email, otp) => {
  return axios.post("/auth/verify-otp", { email, otp });
};

export const resetPassword = (email, otp, newPassword) => {
  return axios.post("/auth/reset-password", { email, otp, newPassword });
};

export const logoutUser = () => {
  return axios
    .post("/auth/logout", {}, { validateStatus: (status) => status < 500 })
    .catch(() => null)
    .finally(() => {
      disconnectSocket();
      clearAuthSession();
    });
};

export const applyAuthPayload = (dt, options = {}) => {
  const user = dt?.user || null;
  const roles = dt?.roles || [];
  const role = resolveRole(roles, user || {});
  const accessToken = dt?.accessToken || options?.fallbackToken || "";
  if (!user || !accessToken) return false;
  setAuthSession({ token: accessToken, user, roles, role });
  return true;
};

const withTimeout = (promise, timeoutMs = 8000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Auth bootstrap timeout")), timeoutMs);
    }),
  ]);

let bootstrapInFlight = null;

const runBootstrapAuthSession = async () => {
  const inMemoryToken = getAccessToken();

  // Avoid double-refresh race on hard reload:
  // if token is lost after F5, call refresh directly instead of /me -> 401 -> interceptor refresh.
  if (inMemoryToken) {
    try {
      const meRes = await withTimeout(getCurrentUserProfile(), 8000);
      if (applyAuthPayload(meRes?.data?.DT, { fallbackToken: inMemoryToken })) return true;
    } catch (_) {
      // continue refresh path
    }
  }

  try {
    const refreshRes = await withTimeout(refreshAuthToken(), 8000);
    if (applyAuthPayload(refreshRes?.data?.DT)) return true;
  } catch (_) {
    // Keep current client session; explicit logout is responsible for clearing it.
    return false;
  }
  return false;
};

export const bootstrapAuthSession = async () => {
  if (bootstrapInFlight) return bootstrapInFlight;
  bootstrapInFlight = runBootstrapAuthSession().finally(() => {
    bootstrapInFlight = null;
  });
  return bootstrapInFlight;
};

export function resolveRole(roles, user) {
  // 1) roles dạng array object/string -> dò chữ
  if (Array.isArray(roles) && roles.length) {
    const s = JSON.stringify(roles).toLowerCase();
    if (s.includes("admin")) return "admin";
    if (s.includes("owner")) return "owner";
    if (s.includes("trainer") || s.includes("pt")) return "trainer";
    if (s.includes("member")) return "member";
  }

  // 2) fallback theo groupId
  // Bạn đang set groupId=4 cho member => mapping tạm:
  const gid = user?.groupId;
  if (gid === 1) return "admin";
  if (gid === 2) return "owner";
  if (gid === 3) return "trainer";
  return "member"; // gid 4 hoặc khác
}
