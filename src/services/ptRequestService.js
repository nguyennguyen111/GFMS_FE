import axios from "../setup/axios";

const BASE = "/api/pt";

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

// ===== Create requests (4 UC) =====
export const createLeaveRequest = async (payload) => {
  const res = await axios.post(`${BASE}/requests/leave`, payload, ptConfig());
  return res.data;
};

export const createShiftChangeRequest = async (payload) => {
  const res = await axios.post(`${BASE}/requests/shift-change`, payload, ptConfig());
  return res.data;
};

export const createTransferBranchRequest = async (payload) => {
  const res = await axios.post(`${BASE}/requests/transfer-branch`, payload, ptConfig());
  return res.data;
};

export const createOvertimeRequest = async (payload) => {
  const res = await axios.post(`${BASE}/requests/overtime`, payload, ptConfig());
  return res.data;
};

// ===== List + Cancel =====
export const getMyRequests = async (params = {}) => {
  const res = await axios.get(`${BASE}/requests`, { ...ptConfig(), params });
  return res.data; // array hoặc {items, pagination}
};

export const cancelRequest = async (id) => {
  const res = await axios.patch(`${BASE}/requests/${id}/cancel`, {}, ptConfig());
  return res.data;
};
