import { useEffect, useState } from "react";
import { getTrainerEligibleConversations } from "../services/trainerMessageService";
import { connectSocket } from "../services/socketClient";
import { getAccessToken, getCurrentUser } from "../utils/auth";

export default function useTrainerMessageUnread() {
  const [total, setTotal] = useState(0);
  const user = getCurrentUser();
  const token = getAccessToken();
  const groupId = Number(user?.groupId ?? user?.group_id ?? 0);

  useEffect(() => {
    if (!token || groupId !== 3) {
      setTotal(0);
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getTrainerEligibleConversations();
        if (cancelled) return;
        const n = (Array.isArray(rows) ? rows : []).reduce(
          (s, r) => s + Number(r?.unreadCount || 0),
          0
        );
        setTotal(n);
      } catch {
        if (!cancelled) setTotal(0);
      }
    };

    load();
    const socket = connectSocket();
    const onSocketUpdate = () => load();
    socket.on("message:new", onSocketUpdate);
    socket.on("message:read", onSocketUpdate);

    const id = setInterval(load, 30000);
    const onBump = () => load();
    window.addEventListener("trainerMessagesChanged", onBump);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("trainerMessagesChanged", onBump);
      socket.off("message:new", onSocketUpdate);
      socket.off("message:read", onSocketUpdate);
    };
  }, [groupId, token]);

  return total;
}
