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

// GET /api/pt/attendance/today?date=YYYY-MM-DD&status=...
export const getPTAttendanceSchedule = async (params = {}) => {
  const qs = new URLSearchParams();
  if (params.date) qs.set("date", params.date);
  if (params.status) qs.set("status", params.status);

  const url = `${BASE}/attendance/today${qs.toString() ? `?${qs.toString()}` : ""}`;
  const res = await axios.get(url, ptConfig());
  return res.data;
};

export const ptCheckIn = async ({ bookingId, method = "manual", status = "present" }) => {
  const res = await axios.post(
    `${BASE}/attendance/check-in`,
    { bookingId, method, status },
    ptConfig()
  );
  return res.data;
};

export const ptCheckOut = async ({
  bookingId,
  sessionNotes,
  exercises,
  weight,
  bodyFat,
  muscleMass,
  sessionRating,
}) => {
  const res = await axios.post(
    `${BASE}/attendance/check-out`,
    { bookingId, sessionNotes, exercises, weight, bodyFat, muscleMass, sessionRating },
    ptConfig()
  );
  return res.data;
};
