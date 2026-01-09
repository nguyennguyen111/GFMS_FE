import axios from '../setup/axios'; // axios instance baseURL = http://localhost:8080

// Đổi BASE URL cho pt-portal
const BASE = '/api/pt';

// 1) Danh sách PT (UC-PT-001)
export const getPTs = async () => {
  const res = await axios.get(`${BASE}`);
  return res.data;
};

// 2) Tạo PT (UC-PT-002)
export const createPT = async (ptData) => {
  const res = await axios.post(`${BASE}`, ptData);
  return res.data;
};

// 3) Cập nhật PT (UC-PT-003)
export const updatePT = async (ptId, ptData) => {
  const res = await axios.put(`${BASE}/${ptId}`, ptData);
  return res.data;
};

// 4) Xem lịch làm việc (UC-PT-005)
export const getPTSchedule = async (ptId) => {
  const res = await axios.get(`${BASE}/${ptId}/schedule`);
  return res.data;
};

// 5) Cập nhật lịch rảnh (UC-PT-006)
export const updatePTSchedule = async (ptId, schedule) => {
  // schedule là object JSON: { monday: [...], tuesday: [...], ... }
  const res = await axios.put(`${BASE}/${ptId}/schedule`, schedule);
  return res.data;
};

// 6) Xem chi tiết hồ sơ (UC-PT-007)
export const getPTDetails = async (ptId) => {
  const res = await axios.get(`${BASE}/${ptId}/details`);
  return res.data;
};

// 7) Update kỹ năng/chứng chỉ (UC-PT-008)
export const updatePTSkills = async (ptId, payload) => {
  // payload: { specialization, certification }
  const res = await axios.put(`${BASE}/${ptId}/skills`, payload);
  return res.data;
};
