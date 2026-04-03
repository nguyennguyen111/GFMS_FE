import axios from "../setup/axios";

export const getTrainerNotifications = async (params) => {
  const res = await axios.get("/api/trainer/notifications", { params });
  return res.data;
};

export const markTrainerNotificationRead = async (id) => {
  const res = await axios.patch(`/api/trainer/notifications/${id}/read`);
  return res.data?.data;
};

export const markAllTrainerNotificationsRead = async () => {
  const res = await axios.patch("/api/trainer/notifications/read-all");
  return res.data;
};
