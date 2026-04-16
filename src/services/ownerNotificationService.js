import axios from "../setup/axios";

export const getOwnerNotifications = async (params = {}) => {
  const res = await axios.get("/api/owner/notifications", { params });
  return res.data;
};

export const markOwnerNotificationRead = async (id) => {
  const res = await axios.patch(`/api/owner/notifications/${id}/read`);
  return res.data?.data;
};

export const markAllOwnerNotificationsRead = async (params = {}) => {
  const res = await axios.patch("/api/owner/notifications/read-all", null, { params });
  return res.data;
};