import { io } from "socket.io-client";

let socketInstance;

const getAccessToken = () => {
  const t1 = localStorage.getItem("accessToken");
  if (t1) return t1;
  try {
    const raw = localStorage.getItem("user");
    const data = raw ? JSON.parse(raw) : null;
    return data?.accessToken || data?.access_Token || data?.token || data?.DT?.accessToken || data?.DT?.access_Token || null;
  } catch {
    return null;
  }
};

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
