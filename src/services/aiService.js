import axios from "../setup/axios";

export const aiChat = async (payload) => {
  const res = await axios.post("/api/ai/chat", payload);
  return res.data?.DT || null;
};

export const aiConfirmAction = async (action) => {
  const res = await axios.post("/api/ai/confirm", { action });
  return res.data?.DT || null;
};