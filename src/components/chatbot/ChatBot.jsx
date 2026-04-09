import React, { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bot,
  MessageCircle,
  Send,
  Sparkles,
  X,
  ChevronRight,
  Loader2,
  CalendarDays,
  Dumbbell,
  Package,
  Activity,
} from "lucide-react";
import "./ChatBot.css";
import { aiChat, aiConfirmAction } from "../../services/aiService";
import { getAccessToken } from "../../services/authSession";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readAuth = () => ({
  token: getAccessToken(),
  role: localStorage.getItem("role"),
  username: localStorage.getItem("username") || "bạn",
});

const buildPageContext = (pathname) => {
  const ctx = { pathname };

  const pkgDetail = pathname.match(/^\/member\/my-packages\/(\d+)$/);
  if (pkgDetail) ctx.activationId = Number(pkgDetail[1]);

  if (pathname.startsWith("/member/booking/wizard")) {
    ctx.pageType = "booking_wizard";
  } else if (pathname.startsWith("/member/my-packages")) {
    ctx.pageType = "my_packages";
  } else if (pathname.startsWith("/member/bookings")) {
    ctx.pageType = "my_bookings";
  } else if (pathname.startsWith("/member/progress")) {
    ctx.pageType = "progress";
  } else if (pathname.startsWith("/marketplace/trainers")) {
    ctx.pageType = "trainers";
  } else if (pathname.startsWith("/marketplace/gyms")) {
    ctx.pageType = "gyms";
  } else {
    ctx.pageType = "general";
  }

  return ctx;
};

const normalizeSuggestions = (suggestions) => {
  if (!Array.isArray(suggestions)) return [];
  return suggestions
    .map((item) => {
      if (!item) return null;

      if (typeof item === "string") {
        return {
          type: "message",
          label: item,
          value: item,
        };
      }

      if (item.type === "action") {
        return {
          type: "action",
          label: item.label || "Mở",
          action: item.action || null,
        };
      }

      return {
        type: "message",
        label: item.label || item.value || "",
        value: item.value || item.label || "",
      };
    })
    .filter(Boolean);
};

