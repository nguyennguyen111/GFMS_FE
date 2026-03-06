import axios from "../setup/axios"; // instance baseURL=http://localhost:8080

const BASE = "/api/pt";

// ✅ match leader axios: interceptor chỉ đọc access_Token
const getToken = () => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.access_Token || null;
  } catch (e) {
    return null;
  }
};

// config chung cho PT requests: gắn Bearer + cookie
// (leader axios đã tự gắn Authorization nếu có access_Token,
//  nhưng giữ config này để đúng logic code bạn đang dùng)
const ptConfig = () => {
  const token = getToken();
  return {
    withCredentials: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
};

// 1) Danh sách PT
export const getPTs = async () => {
  const res = await axios.get(`${BASE}`, ptConfig());
  return res.data;
};

// 2) Tạo PT
export const createPT = async (ptData) => {
  const res = await axios.post(`${BASE}`, ptData, ptConfig());
  return res.data;
};

// 3) Update PT
export const updatePT = async (ptId, ptData) => {
  const res = await axios.put(`${BASE}/${ptId}`, ptData, ptConfig());
  return res.data;
};

// 4) Xem lịch
// 4a) Lấy schedule RAW (range) để đổ vào form update
export const getPTScheduleRaw = async (ptId) => {
  const res = await axios.get(`${BASE}/${ptId}/schedule?mode=raw`, ptConfig());
  return res.data?.availableHours || {};
};

// 4b) Lấy schedule SLOTS để hiển thị calendar
export const getPTScheduleSlots = async (ptId) => {
  const res = await axios.get(`${BASE}/${ptId}/schedule?mode=slots`, ptConfig());
  return res.data?.slots || {};
};


// 5) Update lịch rảnh
export const updatePTSchedule = async (ptId, schedule) => {
  const res = await axios.put(
    `${BASE}/${ptId}/schedule`,
    { availableHours: schedule }, // 👈 wrapper đúng như controller đọc
    ptConfig()
  );
  return res.data;
};

// 6) Chi tiết PT
export const getPTDetails = async (ptId) => {
  const res = await axios.get(`${BASE}/${ptId}/details`, ptConfig());
  return res.data;
};

// 7) Update skills
export const updatePTSkills = async (ptId, payload) => {
  const res = await axios.put(`${BASE}/${ptId}/skills`, payload, ptConfig());
  return res.data;
};

// 0) Lấy PT profile của chính mình
export const getMyPTProfile = async () => {
  const res = await axios.get(`${BASE}/me`, ptConfig());
  return res.data;
};

// 8) Hoa hồng (commission) của PT
export const getMyPTCommissions = async (params = {}) => {
  const res = await axios.get(`${BASE}/me/commissions`, { ...ptConfig(), params });
  return res.data;
};

// 9) Kỳ lương của PT
export const getMyPTPayrollPeriods = async () => {
  const res = await axios.get(`${BASE}/me/payroll-periods`, ptConfig());
  return res.data;
};

// 10) Chi tiết hoa hồng theo kỳ
export const getMyPTPayrollPeriodCommissions = async (periodId) => {
  const res = await axios.get(`${BASE}/me/payroll-periods/${periodId}/commissions`, ptConfig());
  return res.data;
};

// 11) Xuất hoa hồng PT
export const exportMyPTCommissions = async (params = {}) => {
  const res = await axios.get(`${BASE}/me/commissions/export`, { ...ptConfig(), params, responseType: "blob" });
  return res;
};

// 12) Yêu cầu chi trả
export const requestPTWithdrawal = async (payload) => {
  const res = await axios.post(`${BASE}/me/withdrawals`, payload, ptConfig());
  return res.data;
};

// 13) Danh sách yêu cầu chi trả
export const getMyPTWithdrawals = async () => {
  const res = await axios.get(`${BASE}/me/withdrawals`, ptConfig());
  return res.data;
};

// 14) Ví PT
export const getMyPTWalletSummary = async () => {
  const res = await axios.get(`${BASE}/me/wallet-summary`, ptConfig());
  return res.data;
};

// 15) Lấy danh sách học viên đã đặt lịch (Bookings)
export const getPTBookings = async (ptId) => {
  // Nếu ptId là "me", nó sẽ gọi /api/pt/me/bookings
  const res = await axios.get(`${BASE}/${ptId}/bookings`, ptConfig());
  return res.data; // Trả về mảng danh sách học viên
};

