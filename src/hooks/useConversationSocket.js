import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connectSocket } from "../services/socketClient";
import {
  getConversationMessages,
  markConversationRead,
  sendConversationMessage,
} from "../services/memberMessageService";

function getStoredCurrentUserId() {
  try {
    const raw = localStorage.getItem("user");
    const parsed = raw ? JSON.parse(raw) : null;
    const user = parsed?.user || parsed || {};
    return Number(user?.id || user?.userId || localStorage.getItem("userId") || 0);
  } catch {
    return Number(localStorage.getItem("userId") || 0);
  }
}

export default function useConversationSocket({ peerUserId, conversationKey }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const typingTimer = useRef(null);
  const sendingRef = useRef(false);
  const lastSendRef = useRef({ key: "", at: 0 });

  useEffect(() => {
    if (!peerUserId || !conversationKey) {
      setMessages([]);
      setLoading(false);
      setPeerTyping(false);
      return undefined;
    }

    const socket = connectSocket();
    let mounted = true;
    setLoading(true);
    socket.emit("conversation:join", { conversationKey });

    (async () => {
      try {
        const data = await getConversationMessages(peerUserId);
        if (!mounted) return;
        setMessages(Array.isArray(data) ? data : []);
        await markConversationRead(peerUserId);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const onNew = async (payload) => {
      if (payload?.conversationKey !== conversationKey) return;
      setMessages((prev) => (prev.some((x) => Number(x.id) === Number(payload.id)) ? prev : [...prev, payload]));
      if (Number(payload?.senderId) === Number(peerUserId)) {
        try { await markConversationRead(peerUserId); } catch {}
      }
    };

    const onRead = () => {
      setMessages((prev) => prev.map((x) => (Number(x.receiverId) === Number(peerUserId) ? { ...x, isRead: true } : x)));
    };

    const onTyping = (payload) => {
      if (payload?.conversationKey !== conversationKey) return;
      if (Number(payload?.senderId) !== Number(peerUserId)) return;
      setPeerTyping(Boolean(payload?.isTyping));
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      typingTimer.current = window.setTimeout(() => setPeerTyping(false), 1800);
    };

    socket.on("message:new", onNew);
    socket.on("message:read", onRead);
    socket.on("conversation:typing", onTyping);

    return () => {
      mounted = false;
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      socket.off("message:new", onNew);
      socket.off("message:read", onRead);
      socket.off("conversation:typing", onTyping);
      socket.emit("conversation:leave", { conversationKey });
    };
  }, [peerUserId, conversationKey]);

  const sendMessage = useCallback(async (content) => {
    const messageKey = String(content || "");
    const nowTs = Date.now();
    if (sendingRef.current) return null;
    if (
      messageKey &&
      messageKey === lastSendRef.current.key &&
      nowTs - Number(lastSendRef.current.at || 0) < 1200
    ) {
      return null;
    }

    const tempId = `tmp-${nowTs}-${Math.random().toString(16).slice(2)}`;
    const currentUserId = getStoredCurrentUserId();
    const optimistic = {
      id: tempId,
      senderId: currentUserId,
      receiverId: Number(peerUserId),
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
      __pending: true,
    };

    sendingRef.current = true;
    setMessages((prev) => [...prev, optimistic]);

    try {
      const saved = await sendConversationMessage(peerUserId, content);
      setMessages((prev) => {
        const withoutTemp = prev.filter((x) => String(x.id) !== tempId);
        return withoutTemp.some((x) => Number(x.id) === Number(saved?.id)) ? withoutTemp : [...withoutTemp, saved];
      });
      lastSendRef.current = { key: messageKey, at: nowTs };
      return saved;
    } catch (err) {
      setMessages((prev) => prev.filter((x) => String(x.id) !== tempId));
      throw err;
    } finally {
      sendingRef.current = false;
    }
  }, [peerUserId]);

  const emitTyping = useCallback((isTyping) => {
    if (!conversationKey) return;
    const socket = connectSocket();
    socket.emit("conversation:typing", { conversationKey, peerUserId, isTyping });
  }, [conversationKey, peerUserId]);

  return useMemo(() => ({ messages, loading, sendMessage, emitTyping, peerTyping }), [messages, loading, sendMessage, emitTyping, peerTyping]);
}
