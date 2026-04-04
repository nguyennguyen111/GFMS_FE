import { useEffect, useMemo, useState } from "react";
import { connectSocket } from "../services/socketClient";
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from "../services/memberNotificationService";

export default function useRealtimeNotifications() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const role = localStorage.getItem("role");
    if (!token || role !== "member") {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      return undefined;
    }

    let mounted = true;
    const socket = connectSocket();

    const boot = async () => {
      try {
        const data = await getMyNotifications();
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
      setItems((prev) => prev.map((x) => (Number(x.id) === Number(id) ? { ...x, isRead: true } : x)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    };
    const onReadAll = () => {
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setUnreadCount(0);
    };

    socket.on("notification:new", onNew);
    socket.on("notification:read", onRead);
    socket.on("notification:read-all", onReadAll);

    return () => {
      mounted = false;
      socket.off("notification:new", onNew);
      socket.off("notification:read", onRead);
      socket.off("notification:read-all", onReadAll);
    };
  }, []);

  return useMemo(() => ({
    items,
    unreadCount,
    loading,
    markOne: async (id) => {
      await markNotificationRead(id);
      setItems((prev) => prev.map((x) => (Number(x.id) === Number(id) ? { ...x, isRead: true } : x)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    markAll: async () => {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setUnreadCount(0);
    },
  }), [items, unreadCount, loading]);
}
