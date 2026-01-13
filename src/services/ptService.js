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
export const getPTSchedule = async (ptId) => {
  const res = await axios.get(`${BASE}/${ptId}/schedule`, ptConfig());
  const data = res.data;

  // ✅ nếu BE trả string JSON ("{}" hoặc "{\"monday\":...}") thì parse
  if (typeof data === "string") {
    try {
      return JSON.parse(data || "{}");
    } catch {
      return {};
    }
  }

  // ✅ nếu BE trả object rồi thì dùng luôn
  return data || {};
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
