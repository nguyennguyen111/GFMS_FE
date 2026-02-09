// src/services/authService.js
import axios from "../setup/axios";

export const registerNewUser = (email, phone, username, password) => {
  return axios.post("/auth/register", { email, phone, username, password });
};

export const loginUser = async (email, password) => {
  const res = await axios.post("/auth/login", { email, password });

  const data = res?.data;
  if (!data || data.EC !== 0) return res; // login fail

  const DT = data.DT || {};
  const accessToken = DT.accessToken;
  const user = DT.user;
  const roles = DT.roles;

  // ✅ lưu token đúng key Header đang đọc
  if (accessToken) localStorage.setItem("accessToken", accessToken);

  // ✅ lưu user
  if (user) localStorage.setItem("user", JSON.stringify(user));

  // ✅ resolve role (ưu tiên roles, fallback groupId)
  const role = resolveRole(roles, user);
  localStorage.setItem("role", role);

  // ✅ username để hiển thị trên header
  localStorage.setItem("username", user?.username || user?.email || "Tài khoản");

  // ✅ báo cho Header cập nhật ngay
  window.dispatchEvent(new Event("authChanged"));

  return res;
};

export const forgotPassword = (email) => {
  return axios.post("/auth/forgot-password", { email });
};

export const logoutUser = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("username");
  window.dispatchEvent(new Event("authChanged"));
};

function resolveRole(roles, user) {
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
