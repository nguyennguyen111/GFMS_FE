import axios from "../setup/axios";

export const getTrainerEligibleConversations = async () => {
  const res = await axios.get("/api/trainer/messages/eligible");
  return res.data?.data || [];
};

export const getTrainerConversationMessages = async (peerUserId) => {
  const res = await axios.get(`/api/trainer/messages/with/${peerUserId}`);
  return res.data?.data || [];
};

export const sendTrainerConversationMessage = async (peerUserId, content) => {
  const res = await axios.post(`/api/trainer/messages/with/${peerUserId}`, { content });
  return res.data?.data;
};

export const markTrainerConversationRead = async (peerUserId) => {
  const res = await axios.patch(`/api/trainer/messages/with/${peerUserId}/read`);
  return res.data?.data;
};
