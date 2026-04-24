import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, MapPin, Mic, Paperclip, Search, SendHorizonal, Square } from "lucide-react";
import "../member/pages/MemberMessagesPage.css";
import "./PTMessagesPage.css";
import { getTrainerEligibleConversations } from "../../services/trainerMessageService";
import { uploadChatAsset } from "../../services/chatUploadService";
import { connectSocket } from "../../services/socketClient";
import useTrainerConversationSocket from "../../hooks/useTrainerConversationSocket";
import { decodeChatPayload, encodeChatPayload, previewTextFromPayload } from "../../utils/chatPayload";
import { showAppToast } from "../../utils/appToast";

const PLACEHOLDER = "https://placehold.co/96x96/101317/D6FF00?text=GFMS";

const safeAvatar = (url) => {
  const s = String(url || "").trim();
  if (!s) return PLACEHOLDER;
  if (/default-avatar/i.test(s)) return PLACEHOLDER;
  if (!/^https?:\/\//i.test(s)) return PLACEHOLDER;
  return s;
};

const fmtTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      })
    : "";

function MessageContent({ msg }) {
  const payload = decodeChatPayload(msg.content);

  if (payload.type === "image") {
    return (
      <a className="mm2-asset-image" href={payload.url} target="_blank" rel="noreferrer">
        <img src={payload.url} alt={payload.fileName || "image"} />
      </a>
    );
  }

  if (payload.type === "file") {
    return (
      <a className="mm2-asset-file" href={payload.url} target="_blank" rel="noreferrer">
        <strong>{payload.fileName || "Tệp đính kèm"}</strong>
        <span>{payload.text || "Mở tệp"}</span>
      </a>
    );
  }

  if (payload.type === "audio") {
    return (
      <div className="mm2-asset-audio">
        <audio controls src={payload.url} />
      </div>
    );
  }

  if (payload.type === "location") {
    return (
      <a
        className="mm2-asset-file"
        href={`https://www.google.com/maps?q=${payload.lat},${payload.lng}`}
        target="_blank"
        rel="noreferrer"
      >
        <strong>Vị trí được chia sẻ</strong>
        <span>{payload.text || `${payload.lat}, ${payload.lng}`}</span>
      </a>
    );
  }

  return <div className="mm2-bubble-text">{payload.text || msg.content}</div>;
}

