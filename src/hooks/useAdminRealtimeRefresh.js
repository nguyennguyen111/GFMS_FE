import { useEffect, useRef } from "react";
import { connectSocket } from "../services/socketClient";
import { getSessionUser } from "../services/authSession";

const normalize = (value) => String(value || "").trim().toLowerCase();
const sortedJoin = (list) => (Array.isArray(list) && list.length ? [...list].map(String).sort().join("\u0001") : "");

export default function useAdminRealtimeRefresh({
  enabled = true,
  onRefresh,
  events = ["notification:new", "maintenance:changed", "purchase:changed"],
  notificationTypes = [],
  debounceMs = 500,
}) {
  const refreshRef = useRef(onRefresh);
  const timerRef = useRef(null);
  const eventsKey = sortedJoin(events);
  const typesKey = sortedJoin(notificationTypes);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const user = getSessionUser();
    const isAdmin = Number(user?.groupId ?? user?.group_id) === 1;
    if (!enabled || !isAdmin || typeof refreshRef.current !== "function") return undefined;

    const socket = connectSocket();
    const acceptedTypes = (notificationTypes || []).map(normalize).filter(Boolean);
    const handlers = {};

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        Promise.resolve(refreshRef.current?.()).catch(() => {});
      }, debounceMs);
    };

    events.forEach((eventName) => {
      handlers[eventName] = (payload) => {
        if (eventName === "notification:new" && acceptedTypes.length) {
          const incoming = normalize(payload?.notificationType || payload?.type);
          if (!acceptedTypes.includes(incoming)) return;
        }
        schedule();
      };
      socket.on(eventName, handlers[eventName]);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((eventName) => socket.off(eventName, handlers[eventName]));
    };
  }, [enabled, eventsKey, typesKey, debounceMs]);
}
