import axios from "../setup/axios";

export const getMyNotifications = async (params = {}) => {
  const res = await axios.get("/api/member/notifications", { params });
  return res.data || { items: [], unreadCount: 0 };
};

export const markNotificationRead = async (id) => {
  const res = await axios.patch(`/api/member/notifications/${id}/read`);
  return res.data?.data;
};

export const markAllNotificationsRead = async () => {
  const res = await axios.patch("/api/member/notifications/read-all");
  return res.data;
};
