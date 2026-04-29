import { useEffect, useMemo, useState } from "react";
import { connectSocket, disconnectSocket } from "../services/socketClient";
import {
  getAdminNotifications,
  markAllAdminNotificationsRead,
  markAdminNotificationRead,
} from "../services/adminNotificationService";
import { getAccessToken, getSessionUser } from "../services/authSession";

export default function useAdminRealtimeNotifications() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const reloadFromServer = async () => {
    const data = await getAdminNotifications();
    setItems(data?.items || []);
    setUnreadCount(data?.unreadCount || 0);
  };

  useEffect(() => {
    const token = getAccessToken();
    const user = getSessionUser();
    const isAdmin = Number(user?.groupId ?? user?.group_id) === 1;
    if (!token || !isAdmin) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      return undefined;
    }

    let mounted = true;
    const socket = connectSocket();

    const boot = async () => {
      try {
        const data = await getAdminNotifications();
        if (!mounted) return;
        setItems(data?.items || []);
        setUnreadCount(data?.unreadCount || 0);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    boot();

    const onNew = (payload) => {
      setItems((prev) => [payload, ...prev.filter((x) => Number(x.id) !== Number(payload.id))]);
      setUnreadCount((prev) => prev + 1);
    };
    const onRead = ({ id }) => {
      setItems((prev) => {
        let shouldDecrease = false;
        const next = prev.map((x) => {
          if (Number(x.id) !== Number(id)) return x;
          if (!x.isRead) shouldDecrease = true;
          return { ...x, isRead: true };
        });
        if (shouldDecrease) {
          setUnreadCount((prevCount) => Math.max(0, prevCount - 1));
        }
        return next;
      });
    };
    const onReadAll = () => {
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setUnreadCount(0);
    };

    socket.on("notification:new", onNew);
    socket.on("notification:read", onRead);
    socket.on("notification:read-all", onReadAll);

    const onAuth = () => {
      disconnectSocket();
      connectSocket();
      boot();
    };
    window.addEventListener("authChanged", onAuth);

    return () => {
      mounted = false;
      socket.off("notification:new", onNew);
      socket.off("notification:read", onRead);
      socket.off("notification:read-all", onReadAll);
      window.removeEventListener("authChanged", onAuth);
    };
  }, []);

  return useMemo(
    () => ({
      items,
      unreadCount,
      loading,
      markOne: async (id) => {
        await markAdminNotificationRead(id);
        await reloadFromServer();
      },
      markAll: async () => {
        await markAllAdminNotificationsRead();
        await reloadFromServer();
      },
      refresh: async () => {
        await reloadFromServer();
      },
    }),
    [items, unreadCount, loading]
  );
}
