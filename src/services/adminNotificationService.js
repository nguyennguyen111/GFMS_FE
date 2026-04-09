import axios from "../setup/axios";

export const getAdminNotifications = async (params = {}) => {
  const res = await axios.get("/api/admin/notifications", { params });
  return res.data || { items: [], unreadCount: 0 };
};

export const markAdminNotificationRead = async (id) => {
  const res = await axios.patch(`/api/admin/notifications/${id}/read`);
  return res.data?.data;
};

export const markAllAdminNotificationsRead = async () => {
  const res = await axios.patch("/api/admin/notifications/read-all");
  return res.data;
};
