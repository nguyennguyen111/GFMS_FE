import axios from "../../setup/axios";

export const getMyNotifications = async (params = {}) => {
  const res = await axios.get("/api/notifications", { params });
  return res.data;
};

export const markNotificationRead = async (id) => {
  const res = await axios.patch(`/api/notifications/${id}/read`);
  return res.data?.data;
};

export const markAllNotificationsRead = async () => {
  const res = await axios.patch("/api/notifications/read-all");
  return res.data;
};
