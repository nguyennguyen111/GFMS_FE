import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:8080", // backend của bạn
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Cho phép gửi cookie (jwt) nếu backend dùng cookie
instance.defaults.withCredentials = true;

/**
 * =========================
 * REQUEST INTERCEPTOR
 * =========================
 * - Gắn Bearer token nếu có
 */
instance.interceptors.request.use(
  (config) => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const data = JSON.parse(raw);
        const token = data?.access_Token;

        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (e) {
      console.error("❌ Cannot parse user from localStorage", e);
    }

    console.log(
      "📤 REQUEST:",
      config.method?.toUpperCase(),
      config.baseURL + config.url
    );

    return config;
  },
  (error) => {
    console.error("📤 REQUEST ERROR:", error);
    return Promise.reject(error);
  }
);

/**
 * =========================
 * RESPONSE INTERCEPTOR
 * =========================
 * - Auto logout nếu 401
 * - Giữ 403 cho middleware phân quyền xử lý
 */
instance.interceptors.response.use(
  (response) => {
    console.log(
      "📥 RESPONSE:",
      response.status,
      response.config.url
    );
    return response;
  },
  (error) => {
    console.error("📥 RESPONSE ERROR:", error);

    if (error.response) {
      const status = error.response.status;

      console.error("Status:", status);
      console.error("Data:", error.response.data);

      /**
       * =========================
       * 401 = UNAUTHORIZED
       * Token hết hạn / không hợp lệ
       * => Logout tự động
       * =========================
       */
      if (status === 401) {
        console.warn("🔒 Token invalid or expired → auto logout");

        // Xoá trạng thái đăng nhập FE
        localStorage.removeItem("user");

        // Điều hướng về login
        window.location.href = "/login";
      }

      /**
       * 403 = FORBIDDEN
       * Đã đăng nhập nhưng không đủ quyền
       * => KHÔNG logout
       */
      if (status === 403) {
        console.warn("⛔ Forbidden: user has no permission");
        // Tuỳ bạn: có thể show toast / modal
      }
    } else if (error.request) {
      console.error("❌ No response from server", error.request);
    } else {
      console.error("❌ Axios error:", error.message);
    }

    return Promise.reject(error);
  }
);

export default instance;
