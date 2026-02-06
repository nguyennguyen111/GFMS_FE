import { io } from "socket.io-client";

let socketInstance;

const getAccessToken = () => {
  const t1 = localStorage.getItem("accessToken");
  if (t1) return t1;
  try {
    const raw = localStorage.getItem("user");
    const data = raw ? JSON.parse(raw) : null;
    return (
      data?.accessToken ||
      data?.access_Token ||
      data?.token ||
      data?.DT?.accessToken ||
      data?.DT?.access_Token ||
      null
    );
  } catch {
    return null;
  }
};

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io("http://localhost:8080", {
      autoConnect: false,
      transports: ["websocket"],
      auth: { token: getAccessToken() },
    });
  }
  return socketInstance;
};

export const connectSocket = () => {
  const socket = getSocket();
  socket.auth = { token: getAccessToken() };
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};
