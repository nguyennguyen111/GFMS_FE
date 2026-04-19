import React, { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, MapPin, Mic, Paperclip, Search, SendHorizonal, Square } from "lucide-react";
import "./MemberMessagesPage.css";
import "../member-pages.css";
import { getEligibleConversations } from "../../../services/memberMessageService";
import { uploadChatAsset } from "../../../services/chatUploadService";
import useConversationSocket from "../../../hooks/useConversationSocket";
import { decodeChatPayload, encodeChatPayload, previewTextFromPayload } from "../../../utils/chatPayload";
import { showAppToast } from "../../../utils/appToast";
import { connectSocket } from "../../../services/socketClient";

const PLACEHOLDER = "https://placehold.co/96x96/101317/D6FF00?text=GFMS";

function isUsableAvatarUrl(v) {
  if (v == null || typeof v !== "string") return false;
  const s = v.trim();
  if (!s || /default-avatar/i.test(s)) return false;
  return /^https?:\/\//i.test(s);
}

function pickPtAvatarForMember(trainerAvatar, senderAvatar) {
  if (isUsableAvatarUrl(trainerAvatar)) return trainerAvatar.trim();
  if (isUsableAvatarUrl(senderAvatar)) return String(senderAvatar).trim();
  const t = trainerAvatar && String(trainerAvatar).trim();
  if (t) return t;
  return PLACEHOLDER;
}

function fmtTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

function MessageContent({ msg }) {
  const payload = decodeChatPayload(msg.content);
  if (payload.type === "image") {
    return <a className="mm2-asset-image" href={payload.url} target="_blank" rel="noreferrer"><img src={payload.url} alt={payload.fileName || "image"} /></a>;
  }
  if (payload.type === "file") {
    return <a className="mm2-asset-file" href={payload.url} target="_blank" rel="noreferrer"><strong>{payload.fileName || "Tệp đính kèm"}</strong><span>{payload.text || "Mở tệp"}</span></a>;
  }
  if (payload.type === "audio") {
    return <div className="mm2-asset-audio"><audio controls src={payload.url} /></div>;
  }
  if (payload.type === "location") {
    const href = `https://www.google.com/maps?q=${payload.lat},${payload.lng}`;
    return <a className="mm2-asset-file" href={href} target="_blank" rel="noreferrer"><strong>Vị trí được chia sẻ</strong><span>{payload.text || `${payload.lat}, ${payload.lng}`}</span></a>;
  }
  return <div className="mm2-bubble-text">{payload.text || msg.content}</div>;
}

