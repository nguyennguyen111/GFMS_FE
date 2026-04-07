import { useEffect, useState } from "react";
import { getTrainerEligibleConversations } from "../services/trainerMessageService";
import { getCurrentUser } from "../utils/auth";

export default function useTrainerMessageUnread() {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const user = getCurrentUser();
    if (Number(user?.groupId ?? user?.group_id ?? 0) !== 3) {
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
    const id = setInterval(load, 30000);
    const onBump = () => load();
    window.addEventListener("trainerMessagesChanged", onBump);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("trainerMessagesChanged", onBump);
    };
  }, []);

  return total;
}
