import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:8080",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

instance.defaults.withCredentials = true;

// ===== helper lấy token =====
const getAccessToken = () => {
  // 1) ưu tiên key riêng
  const t1 = localStorage.getItem("accessToken");
  if (t1) return t1;

  // 2) fallback: đọc trong user object
  try {
    const raw = localStorage.getItem("user");
    const data = raw ? JSON.parse(raw) : null;

    return (
      data?.accessToken ||
      data?.access_Token ||
      data?.token ||
      data?.DT?.accessToken ||
      data?.DT?.access_Token ||
      null
    );
  } catch {
    return null;
  }
};

// ===== REQUEST =====
instance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log("📤 REQUEST:", config.method?.toUpperCase(), config.baseURL + config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

// ===== RESPONSE =====
instance.interceptors.response.use(
  (response) => {
    console.log("📥 RESPONSE:", response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error("📥 RESPONSE ERROR:", error);

    const status = error?.response?.status;

    // ✅ chỉ logout khi chắc chắn token sai/hết hạn
    if (status === 401) {
      console.warn("🔒 401 Unauthorized → logout");

      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");

      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default instance;
