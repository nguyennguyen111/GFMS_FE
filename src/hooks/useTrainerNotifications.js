import { useEffect, useMemo, useState } from "react";
import { connectSocket } from "../services/socketClient";
import {
  getTrainerNotifications,
  markAllTrainerNotificationsRead,
  markTrainerNotificationRead,
} from "../services/trainerNotificationService";
import { getCurrentUser } from "../utils/auth";
import { getAccessToken } from "../utils/auth";
import { isTrainerRelevantNotification } from "../utils/ptNotificationFilter";

export default function useTrainerNotifications() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const user = getCurrentUser();
  const token = getAccessToken();
  const gid = Number(user?.groupId ?? user?.group_id ?? 0);
  const reloadFromServer = async () => {
    const data = await getTrainerNotifications();
    const raw = data?.items || [];
    const filtered = raw.filter(isTrainerRelevantNotification);
    setItems(filtered);
    setUnreadCount(filtered.filter((x) => !x.isRead).length);
  };

  useEffect(() => {
    if (!token || gid !== 3) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      return undefined;
    }

    let mounted = true;
    const socket = connectSocket();

    const boot = async () => {
      try {
        const data = await getTrainerNotifications();
        if (!mounted) return;
        const raw = data?.items || [];
        const filtered = raw.filter(isTrainerRelevantNotification);
        setItems(filtered);
        setUnreadCount(filtered.filter((x) => !x.isRead).length);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    boot();

    const onNew = (payload) => {
      if (!isTrainerRelevantNotification(payload)) return;
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

    return () => {
      mounted = false;
      socket.off("notification:new", onNew);
      socket.off("notification:read", onRead);
      socket.off("notification:read-all", onReadAll);
    };
  }, [token, gid]);

  return useMemo(
    () => ({
      items,
      unreadCount,
      loading,
      markOne: async (id) => {
        await markTrainerNotificationRead(id);
        await reloadFromServer();
      },
      markAll: async () => {
        await markAllTrainerNotificationsRead();
        await reloadFromServer();
      },
    }),
    [items, unreadCount, loading]
  );
}
