import axios from "../setup/axios";

const PT_MESSAGE_READ_TIMEOUT_MS = 20000;
const PT_MESSAGE_ACTION_TIMEOUT_MS = 25000;

export const getTrainerEligibleConversations = async () => {
  const res = await axios.get("/api/trainer/messages/eligible", { timeout: PT_MESSAGE_READ_TIMEOUT_MS });
  return res.data?.data || [];
};

export const getTrainerConversationMessages = async (peerUserId) => {
  const res = await axios.get(`/api/trainer/messages/with/${peerUserId}`, { timeout: PT_MESSAGE_READ_TIMEOUT_MS });
  return res.data?.data || [];
};

export const sendTrainerConversationMessage = async (peerUserId, content) => {
  const res = await axios.post(
    `/api/trainer/messages/with/${peerUserId}`,
    { content },
    { timeout: PT_MESSAGE_ACTION_TIMEOUT_MS }
  );
  return res.data?.data;
};

export const markTrainerConversationRead = async (peerUserId) => {
  const res = await axios.patch(
    `/api/trainer/messages/with/${peerUserId}/read`,
    {},
    { timeout: PT_MESSAGE_ACTION_TIMEOUT_MS }
  );
  return res.data?.data;
};
