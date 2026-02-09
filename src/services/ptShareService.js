import axios from "../setup/axios"; // instance baseURL=http://localhost:8080

const BASE = "/api/pt";

// y hệt ptService.js của bạn
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

const ptConfig = () => {
  const token = getToken();
  return {
    withCredentials: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
};

// UC-SHARE-001: PT gửi yêu cầu chia sẻ
export const createPTShareRequest = async (payload) => {
  const res = await axios.post(`${BASE}/share-requests`, payload, ptConfig());
  return res.data;
};

// UC-SHARE-004: PT xem lịch sử chia sẻ
export const getMyPTShareRequests = async (params = {}) => {
  const res = await axios.get(`${BASE}/share-requests`, { ...ptConfig(), params });
  return res.data;
};
