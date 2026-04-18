import axios from "../setup/axios"; // hoặc "../setup/axios" tùy project

const BASE = "/api/pt";

const getToken = () => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.access_Token || null;
  } catch {
    return null;
  }
};

const ptConfig = () => ({
  withCredentials: true,
  headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
});

export const getPTAttendanceSchedule = async (params = {}) => {
  const qs = new URLSearchParams();
  if (params.date) qs.set("date", params.date);
  if (params.status) qs.set("status", params.status);

  const url = `${BASE}/attendance/today${qs.toString() ? `?${qs.toString()}` : ""}`;
  const res = await axios.get(url, ptConfig());
  return res.data;
};

export const ptCheckIn = async ({ bookingId, method = "manual", status = "present" }) => {
  const res = await axios.post(`${BASE}/attendance/check-in`, { bookingId, method, status }, ptConfig());
  return res.data;
};

export const ptCheckOut = async ({ bookingId, sessionNotes, exercises, weight, bodyFat, muscleMass, sessionRating, status = "absent" }) => {
  const res = await axios.post(
    `${BASE}/attendance/check-out`,
    { bookingId, sessionNotes, exercises, weight, bodyFat, muscleMass, sessionRating, status },
    ptConfig()
  );
  return res.data;
};

export const ptResetAttendance = async ({ bookingId }) => {
  const res = await axios.post(`${BASE}/attendance/reset`, { bookingId }, ptConfig());
  return res.data;
};

export const ptRequestBusySlot = async ({ bookingId, reason }) => {
  const res = await axios.post(`${BASE}/attendance/request-busy-slot`, { bookingId, reason }, ptConfig());
  return res.data;
};

/** PT gửi NH + STK cho owner chi nhánh mượn (sau khi buổi trainer_share đã hoàn thành) */
export const ptSendSharePaymentInstruction = async (bookingId, body) => {
  const res = await axios.post(
    `${BASE}/bookings/${bookingId}/share-payment-instruction`,
    body,
    ptConfig(),
  );
  return res.data;
};

/** PT khiếu nại chưa nhận được tiền (sau khi đã gửi STK, đang chờ CK) */
export const ptSubmitSharePaymentDispute = async (bookingId, body) => {
  const res = await axios.post(
    `${BASE}/bookings/${bookingId}/share-payment-dispute`,
    body,
    ptConfig(),
  );
  return res.data;
};

/** PT xác nhận đã nhận tiền / đồng ý phản hồi chủ phòng (sau phản hồi + ảnh CK) */
export const ptAcknowledgeSharePaymentResponse = async (bookingId) => {
  const res = await axios.post(
    `${BASE}/bookings/${bookingId}/share-payment-ack`,
    {},
    ptConfig(),
  );
  return res.data;
};