export default function PTMessagesPage() {
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

  const loadConversations = useCallback(async (mountedRef = { current: true }) => {
    try {
      const data = await getTrainerEligibleConversations();
      if (!mountedRef.current) return;

      const normalized = Array.isArray(data) ? data : [];
      setConversations(normalized);
      setActivePeerUserId((current) => current || normalized[0]?.memberUserId || null);
      setError("");
    } catch (e) {
      if (mountedRef.current) {
        setError(e?.response?.data?.message || e.message || "Không tải được danh sách hội thoại.");
      }
    } finally {
      if (mountedRef.current) setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    const mountedRef = { current: true };
    loadConversations(mountedRef);

    return () => {
      mountedRef.current = false;
    };
  }, [loadConversations]);

  useEffect(() => {
    const socket = connectSocket();

    const onNotificationNew = (payload) => {
      const type = String(payload?.notificationType || "").toLowerCase();
      if (type !== "chat") return;
      loadConversations();
    };

    const onRealtimeMessage = () => {
      loadConversations();
    };

    socket.on("notification:new", onNotificationNew);
    socket.on("message:new", onRealtimeMessage);

    return () => {
      socket.off("notification:new", onNotificationNew);
      socket.off("message:new", onRealtimeMessage);
    };
  }, [loadConversations]);

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;

    return conversations.filter((item) =>
      [item.memberName, item.lastMessage]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [conversations, query]);

  const activeConversation = useMemo(
    () =>
      conversations.find((item) => Number(item.memberUserId) === Number(activePeerUserId)) ||
      null,
    [conversations, activePeerUserId]
  );

  const { messages, loading, sendMessage, emitTyping, peerTyping } =
    useTrainerConversationSocket({
      peerUserId: activeConversation?.memberUserId,
      conversationKey: activeConversation?.conversationKey,
    });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, peerTyping, activePeerUserId]);

  const updateConversationPreview = (text) => {
    setConversations((prev) =>
      prev
        .map((item) =>
          Number(item.memberUserId) === Number(activeConversation?.memberUserId)
            ? { ...item, lastMessage: text, lastMessageAt: new Date().toISOString() }
            : item
        )
        .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
    );
  };

  const handleDraftChange = (value) => {
    setDraft(value);
    emitTyping(Boolean(value.trim()));

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => emitTyping(false), 900);
  };

  const handleFilePicked = (file, typeHint = "file") => {
    if (!file) return;

    const kind = typeHint === "image" ? "image" : file.type?.startsWith("image/") ? "image" : "file";

    setPendingAsset({
      file,
      kind,
      preview: kind === "image" ? URL.createObjectURL(file) : null,
      fileName: file.name,
      text: kind === "image" ? "[Ảnh]" : `[File] ${file.name}`,
    });
  };

  const uploadAndSendAsset = async () => {
    if (!pendingAsset || !activeConversation) return;

    const json = await uploadChatAsset(pendingAsset.file, pendingAsset.kind);

    await sendMessage(
      encodeChatPayload({
        type: pendingAsset.kind,
        url: json.url,
        fileName: pendingAsset.fileName,
        text: pendingAsset.text,
        mimeType: pendingAsset.file.type,
      })
    );

    updateConversationPreview(pendingAsset.text);

    if (pendingAsset.preview) {
      URL.revokeObjectURL(pendingAsset.preview);
    }

    setPendingAsset(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!activeConversation) return;

    try {
      if (pendingAsset) {
        await uploadAndSendAsset();
        return;
      }

      const text = draft.trim();
      if (!text) return;

      setDraft("");
      emitTyping(false);
      updateConversationPreview(text);

      await sendMessage(encodeChatPayload({ type: "text", text }));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Gửi tin nhắn thất bại.");
    }
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation || !activeConversation) {
      setError("Trình duyệt chưa hỗ trợ chia sẻ vị trí.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await sendMessage(
            encodeChatPayload({
              type: "location",
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              text: "Nhấn để mở Google Maps",
            })
          );
          updateConversationPreview("[Vị trí]");
        } catch (err) {
          setError(err?.message || "Không gửi được vị trí.");
        }
      },
      () => setError("Bạn chưa cấp quyền vị trí."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSelectConversation = (memberUserId) => {
    setActivePeerUserId(memberUserId);
    setConversations((prev) =>
      prev.map((item) =>
        Number(item.memberUserId) === Number(memberUserId)
          ? { ...item, unreadCount: 0 }
          : item
      )
    );
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

      recorder.ondataavailable = (e) => {
        if (e.data?.size) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: blob.type || "audio/webm",
        });

        setPendingAsset({
          file,
          kind: "audio",
          preview: null,
          fileName: file.name,
          text: "[Ghi âm]",
        });

        mediaRef.current?.getTracks?.().forEach((t) => t.stop());
      };

      recorder.start();
      setRecording(true);
    } catch {
      showAppToast({
        type: "error",
        title: "Micro",
        message: "Bạn chưa cấp quyền micro.",
      });
    }
  };

  return (
    <div className="ptm-page">

      {error ? <div className="m-error">{error}</div> : null}

      <div className="mm2-shell ptm-shell">
        <aside className="mm2-sidebar m-card">
          <div className="mm2-sidebar-top">
            <div>
              <h3 className="mm2-panel-title">Hội viên</h3>
              <p className="mm2-panel-sub">Danh sách hội thoại đang hoạt động.</p>
            </div>

            <label className="mm2-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm hội viên..."
                autoComplete="off"
              />
            </label>
          </div>

          <div className="mm2-list">
            {loadingList ? <div className="m-empty">Đang tải danh sách hội thoại...</div> : null}

            {!loadingList && !filteredConversations.length ? (
              <div className="m-empty">Chưa có hội viên nào nhắn tin với bạn.</div>
            ) : null}

            {filteredConversations.map((item) => (
              <button
                type="button"
                key={item.conversationKey || item.memberUserId}
                className={`mm2-row ${
                  Number(activePeerUserId) === Number(item.memberUserId) ? "active" : ""
                }`}
                onClick={() => handleSelectConversation(item.memberUserId)}
              >
                <img
                  className="mm2-avatar"
                  src={safeAvatar(item.memberAvatar)}
                  alt={item.memberName || "Hội viên"}
                />

                <div className="mm2-row-body">
                  <div className="mm2-row-head">
                    <strong>{item.memberName || "Hội viên"}</strong>
                    <span>{fmtTime(item.lastMessageAt)}</span>
                  </div>
                  <p>{previewTextFromPayload(item.lastMessage) || "Sẵn sàng hỗ trợ hội viên."}</p>
                </div>

                {item.unreadCount > 0 ? (
                  <span className="mm2-unread">{item.unreadCount}</span>
                ) : null}
              </button>
            ))}
          </div>
        </aside>

        <section className="mm2-chat m-card">
          {!activeConversation ? (
            <div className="mm2-empty">Chọn một hội viên để bắt đầu trả lời.</div>
          ) : (
            <>
              <header className="mm2-chat-head">
                <div className="mm2-chat-user">
                  <img
                    className="mm2-avatar large"
                    src={safeAvatar(activeConversation.memberAvatar)}
                    alt={activeConversation.memberName || "Hội viên"}
                  />

                  <div>
                    <h3>{activeConversation.memberName}</h3>
                    <p>
                      {activeConversation.packageName
                        ? `Gói: ${activeConversation.packageName}`
                        : "Kênh hỗ trợ hội viên"}
                    </p>
                  </div>
                </div>
              </header>

              <div className="mm2-messages">
                {loading ? <div className="m-empty">Đang tải hội thoại...</div> : null}

                {!loading && !messages.length ? (
                  <div className="m-empty">Chưa có tin nhắn nào.</div>
                ) : null}

                {messages.map((msg) => {
                  const mine = Number(msg.senderId) !== Number(activeConversation.memberUserId);

                  return (
                    <div key={msg.id} className={`mm2-bubble-row ${mine ? "mine" : "theirs"}`}>
                      {!mine ? (
                        <img
                          className="mm2-msg-avatar"
                          src={safeAvatar(msg.sender?.avatar || activeConversation.memberAvatar)}
                          alt={msg.sender?.username || activeConversation.memberName || "Hội viên"}
                        />
                      ) : null}

                      <div className="mm2-bubble-wrap">
                        <div className="mm2-bubble">
                          <MessageContent msg={msg} />
                        </div>

                        <div className="mm2-meta">
                          {fmtTime(msg.createdAt)}{" "}
                          {mine ? (msg.isRead ? "• Đã xem" : "• Đã gửi") : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {peerTyping ? <div className="mm2-typing">Hội viên đang nhập...</div> : null}
                <div ref={endRef} />
              </div>

              {pendingAsset ? (
                <div className="mm2-pending">
                  {pendingAsset.preview ? <img src={pendingAsset.preview} alt="preview" /> : null}

                  <div>
                    <strong>{pendingAsset.fileName}</strong>
                    <span>
                      {pendingAsset.kind === "audio"
                        ? "Ghi âm sẵn sàng gửi"
                        : pendingAsset.kind === "image"
                        ? "Ảnh sẵn sàng gửi"
                        : "Tệp sẵn sàng gửi"}
                    </span>
                  </div>

                  <button type="button" onClick={() => setPendingAsset(null)}>
                    Huỷ
                  </button>
                </div>
              ) : null}

              <form className="mm2-compose" onSubmit={submit}>
                <div className="mm2-tools">
                  <button type="button" className="mm2-tool" onClick={() => imageRef.current?.click()}>
                    <ImagePlus size={16} />
                  </button>

                  <button type="button" className="mm2-tool" onClick={() => fileRef.current?.click()}>
                    <Paperclip size={16} />
                  </button>

                  <button
                    type="button"
                    className={`mm2-tool ${recording ? "recording" : ""}`}
                    onClick={toggleRecord}
                  >
                    {recording ? <Square size={15} /> : <Mic size={16} />}
                  </button>

                  <button type="button" className="mm2-tool" onClick={handleShareLocation}>
                    <MapPin size={16} />
                  </button>

                  <input
                    ref={imageRef}
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFilePicked(e.target.files?.[0], "image")}
                  />

                  <input
                    ref={fileRef}
                    hidden
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,audio/*"
                    onChange={(e) => handleFilePicked(e.target.files?.[0], "file")}
                  />
                </div>

                <input
                  className="mm2-input"
                  value={draft}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  placeholder={pendingAsset ? "Nhấn gửi để chuyển tệp đính kèm..." : "Trả lời hội viên..."}
                  autoComplete="off"
                />

                <button
                  className="mm2-send"
                  type="submit"
                  disabled={!draft.trim() && !pendingAsset}
                  aria-label="Gửi tin nhắn"
                >
                  <SendHorizonal size={18} />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}