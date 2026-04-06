import { useEffect, useRef } from "react";
import { connectSocket } from "../services/socketClient";
import { getCurrentUser } from "../utils/auth";

const DEFAULT_EVENTS = [
  "notification:new",
  "booking:status-changed",
  "withdrawal:created",
  "withdrawal:approved",
  "withdrawal:rejected",
  "trainer_share:changed",
];

const normalizeType = (value) => String(value || "").trim().toLowerCase();

const matchesNotificationType = (payload, notificationTypes) => {
  if (!notificationTypes.length) return true;
  const incomingType = normalizeType(payload?.notificationType || payload?.type);
  return notificationTypes.includes(incomingType);
};

export default function useOwnerRealtimeRefresh({
  enabled = true,
  onRefresh,
  events = DEFAULT_EVENTS,
  notificationTypes = [],
  debounceMs = 500,
}) {
  const refreshRef = useRef(onRefresh);
  const timerRef = useRef(null);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const user = getCurrentUser();
    const groupId = Number(user?.groupId ?? user?.group_id ?? 0);

    if (!enabled || groupId !== 2 || typeof refreshRef.current !== "function") {
      return undefined;
    }

    const socket = connectSocket();
    const normalizedNotificationTypes = notificationTypes.map(normalizeType).filter(Boolean);
    const handlers = {};

    const scheduleRefresh = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        Promise.resolve(refreshRef.current?.()).catch(() => {});
      }, debounceMs);
    };

    events.forEach((eventName) => {
      handlers[eventName] = (payload) => {
        if (eventName === "notification:new" && !matchesNotificationType(payload, normalizedNotificationTypes)) {
          return;
        }

        scheduleRefresh();
      };

      socket.on(eventName, handlers[eventName]);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      events.forEach((eventName) => {
        socket.off(eventName, handlers[eventName]);
      });
    };
  }, [debounceMs, enabled, JSON.stringify(events), JSON.stringify(notificationTypes)]);
}