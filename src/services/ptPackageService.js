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

export const getMyPTPackages = async () => {
  const res = await axios.get(`${BASE}/packages/me`, ptConfig());
  return res.data; // { data: [...] }
};

export const createPTPackage = async (payload) => {
  const res = await axios.post(`${BASE}/packages`, payload, ptConfig());
  return res.data;
};

export const updatePTPackage = async (id, payload) => {
  const res = await axios.put(`${BASE}/packages/${id}`, payload, ptConfig());
  return res.data;
};

export const togglePTPackage = async (id) => {
  const res = await axios.patch(`${BASE}/packages/${id}/toggle`, {}, ptConfig());
  return res.data;
};
