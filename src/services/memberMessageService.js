import axios from "../setup/axios";

export const getEligibleConversations = async () => {
  const res = await axios.get("/api/member/messages/eligible");
  return res.data?.data || [];
};

export const getConversationMessages = async (peerUserId) => {
  const res = await axios.get(`/api/member/messages/with/${peerUserId}`);
  return res.data?.data || [];
};

export const sendConversationMessage = async (peerUserId, content) => {
  const res = await axios.post(`/api/member/messages/with/${peerUserId}`, { content });
  return res.data?.data;
};

export const markConversationRead = async (peerUserId) => {
  const res = await axios.patch(`/api/member/messages/with/${peerUserId}/read`);
  return res.data?.data;
};
