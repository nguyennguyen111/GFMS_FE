import { useEffect, useMemo, useState } from "react";
import { connectSocket } from "../services/socketClient";
import { getCurrentUser } from "../utils/auth";
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from "../services/memberNotificationService";
import { getOwnerNotifications, markAllOwnerNotificationsRead, markOwnerNotificationRead } from "../services/ownerNotificationService";
import { getTrainerNotifications, markAllTrainerNotificationsRead, markTrainerNotificationRead } from "../services/trainerNotificationService";
import { getAccessToken } from "../utils/auth";

const toPositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const shouldIncludeNotification = (item, groupId, gymId) => {
  if (Number(groupId) !== 2) return true;

  const scopedGymId = toPositiveInt(gymId);
  if (!scopedGymId) return true;

  const gymIds = Array.isArray(item?.gymIds)
    ? item.gymIds.map(toPositiveInt).filter(Boolean)
    : [];

  return gymIds.length === 0 || gymIds.includes(scopedGymId);
};

const resolveNotificationApi = () => {
  const user = getCurrentUser();
  const groupId = Number(user?.groupId ?? user?.group_id ?? 0);

  if (groupId === 2) {
    return {
      supported: true,
      fetcher: getOwnerNotifications,
      markOne: markOwnerNotificationRead,
      markAll: markAllOwnerNotificationsRead,
    };
  }

  if (groupId === 3) {
    return {
      supported: true,
      fetcher: getTrainerNotifications,
      markOne: markTrainerNotificationRead,
      markAll: markAllTrainerNotificationsRead,
    };
  }

  if (groupId === 4) {
    return {
      supported: true,
      fetcher: getMyNotifications,
      markOne: markNotificationRead,
      markAll: markAllNotificationsRead,
    };
  }

  return {
    supported: false,
    fetcher: null,
    markOne: null,
    markAll: null,
  };
};

export default function useRealtimeNotifications(options = {}) {
  const { gymId = null, enabled = true } = options || {};
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const token = getAccessToken();
  const user = getCurrentUser();
  const groupId = Number(user?.groupId ?? user?.group_id ?? 0);

  useEffect(() => {
    const api = resolveNotificationApi();
    if (!enabled || !token || !api.supported) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      return undefined;
    }

    let mounted = true;
    const socket = connectSocket();
    setLoading(true);

    const boot = async () => {
      try {
        const params = Number(groupId) === 2 && toPositiveInt(gymId) ? { gymId: toPositiveInt(gymId) } : {};
        const data = await api.fetcher(params);
        if (!mounted) return;
        setItems((data?.items || []).filter((item) => shouldIncludeNotification(item, groupId, gymId)));
        setUnreadCount(data?.unreadCount || 0);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    boot();

    const onNew = (payload) => {
      if (!shouldIncludeNotification(payload, groupId, gymId)) return;
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
  }, [enabled, groupId, gymId]);

  const api = resolveNotificationApi();

  return useMemo(() => ({
    items,
    unreadCount,
    loading,
    markOne: async (id) => {
      if (!api.markOne) return;
      setItems((prev) => prev.map((x) => (Number(x.id) === Number(id) ? { ...x, isRead: true } : x)));
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await api.markOne(id);
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    },
    markAll: async () => {
      if (!api.markAll) return;
      const params = Number(groupId) === 2 && toPositiveInt(gymId) ? { gymId: toPositiveInt(gymId) } : {};
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setUnreadCount(0);

      try {
        await api.markAll(params);
      } catch (error) {
        console.error("Failed to mark all notifications as read:", error);
      }
    },
  }), [api, groupId, gymId, items, unreadCount, loading]);
}
