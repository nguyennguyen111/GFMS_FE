import axios from "../../setup/axios";
import { connectSocket } from "../../services/socketClient";

export const getEligibleConversations = async () => {
  const res = await axios.get("/api/messages/eligible");
  return res.data?.data || [];
};

export const getConversationMessages = async (peerUserId) => {
  const res = await axios.get(`/api/messages/with/${peerUserId}`);
  return res.data?.data || [];
};

export const sendConversationMessage = async (peerUserId, content) => {
  const res = await axios.post(`/api/messages/with/${peerUserId}`, { content });
  return res.data?.data;
};

export const markConversationRead = async (peerUserId) => {
  const res = await axios.patch(`/api/messages/with/${peerUserId}/read`);
  return res.data?.data;
};

export const joinConversationSocket = (conversationKey) => {
  const socket = connectSocket();
  socket.emit("conversation:join", { conversationKey });
  return socket;
};

export const leaveConversationSocket = (conversationKey) => {
  const socket = connectSocket();
  socket.emit("conversation:leave", { conversationKey });
};