export default function MemberMessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [activePeerUserId, setActivePeerUserId] = useState(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState("");
  const [pendingAsset, setPendingAsset] = useState(null);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef(null);
  const mediaRef = useRef(null);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const imageRef = useRef(null);
  const typingTimerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getEligibleConversations();
        if (!mounted) return;
        const normalized = Array.isArray(data) ? data : [];
        setConversations(normalized);
        if (normalized.length && !activePeerUserId) setActivePeerUserId(normalized[0].trainerUserId);
      } catch (e) {
        if (mounted) setError(e?.response?.data?.message || e.message || "Không tải được danh sách hội thoại.");
      } finally {
        if (mounted) setLoadingList(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const onFocus = async () => {
      try {
        const data = await getEligibleConversations();
        const normalized = Array.isArray(data) ? data : [];
        setConversations(normalized);
        if (normalized.length && !activePeerUserId) setActivePeerUserId(normalized[0].trainerUserId);
      } catch {}
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [activePeerUserId]);

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((item) => [item.trainerName, item.lastMessage, item.packageName, item.gymName].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [conversations, query]);

  const activeConversation = useMemo(() => conversations.find((item) => Number(item.trainerUserId) === Number(activePeerUserId)) || null, [conversations, activePeerUserId]);
  const { messages, loading, sendMessage, emitTyping, peerTyping } = useConversationSocket({ peerUserId: activeConversation?.trainerUserId, conversationKey: activeConversation?.conversationKey });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, activePeerUserId, peerTyping]);

  const updateConversationPreview = (text) => {
    if (!activeConversation) return;
    setConversations((prev) => prev
      .map((item) => Number(item.trainerUserId) === Number(activeConversation.trainerUserId) ? { ...item, lastMessage: text, lastMessageAt: new Date().toISOString() } : item)
      .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)));
  };

  useEffect(() => {
    const socket = connectSocket();

    const onNewMessage = (payload) => {
      const senderId = Number(payload?.senderId || 0);
      const receiverId = Number(payload?.receiverId || 0);
      const previewText = previewTextFromPayload(decodeChatPayload(payload?.content || "")) || "Tin nhắn mới";

      setConversations((prev) => {
        const matched = prev.find((item) => Number(item.trainerUserId) === senderId || Number(item.trainerUserId) === receiverId);
        if (!matched) return prev;

        const trainerUserId = Number(matched.trainerUserId);
        const next = prev.map((item) => {
          if (Number(item.trainerUserId) !== trainerUserId) return item;
          const isIncoming = senderId === trainerUserId;
          const isActive = Number(activePeerUserId) === trainerUserId;
          return {
            ...item,
            lastMessage: previewText,
            lastMessageAt: payload?.createdAt || new Date().toISOString(),
            unreadCount: isIncoming && !isActive ? Number(item.unreadCount || 0) + 1 : 0,
          };
        });
        return next.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
      });
    };

    const onRead = (payload) => {
      const peerUserId = Number(payload?.peerUserId || 0);
      if (!peerUserId) return;
      setConversations((prev) => prev.map((item) => Number(item.trainerUserId) === peerUserId ? { ...item, unreadCount: 0 } : item));
    };

    socket.on("message:new", onNewMessage);
    socket.on("message:read", onRead);

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("message:read", onRead);
    };
  }, [activeConversation?.trainerUserId, activePeerUserId]);

  const handleSelectConversation = (trainerUserId) => {
    setActivePeerUserId(trainerUserId);
    setConversations((prev) => prev.map((item) => Number(item.trainerUserId) === Number(trainerUserId) ? { ...item, unreadCount: 0 } : item));
  };

  const handleDraftChange = (value) => {
    setDraft(value);
    emitTyping(Boolean(value.trim()));
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => emitTyping(false), 900);
  };

  const handleFilePicked = (file, typeHint = "file") => {
    if (!file) return;
    const kind = typeHint === "image" ? "image" : (file.type?.startsWith("image/") ? "image" : "file");
    const preview = kind === "image" ? URL.createObjectURL(file) : null;
    setError("");
    setPendingAsset({ file, kind, preview, fileName: file.name, text: kind === "image" ? "[Ảnh]" : `[File] ${file.name}` });
  };

  const uploadAndSendAsset = async () => {
    if (!pendingAsset || !activeConversation) return;
    const json = await uploadChatAsset(pendingAsset.file, pendingAsset.kind);
    const content = encodeChatPayload({ type: pendingAsset.kind, url: json.url, fileName: pendingAsset.fileName, text: pendingAsset.text, mimeType: pendingAsset.file.type, __gfmsChat: true });
    await sendMessage(content);
    updateConversationPreview(pendingAsset.text);
    if (pendingAsset.preview) URL.revokeObjectURL(pendingAsset.preview);
    setPendingAsset(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!activeConversation) return;
    if (pendingAsset) {
      try { await uploadAndSendAsset(); } catch (err) { setError(err?.response?.data?.message || err.message || "Không gửi được tệp đính kèm."); }
      return;
    }
    const text = draft.trim();
    if (!text) return;
    if (text.length > 1000) return setError("Tin nhắn tối đa 1000 ký tự.");
    try {
      const content = encodeChatPayload({ type: "text", text });
      await sendMessage(content);
      setDraft("");
      emitTyping(false);
      updateConversationPreview(text);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Gửi tin nhắn thất bại.");
    }
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation || !activeConversation) return setError("Trình duyệt chưa hỗ trợ chia sẻ vị trí.");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const payload = { type: "location", lat: pos.coords.latitude, lng: pos.coords.longitude, text: "Nhấn để mở Google Maps" };
        await sendMessage(encodeChatPayload(payload));
        updateConversationPreview("[Vị trí]");
      } catch (err) { setError(err?.message || "Không gửi được vị trí."); }
    }, () => setError("Bạn chưa cấp quyền vị trí."), { enableHighAccuracy: true, timeout: 10000 });
  };

  const toggleRecord = async () => {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = stream;
      const chunks = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => e.data?.size && chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || "audio/webm" });
        setPendingAsset({ file, kind: "audio", preview: null, fileName: file.name, text: "[Ghi âm]" });
        mediaRef.current?.getTracks?.().forEach((t) => t.stop());
      };
      recorder.start();
      setRecording(true);
    } catch {
      showAppToast({ type: "error", title: "Micro", message: "Bạn chưa cấp quyền micro." });
    }
  };

  return (
    <div className="mh-wrap mm2-page">
      <div className="mh-head mm2-head"><div><span className="mm2-kicker">Trung tâm liên lạc</span><h2 className="mh-title mm2-title">Tin nhắn với PT</h2></div></div>
      {error ? <div className="m-error">{error}</div> : null}
      <div className="mm2-shell">
        <aside className="mm2-sidebar m-card">
          <div className="mm2-sidebar-top">
            <div><h3 className="mm2-panel-title">Hội thoại</h3><p className="mm2-panel-sub">Chọn PT để xem và trả lời nhanh.</p></div>
            <label className="mm2-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm PT..." autoComplete="off" /></label>
          </div>
          <div className="mm2-list">
            {loadingList ? <div className="m-empty">Đang tải danh sách hội thoại...</div> : null}
            {!loadingList && !filteredConversations.length ? <div className="m-empty">Bạn chưa có PT nào đủ điều kiện để chat.</div> : null}
            {filteredConversations.map((item) => {
              const isActive = Number(activePeerUserId) === Number(item.trainerUserId);
              return <button type="button" key={item.conversationKey || item.trainerUserId} className={`mm2-row ${isActive ? "active" : ""}`} onClick={() => handleSelectConversation(item.trainerUserId)}>
                <img className="mm2-avatar" src={pickPtAvatarForMember(item.trainerAvatar, null)} alt={item.trainerName || "PT"} />
                <div className="mm2-row-body"><div className="mm2-row-head"><strong>{item.trainerName || "PT"}</strong><span>{fmtTime(item.lastMessageAt)}</span></div><p>{previewTextFromPayload(item.lastMessage) || item.packageName || "Sẵn sàng hỗ trợ bạn."}</p></div>
                {item.unreadCount > 0 ? <span className="mm2-unread">{item.unreadCount}</span> : null}
              </button>;
            })}
          </div>
        </aside>

        <section className="mm2-chat m-card">
          {!activeConversation ? <div className="mm2-empty">Chọn một hội thoại để bắt đầu nhắn tin.</div> : <>
            <header className="mm2-chat-head"><div className="mm2-chat-user"><img className="mm2-avatar large" src={pickPtAvatarForMember(activeConversation.trainerAvatar, null)} alt={activeConversation.trainerName || "PT"} /><div><h3>{activeConversation.trainerName}</h3><p>{activeConversation.packageName ? `Gói: ${activeConversation.packageName}` : "Kênh liên lạc với PT"}</p></div></div></header>
            <div className="mm2-messages">
              {loading ? <div className="m-empty">Đang tải hội thoại...</div> : null}
              {!loading && !messages.length ? <div className="m-empty">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện.</div> : null}
              {messages.map((msg) => {
                const mine = Number(msg.senderId) !== Number(activeConversation.trainerUserId);
                return <div key={msg.id} className={`mm2-bubble-row ${mine ? "mine" : "theirs"}`}>
                  {!mine ? <img className="mm2-msg-avatar" src={pickPtAvatarForMember(activeConversation.trainerAvatar, msg.sender?.avatar)} alt={msg.sender?.username || activeConversation.trainerName || "PT"} /> : null}
                  <div className="mm2-bubble-wrap"><div className="mm2-bubble"><MessageContent msg={msg} /></div><div className="mm2-meta">{fmtTime(msg.createdAt)} {mine ? (msg.isRead ? "• Đã xem" : "• Đã gửi") : ""}</div></div>
                </div>;
              })}
              {peerTyping ? <div className="mm2-typing">PT đang nhập...</div> : null}
              <div ref={endRef} />
            </div>
            {pendingAsset ? <div className="mm2-pending">{pendingAsset.preview ? <img src={pendingAsset.preview} alt="preview" /> : null}<div><strong>{pendingAsset.fileName}</strong><span>{pendingAsset.kind === "audio" ? "Ghi âm sẵn sàng gửi" : pendingAsset.kind === "image" ? "Ảnh sẵn sàng gửi" : "Tệp sẵn sàng gửi"}</span></div><button type="button" onClick={() => setPendingAsset(null)}>Huỷ</button></div> : null}
            <form className="mm2-compose" onSubmit={submit}>
              <div className="mm2-tools">
                <button type="button" className="mm2-tool" onClick={() => imageRef.current?.click()}><ImagePlus size={16} /></button>
                <button type="button" className="mm2-tool" onClick={() => fileRef.current?.click()}><Paperclip size={16} /></button>
                <button type="button" className={`mm2-tool ${recording ? "recording" : ""}`} onClick={toggleRecord}>{recording ? <Square size={15} /> : <Mic size={16} />}</button>
                <button type="button" className="mm2-tool" onClick={handleShareLocation}><MapPin size={16} /></button>
                <input ref={imageRef} hidden type="file" accept="image/*" onChange={(e) => handleFilePicked(e.target.files?.[0], "image")} />
                <input ref={fileRef} hidden type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,audio/*" onChange={(e) => handleFilePicked(e.target.files?.[0], "file")} />
              </div>
              <input className="mm2-input" value={draft} onChange={(e) => handleDraftChange(e.target.value)} placeholder={pendingAsset ? "Nhấn gửi để chuyển tệp đính kèm..." : "Nhập nội dung cho PT..."} autoComplete="off" />
              <button className="mm2-send" type="submit" disabled={!draft.trim() && !pendingAsset} aria-label="Gửi tin nhắn"><SendHorizonal size={18} /></button>
            </form>
          </>}
        </section>
      </div>
    </div>
  );
}
