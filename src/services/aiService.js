import axios from "../setup/axios";

const normalizeAiResponse = (data) => ({
  reply: data?.reply || "Mình chưa nhận được phản hồi từ AI, bạn thử nhắn lại giúp mình nhé.",
  suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
  actions: Array.isArray(data?.actions) ? data.actions : [],
  cards: data?.cards || null,
  proposedAction: data?.proposedAction || null,
  requiresConfirmation: Boolean(data?.requiresConfirmation),
  bmiSummary: data?.bmiSummary || null,
  bookingContext: data?.bookingContext || null,
});

export const aiChat = async (payload) => {
  const res = await axios.post("/api/ai/chat", payload, { timeout: 30000 });
  return normalizeAiResponse(res.data?.DT || null);
};

export const aiConfirmAction = async (action) => {
  const res = await axios.post("/api/ai/confirm", { action }, { timeout: 30000 });
  return res.data?.DT || null;
};
