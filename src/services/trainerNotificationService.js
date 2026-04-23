import axios from "../setup/axios";

const PT_NOTI_TIMEOUT_MS = 12000;

export const getTrainerNotifications = async (params = {}) => {
  const res = await axios.get("/api/trainer/notifications", { params, timeout: PT_NOTI_TIMEOUT_MS });
  return res.data || { items: [], unreadCount: 0 };
};

export const markTrainerNotificationRead = async (id) => {
  const res = await axios.patch(`/api/trainer/notifications/${id}/read`, {}, { timeout: PT_NOTI_TIMEOUT_MS });
  return res.data?.data;
};

export const markAllTrainerNotificationsRead = async () => {
  const res = await axios.patch("/api/trainer/notifications/read-all", {}, { timeout: PT_NOTI_TIMEOUT_MS });
  return res.data;
};
