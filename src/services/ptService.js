import axios from "../setup/axios"; // instance baseURL=http://localhost:8080

const BASE = "/api/pt";
const PT_REVIEW_TIMEOUT_MS = 120000;
const PT_SCHEDULE_TIMEOUT_MS = 90000;

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

const ptReviewConfig = (params) => ({
  ...ptConfig(),
  ...(params ? { params } : {}),
  timeout: PT_REVIEW_TIMEOUT_MS,
});

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
  const res = await axios.get(
    `${BASE}/${ptId}/schedule?mode=raw`,
    { ...ptConfig(), timeout: PT_SCHEDULE_TIMEOUT_MS }
  );
  return res.data?.availableHours || {};
};

// 4b) Lấy schedule SLOTS để hiển thị calendar
export const getPTScheduleSlots = async (ptId) => {
  const res = await axios.get(
    `${BASE}/${ptId}/schedule?mode=slots`,
    { ...ptConfig(), timeout: PT_SCHEDULE_TIMEOUT_MS }
  );
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
  const res = await axios.get(
    `${BASE}/${ptId}/details`,
    { ...ptConfig(), timeout: PT_SCHEDULE_TIMEOUT_MS }
  );
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

export const uploadMyPTProfileImage = async ({ file, imageType = "avatar", certificateName = "" }) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("imageType", imageType);
  if (certificateName) formData.append("certificateName", certificateName);
  const token = getToken();
  const res = await axios.post(`${BASE}/me/profile-image/upload`, formData, {
    withCredentials: true,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

// 16) Demo videos (UC-TR-010)
export const getMyPTDemoVideos = async () => {
  const res = await axios.get(`${BASE}/me/demo-videos`, ptConfig());
  return res.data;
};

export const uploadMyPTDemoVideo = async ({ file, title }) => {
  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);
  const token = getToken();
  const res = await axios.post(`${BASE}/me/demo-videos/upload`, formData, {
    withCredentials: true,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const deleteMyPTDemoVideo = async (videoId) => {
  const res = await axios.delete(`${BASE}/me/demo-videos/${videoId}`, ptConfig());
  return res.data;
};

export const getMyPTTrainingPlans = async () => {
  const res = await axios.get(`${BASE}/me/training-plans`, ptConfig());
  return res.data;
};

export const uploadMyPTTrainingPlan = async ({ file, title }) => {
  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);
  const token = getToken();
  const res = await axios.post(`${BASE}/me/training-plans/upload`, formData, {
    withCredentials: true,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const deleteMyPTTrainingPlan = async (planId) => {
  const res = await axios.delete(`${BASE}/me/training-plans/${planId}`, ptConfig());
  return res.data;
};

export const getPTEligibleActivations = async () => {
  const res = await axios.get(`${BASE}/me/eligible-activations`, ptConfig());
  return res.data;
};

export const getPTActivationMaterials = async (packageActivationId) => {
  const res = await axios.get(`${BASE}/me/activation-materials`, {
    ...ptConfig(),
    params: { packageActivationId },
  });
  return res.data;
};

export const sendPTActivationMaterial = async (payload) => {
  const res = await axios.post(`${BASE}/me/activation-materials`, payload, ptConfig());
  return res.data;
};

export const deletePTActivationMaterial = async (id) => {
  const res = await axios.delete(`${BASE}/me/activation-materials/${id}`, ptConfig());
  return res.data;
};

// 17) Reviews (UC-TR-011 + UC-TR-012)
export const getMyPTReviews = async (params = {}) => {
  const res = await axios.get(`${BASE}/me/reviews`, ptReviewConfig(params));
  return res.data;
};

export const replyPTReview = async (reviewId, reply) => {
  const res = await axios.post(
    `${BASE}/reviews/${reviewId}/reply`,
    { reply },
    ptReviewConfig()
  );
  return res.data;
};



export const getMyPTRescheduleRequests = async () => {
  const res = await axios.get(`${BASE}/me/reschedule-requests`, ptConfig());
  return res.data;
};

export const approvePTRescheduleRequest = async (id, payload = {}) => {
  const res = await axios.patch(`${BASE}/reschedule-requests/${id}/approve`, payload, ptConfig());
  return res.data;
};

export const rejectPTRescheduleRequest = async (id, payload = {}) => {
  const res = await axios.patch(`${BASE}/reschedule-requests/${id}/reject`, payload, ptConfig());
  return res.data;
};
