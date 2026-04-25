import axios from "../setup/axios"; // hoặc "../setup/axios" tùy project

const BASE = "/api/pt";
/** POST điểm danh / reset / busy — đủ cho BE chậm, không treo phút như timeout axios mặc định */
const PT_ATTENDANCE_MUTATION_TIMEOUT_MS = 45000;
/** GET lịch buổi theo ngày — trang PT có thể gọi nhiều ngày song song, fail fast khi deploy/network chậm */
const PT_ATTENDANCE_READ_TIMEOUT_MS = 12000;
const ATTENDANCE_CACHE_TTL_MS = 20000;
const attendanceScheduleCache = new Map();
const attendanceScheduleInFlight = new Map();

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

const ptConfig = (options = {}) => ({
  withCredentials: true,
  headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
  timeout: options.timeout ?? PT_ATTENDANCE_MUTATION_TIMEOUT_MS,
});

const buildScheduleCacheKey = (params = {}) => {
  const date = params?.date ? String(params.date) : "";
  const status = params?.status ? String(params.status) : "";
  return `${date}::${status}`;
};

export const invalidatePTAttendanceScheduleCache = (date) => {
  if (!date) {
    attendanceScheduleCache.clear();
    attendanceScheduleInFlight.clear();
    return;
  }
  const prefix = `${String(date)}::`;
  Array.from(attendanceScheduleCache.keys()).forEach((key) => {
    if (key.startsWith(prefix)) attendanceScheduleCache.delete(key);
  });
  Array.from(attendanceScheduleInFlight.keys()).forEach((key) => {
    if (key.startsWith(prefix)) attendanceScheduleInFlight.delete(key);
  });
};

export const getPTAttendanceSchedule = async (params = {}, options = {}) => {
  const { force = false } = options;
  const key = buildScheduleCacheKey(params);
  const cached = attendanceScheduleCache.get(key);
  const nowTs = Date.now();

  if (!force && cached && nowTs - cached.ts < ATTENDANCE_CACHE_TTL_MS) {
    return cached.value;
  }

  if (!force && attendanceScheduleInFlight.has(key)) {
    return attendanceScheduleInFlight.get(key);
  }

  const qs = new URLSearchParams();
  if (params.date) qs.set("date", params.date);
  if (params.status) qs.set("status", params.status);

  const url = `${BASE}/attendance/today${qs.toString() ? `?${qs.toString()}` : ""}`;
  const requestPromise = axios
    .get(url, ptConfig({ timeout: PT_ATTENDANCE_READ_TIMEOUT_MS }))
    .then((res) => {
      const value = res.data;
      attendanceScheduleCache.set(key, { ts: Date.now(), value });
      return value;
    })
    .finally(() => {
      attendanceScheduleInFlight.delete(key);
    });

  attendanceScheduleInFlight.set(key, requestPromise);
  return requestPromise;
};

export const ptCheckIn = async ({ bookingId, method = "manual", status = "present" }) => {
  const res = await axios.post(
    `${BASE}/attendance/check-in`,
    { bookingId, method, status },
    ptConfig({ timeout: PT_ATTENDANCE_MUTATION_TIMEOUT_MS })
  );
  return res.data;
};

export const ptCheckOut = async ({
  bookingId,
  sessionNotes,
  ptMemberFeedback,
  exercises,
  weight,
  bodyFat,
  muscleMass,
  sessionRating,
  status = "absent",
}) => {
  const res = await axios.post(
    `${BASE}/attendance/check-out`,
    {
      bookingId,
      sessionNotes,
      ptMemberFeedback,
      exercises,
      weight,
      bodyFat,
      muscleMass,
      sessionRating,
      status,
    },
    ptConfig({ timeout: PT_ATTENDANCE_MUTATION_TIMEOUT_MS })
  );
  return res.data;
};

export const ptResetAttendance = async ({ bookingId }) => {
  const res = await axios.post(
    `${BASE}/attendance/reset`,
    { bookingId },
    ptConfig({ timeout: PT_ATTENDANCE_MUTATION_TIMEOUT_MS })
  );
  return res.data;
};

export const ptRequestBusySlot = async ({ bookingId, reason }) => {
  const res = await axios.post(
    `${BASE}/attendance/request-busy-slot`,
    { bookingId, reason },
    ptConfig({ timeout: PT_ATTENDANCE_MUTATION_TIMEOUT_MS })
  );
  return res.data;
};

/** PT gửi NH + STK cho owner chi nhánh mượn (sau khi buổi trainer_share đã hoàn thành) */
export const ptSendSharePaymentInstruction = async (bookingId, body) => {
  const res = await axios.post(
    `${BASE}/bookings/${bookingId}/share-payment-instruction`,
    body,
    ptConfig({ timeout: PT_ATTENDANCE_MUTATION_TIMEOUT_MS }),
  );
  return res.data;
};

/** PT khiếu nại chưa nhận được tiền (sau khi đã gửi STK, đang chờ CK) */
export const ptSubmitSharePaymentDispute = async (bookingId, body) => {
  const res = await axios.post(
    `${BASE}/bookings/${bookingId}/share-payment-dispute`,
    body,
    ptConfig({ timeout: PT_ATTENDANCE_MUTATION_TIMEOUT_MS }),
  );
  return res.data;
};

/** PT xác nhận đã nhận tiền / đồng ý phản hồi chủ phòng (sau phản hồi + ảnh CK) */
export const ptAcknowledgeSharePaymentResponse = async (bookingId) => {
  const res = await axios.post(
    `${BASE}/bookings/${bookingId}/share-payment-ack`,
    {},
    ptConfig({ timeout: PT_ATTENDANCE_MUTATION_TIMEOUT_MS }),
  );
  return res.data;
};