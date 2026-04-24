import axios from "../setup/axios";

const READ_TIMEOUT = 12000;
const ACTION_TIMEOUT = 15000;

export const getTrainerEligibleConversations = async () => {
  const res = await axios.get("/api/trainer/messages/eligible", {
    timeout: READ_TIMEOUT,
  });
  return res.data?.data || [];
};

export const getTrainerConversationMessages = async (peerUserId) => {
  const res = await axios.get(`/api/trainer/messages/with/${peerUserId}`, {
    timeout: READ_TIMEOUT,
  });
  return res.data?.data || [];
};

export const sendTrainerConversationMessage = async (peerUserId, content) => {
  const res = await axios.post(
    `/api/trainer/messages/with/${peerUserId}`,
    { content },
    { timeout: ACTION_TIMEOUT }
  );
  return res.data?.data;
};

export const markTrainerConversationRead = async (peerUserId) => {
  const res = await axios.patch(
    `/api/trainer/messages/with/${peerUserId}/read`,
    {},
    { timeout: ACTION_TIMEOUT }
  );
  return res.data?.data;
};