export default function ChatBot() {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);

  const { token, role, username } = readAuth();
  const isMember = !!token && role === "member";

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([
    {
      id: uid(),
      role: "assistant",
      content: isMember
        ? `Chào ${username}, mình là GFMS AI Assistant. Mình có thể giúp bạn xem gói hiện tại, kiểm tra lịch đã đặt, giải thích BMI và hỗ trợ đặt lịch PT.`
        : "Chào bạn, mình là GFMS AI Assistant. Mình có thể tư vấn gym, PT, gói tập và dẫn bạn tới đúng trang trong hệ thống.",
      suggestions: normalizeSuggestions(
        isMember
          ? [
              { type: "message", label: "Tôi còn bao nhiêu buổi?", value: "Tôi còn bao nhiêu buổi?" },
              { type: "message", label: "Lịch tập sắp tới của tôi", value: "Lịch tập sắp tới của tôi" },
              { type: "message", label: "Đặt lịch PT", value: "Tôi muốn đặt lịch PT" },
            ]
          : [
              { type: "message", label: "Gói nào phù hợp cho người mới?", value: "Gói nào phù hợp cho người mới?" },
              { type: "message", label: "PT nào phù hợp để giảm mỡ?", value: "PT nào phù hợp để giảm mỡ?" },
              { type: "action", label: "Xem danh sách gym", action: { type: "NAVIGATE_TO_PAGE", label: "Xem danh sách gym", payload: { path: "/marketplace/gyms" } } },
            ]
      ),
      proposedAction: null,
      requiresConfirmation: false,
    },
  ]);

  const quickActions = useMemo(() => {
    if (isMember) {
      return [
        { icon: <Package size={14} />, label: "Gói của tôi", mode: "action", action: { type: "NAVIGATE_TO_PAGE", label: "Mở gói của tôi", payload: { path: "/member/my-packages" } } },
        { icon: <CalendarDays size={14} />, label: "Lịch đã đặt", mode: "action", action: { type: "NAVIGATE_TO_PAGE", label: "Mở lịch đã đặt", payload: { path: "/member/bookings" } } },
        { icon: <Dumbbell size={14} />, label: "Đặt lịch PT", mode: "message", prompt: "Tôi muốn đặt lịch PT" },
        { icon: <Activity size={14} />, label: "BMI / tiến độ", mode: "action", action: { type: "NAVIGATE_TO_PAGE", label: "Mở trang tiến độ", payload: { path: "/member/progress" } } },
      ];
    }

    return [
      { icon: <Package size={14} />, label: "Tư vấn gói", mode: "message", prompt: "Gói nào phù hợp cho người mới?" },
      { icon: <Dumbbell size={14} />, label: "Tư vấn PT", mode: "message", prompt: "PT nào phù hợp để giảm mỡ?" },
      { icon: <CalendarDays size={14} />, label: "Xem gym", mode: "action", action: { type: "NAVIGATE_TO_PAGE", label: "Xem danh sách gym", payload: { path: "/marketplace/gyms" } } },
    ];
  }, [isMember]);

  const appendMessage = (msg) => {
    setMessages((prev) => [...prev, { id: uid(), ...msg }]);
  };

  const handleNavigateAction = (action) => {
    const path = action?.payload?.path;
    if (path) navigate(path);
  };

  const sendMessage = async (rawText) => {
    const message = String(rawText || "").trim();
    if (!message || loading) return;

    const pageContext = buildPageContext(location.pathname);
    const nextUserMsg = { id: uid(), role: "user", content: message };

    setMessages((prev) => [...prev, nextUserMsg]);
    setText("");
    setLoading(true);

    try {
      const history = [...messages, nextUserMsg].slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const data = await aiChat({
        message,
        history,
        pageContext,
      });

      appendMessage({
        role: "assistant",
        content: data?.reply || "Mình chưa thể phản hồi lúc này.",
        suggestions: normalizeSuggestions(data?.suggestions || []),
        proposedAction: data?.proposedAction || null,
        requiresConfirmation: !!data?.requiresConfirmation,
      });
    } catch (e) {
      appendMessage({
        role: "assistant",
        content: e?.response?.data?.EM || e?.message || "Đã có lỗi khi gọi AI assistant.",
        suggestions: [],
        proposedAction: null,
        requiresConfirmation: false,
      });
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleConfirm = async (action) => {
    if (!action || loading) return;
    setLoading(true);

    try {
      const data = await aiConfirmAction(action);
      appendMessage({
        role: "assistant",
        content: data?.reply || "Thao tác đã được thực hiện.",
        suggestions: normalizeSuggestions(
          data?.followUpAction
            ? [{ type: "action", label: data.followUpAction.label || "Mở trang liên quan", action: data.followUpAction }]
            : []
        ),
        proposedAction: null,
        requiresConfirmation: false,
      });
    } catch (e) {
      appendMessage({
        role: "assistant",
        content: e?.response?.data?.EM || e?.message || "Không thể xác nhận thao tác này.",
        suggestions: [],
        proposedAction: null,
        requiresConfirmation: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    sendMessage(text);
  };

  const handleSuggestionClick = (item) => {
    if (!item) return;
    if (item.type === "action" && item.action) {
      handleNavigateAction(item.action);
      return;
    }
    sendMessage(item.value || item.label);
  };

  return (
    <div className="gfms-ai-chatbox-root">
      {!open && (
        <button className="gfms-ai-fab" onClick={() => setOpen(true)} type="button">
          <MessageCircle size={20} />
          <span>AI</span>
        </button>
      )}

      {open && (
        <div className="gfms-ai-panel">
          <div className="gfms-ai-header">
            <div className="gfms-ai-header-left">
              <div className="gfms-ai-badge">
                <Bot size={16} />
              </div>
              <div>
                <div className="gfms-ai-title">GFMS AI Assistant</div>
                <div className="gfms-ai-subtitle">
                  {isMember
                    ? "Tư vấn, tra cứu gói và hỗ trợ đặt lịch PT"
                    : "Tư vấn gym, PT và gói tập cho bạn"}
                </div>
              </div>
            </div>

            <button className="gfms-ai-close" onClick={() => setOpen(false)} type="button">
              <X size={18} />
            </button>
          </div>

          <div className="gfms-ai-quick-actions">
            {quickActions.map((item) => (
              <button
                key={item.label}
                type="button"
                className="gfms-ai-chip"
                onClick={() => {
                  if (item.mode === "action") handleNavigateAction(item.action);
                  else sendMessage(item.prompt);
                }}
                disabled={loading}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="gfms-ai-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`gfms-ai-message ${msg.role === "user" ? "is-user" : "is-assistant"}`}
              >
                <div className="gfms-ai-bubble">
                  <p>{msg.content}</p>

                  {!!msg.suggestions?.length && (
                    <div className="gfms-ai-suggestions">
                      {msg.suggestions.map((s, index) => (
                        <button
                          key={`${s.label}-${index}`}
                          type="button"
                          className={`gfms-ai-suggestion-btn ${s.type === "action" ? "is-action" : ""}`}
                          onClick={() => handleSuggestionClick(s)}
                          disabled={loading}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {!!msg.proposedAction && !msg.requiresConfirmation && (
                    <div className="gfms-ai-action-card">
                      <button
                        type="button"
                        className="gfms-ai-action-btn"
                        onClick={() => handleNavigateAction(msg.proposedAction)}
                      >
                        <span>{msg.proposedAction?.label || "Mở trang"}</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}

                  {!!msg.proposedAction && !!msg.requiresConfirmation && (
                    <div className="gfms-ai-action-card confirm-mode">
                      <div className="gfms-ai-action-note">
                        Thao tác này sẽ ghi dữ liệu thật vào hệ thống và chỉ chạy khi bạn xác nhận.
                      </div>
                      <button
                        type="button"
                        className="gfms-ai-confirm-btn"
                        onClick={() => handleConfirm(msg.proposedAction)}
                        disabled={loading}
                      >
                        {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                        <span>{msg.proposedAction?.label || "Xác nhận"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="gfms-ai-message is-assistant">
                <div className="gfms-ai-bubble typing">
                  <Loader2 size={16} className="spin" />
                  <span>GFMS AI đang xử lý...</span>
                </div>
              </div>
            )}
          </div>

          <form className="gfms-ai-input-wrap" onSubmit={onSubmit}>
            <input
              ref={inputRef}
              className="gfms-ai-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                isMember
                  ? "Ví dụ: Tôi còn bao nhiêu buổi? hoặc Đặt với PT Minh ngày 2026-03-30 lúc 18:00"
                  : "Ví dụ: Gói nào phù hợp để giảm mỡ?"
              }
            />
            <button className="gfms-ai-send" type="submit" disabled={loading || !text.trim()}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}