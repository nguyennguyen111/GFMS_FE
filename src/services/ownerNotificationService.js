import axios from "../setup/axios";

const OWNER_NOTI_TIMEOUT_MS = 15000;

export const getOwnerNotifications = async (params = {}) => {
  const res = await axios.get("/api/owner/notifications", {
    params,
    timeout: OWNER_NOTI_TIMEOUT_MS,
  });
  return res.data;
};

export const markOwnerNotificationRead = async (id) => {
  const res = await axios.patch(
    `/api/owner/notifications/${id}/read`,
    {},
    { timeout: OWNER_NOTI_TIMEOUT_MS }
  );
  return res.data?.data;
};

export const markAllOwnerNotificationsRead = async (params = {}) => {
  const res = await axios.patch(
    "/api/owner/notifications/read-all",
    {},
    { params, timeout: OWNER_NOTI_TIMEOUT_MS }
  );
  return res.data;
};