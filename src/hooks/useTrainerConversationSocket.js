import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connectSocket } from "../services/socketClient";
import {
  getTrainerConversationMessages,
  markTrainerConversationRead,
  sendTrainerConversationMessage,
} from "../services/trainerMessageService";

export default function useTrainerConversationSocket({ peerUserId, conversationKey }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const typingTimer = useRef(null);

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
        const data = await getTrainerConversationMessages(peerUserId);
        if (!mounted) return;
        setMessages(Array.isArray(data) ? data : []);
        await markTrainerConversationRead(peerUserId);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const onNew = async (payload) => {
      if (payload?.conversationKey !== conversationKey) return;
      setMessages((prev) => (prev.some((x) => Number(x.id) === Number(payload.id)) ? prev : [...prev, payload]));
      window.dispatchEvent(new Event("trainerMessagesChanged"));
      if (Number(payload?.senderId) === Number(peerUserId)) {
        try { await markTrainerConversationRead(peerUserId); } catch {}
      }
    };
    const onRead = () => {
      setMessages((prev) => prev.map((x) => (Number(x.receiverId) === Number(peerUserId) ? { ...x, isRead: true } : x)));
      window.dispatchEvent(new Event("trainerMessagesChanged"));
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
    const saved = await sendTrainerConversationMessage(peerUserId, content);
    setMessages((prev) => (prev.some((x) => Number(x.id) === Number(saved?.id)) ? prev : [...prev, saved]));
    window.dispatchEvent(new Event("trainerMessagesChanged"));
    return saved;
  }, [peerUserId]);

  const emitTyping = useCallback((isTyping) => {
    if (!conversationKey) return;
    const socket = connectSocket();
    socket.emit("conversation:typing", { conversationKey, peerUserId, isTyping });
  }, [conversationKey, peerUserId]);

  return useMemo(() => ({ messages, loading, sendMessage, emitTyping, peerTyping }), [messages, loading, sendMessage, emitTyping, peerTyping]);
}
