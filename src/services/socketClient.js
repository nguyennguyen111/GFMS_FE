import { io } from "socket.io-client";
import { getAccessToken } from "./authSession";

let socketInstance;

export const getSocket = () => {
  if (!socketInstance) {
    const envBase = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_BASE;
    const winBase = typeof window !== "undefined" ? window.__API_BASE__ : null;
    const base = (envBase || winBase || "http://localhost:8080").toString().replace(/\/+$/, "");

    socketInstance = io(base, {
      autoConnect: false,
      auth: { token: getAccessToken() },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
};

export const connectSocket = () => {
  const socket = getSocket();
  socket.auth = { token: getAccessToken() };
  if (!socket.connected) socket.connect();
  return socket;
};

export const disconnectSocket = () => {
  if (!socketInstance) return;
  socketInstance.removeAllListeners();
  if (socketInstance.connected) socketInstance.disconnect();
};
