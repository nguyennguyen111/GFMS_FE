import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import "./ChatBot.css";
import { aiChat } from "../../services/aiService";
import { getCurrentUser, getAccessToken, isLoggedIn } from "../../utils/auth";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const CHATBOT_SESSION_KEY = "gfms_ai_chat_session_v5";

const readAuthState = () => {
  const user = getCurrentUser();
  const token = getAccessToken();

  if (!user || !token || !isLoggedIn()) {
    return {
      token: null,
      role: null,
      username: "bạn",
      isMember: false,
      userId: null,
      authKey: "guest",
    };
  }

  const derivedRole =
    user.role ||
    (Array.isArray(user.roles) && user.roles.includes("member") ? "member" : null) ||
    (user.groupId === 4 ? "member" : null);

  const isMember = derivedRole === "member";

  return {
    token,
    role: derivedRole,
    username: user.username || user.email || "bạn",
    isMember,
    userId: user.id || null,
    authKey: isMember ? `member:${user.id || user.username || "unknown"}` : `user:${user.id || user.username || "unknown"}`,
  };
};

const buildPageContext = (pathname) => {
  const ctx = { pathname };
  const pkgDetail = pathname.match(/^\/member\/my-packages\/(\d+)$/);
  if (pkgDetail) ctx.activationId = Number(pkgDetail[1]);

  if (pathname.startsWith("/member/my-packages")) ctx.pageType = "my_packages";
  else if (pathname.startsWith("/member/bookings")) ctx.pageType = "my_bookings";
  else if (pathname.startsWith("/member/progress")) ctx.pageType = "progress";
  else if (pathname.startsWith("/marketplace/gyms")) ctx.pageType = "gyms";
  else if (pathname.startsWith("/marketplace/packages")) ctx.pageType = "packages";
  else if (pathname.startsWith("/marketplace/trainers")) ctx.pageType = "trainers";
  else ctx.pageType = "general";

  return ctx;
};

const createWelcomeMessage = (auth) => ({
  id: uid(),
  role: "assistant",
  content: auth.isMember
    ? `Chào ${auth.username}, mình là trợ lý GFMS. Bạn cứ hỏi tự nhiên về lịch, gói tập, PT, ăn uống hoặc mục tiêu tập luyện nhé.`
    : "Chào bạn, mình là trợ lý GFMS. Bạn cứ hỏi tự nhiên về gym, PT, gói tập, ăn uống hoặc mục tiêu tập luyện nhé.",
  cards: null,
  actions: [],
});

const isNearBottom = (element, threshold = 120) => {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
};

function ActionButtons({ actions, onAction }) {
  if (!Array.isArray(actions) || !actions.length) return null;

  return (
    <div className="gfms-ai-inline-actions">
      {actions.map((action, index) => (
        <button
          key={`${action?.type || "action"}-${action?.label || index}-${index}`}
          type="button"
          className="gfms-ai-inline-action-btn"
          onClick={() => onAction(action)}
        >
          {action?.label || "Mở"}
        </button>
      ))}
    </div>
  );
}

function HorizontalCardList({ cards, onAction }) {
  const railRef = useRef(null);
  if (!cards?.items?.length) return null;

  const scrollByCard = (dir) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <div className="gfms-ai-card-block">
      {cards.title ? <div className="gfms-ai-card-block-title">{cards.title}</div> : null}

      {cards.items.length > 1 ? (
        <div className="gfms-ai-card-controls">
          <button type="button" className="gfms-ai-icon-btn" onClick={() => scrollByCard(-1)}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="gfms-ai-icon-btn" onClick={() => scrollByCard(1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      ) : null}

      <div ref={railRef} className="gfms-ai-card-rail">
        {cards.items.map((item) => {
          const clickable = typeof item?.action === "object" && item.action;
          return (
            <article
              key={item.id || item.title}
              className={`gfms-ai-card ${clickable ? "is-clickable" : ""}`}
              onClick={clickable ? () => onAction(item.action) : undefined}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") onAction(item.action);
                    }
                  : undefined
              }
            >
              <div
                className="gfms-ai-card-image"
                style={item.imageUrl ? { backgroundImage: `url(${item.imageUrl})` } : undefined}
              >
                {!item.imageUrl ? <div className="gfms-ai-card-image-fallback">{item.title?.[0] || "G"}</div> : null}
                {item.badge ? <span className="gfms-ai-card-badge">{item.badge}</span> : null}
              </div>

              <div className="gfms-ai-card-body">
                <div className="gfms-ai-card-title">{item.title}</div>
                {item.subtitle ? <div className="gfms-ai-card-subtitle">{item.subtitle}</div> : null}
                {item.meta ? <div className="gfms-ai-card-meta">{item.meta}</div> : null}

                {Array.isArray(item.tags) && item.tags.length ? (
                  <div className="gfms-ai-card-tags">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="gfms-ai-card-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                {item.action ? (
                  <button
                    type="button"
                    className="gfms-ai-card-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction(item.action);
                    }}
                  >
                    {item.actionLabel || item.action?.label || "Xem chi tiết"}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="gfms-ai-typing-dots" aria-label="Đang trả lời">
      <span />
      <span />
      <span />
    </div>
  );
}

export default function ChatBot() {
  const location = useLocation();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const messagesRef = useRef(null);

  const [authState, setAuthState] = useState(readAuthState());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([createWelcomeMessage(readAuthState())]);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const persistSession = (nextMessages, nextAuthKey = authState.authKey) => {
    try {
      sessionStorage.setItem(
        `${CHATBOT_SESSION_KEY}:${nextAuthKey}`,
        JSON.stringify({
          messages: nextMessages,
        })
      );
    } catch {}
  };

  const resetSessionForAuth = (nextAuth) => {
    const welcome = [createWelcomeMessage(nextAuth)];
    setAuthState(nextAuth);
    setMessages(welcome);
    setLoading(false);
    setText("");
    setShowScrollToBottom(false);
    persistSession(welcome, nextAuth.authKey);
  };

  useEffect(() => {
    const syncAuth = () => {
      const next = readAuthState();
      setAuthState((prev) => {
        if (prev.authKey !== next.authKey) {
          resetSessionForAuth(next);
          return next;
        }
        return next;
      });
    };

    window.addEventListener("authChanged", syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener("authChanged", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`${CHATBOT_SESSION_KEY}:${authState.authKey}`);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.messages) && parsed.messages.length) {
        setMessages(parsed.messages);
      }
    } catch {}
  }, [authState.authKey]);

  useEffect(() => {
    persistSession(messages);
  }, [messages]);

  useEffect(() => {
    const box = messagesRef.current;
    if (!box) return;
    if (isNearBottom(box)) {
      requestAnimationFrame(() => {
        box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
      });
    }
  }, [messages, loading]);

  const handleScroll = () => {
    const box = messagesRef.current;
    if (!box) return;
    setShowScrollToBottom(!isNearBottom(box));
  };

  const appendMessage = (msg) => {
    setMessages((prev) => [...prev, { id: uid(), ...msg }]);
  };

  const getSanitizedHistory = (currentMessages, nextUserMsg) => {
    return [...currentMessages, nextUserMsg]
      .filter((m) => ["user", "assistant"].includes(m.role))
      .slice(-10)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));
  };

  const runAction = async (action) => {
    if (!action?.type) return;

    if (action.type === "NAVIGATE_TO_PAGE") {
      const path = action?.payload?.path || "/";
      navigate(path);
      setOpen(false);
      return;
    }

    if (action.type === "AI_SET_PROMPT") {
      const prompt = action?.payload?.prompt;
      if (prompt) {
        setText(prompt);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  };

  const sendMessage = async (rawText) => {
    const currentAuth = readAuthState();

    if (currentAuth.authKey !== authState.authKey) {
      resetSessionForAuth(currentAuth);
      return;
    }

    const message = String(rawText || "").trim();
    if (!message || loading) return;

    const nextUserMsg = { id: uid(), role: "user", content: message };
    const pageContext = buildPageContext(location.pathname);
    const nextHistory = getSanitizedHistory(messages, nextUserMsg);

    setMessages((prev) => [...prev, nextUserMsg]);
    setText("");
    setLoading(true);

    try {
      const data = await aiChat({ message, history: nextHistory, pageContext });

      const newestAuth = readAuthState();
      if (newestAuth.authKey !== currentAuth.authKey) {
        resetSessionForAuth(newestAuth);
        return;
      }

      const actions = Array.isArray(data?.actions)
        ? data.actions
        : data?.proposedAction
        ? [data.proposedAction]
        : [];

      appendMessage({
        role: "assistant",
        content: data?.reply || "Mình chưa thể phản hồi lúc này.",
        cards: data?.cards || null,
        actions,
      });
    } catch (e) {
      appendMessage({
        role: "assistant",
        content: e?.response?.data?.EM || e?.message || "Đã có lỗi khi gọi AI assistant.",
        cards: null,
        actions: [],
      });
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  const statusText = authState.isMember ? `Đang hỗ trợ ${authState.username}` : "Hỗ trợ khách và thành viên";

  const emptyHints = useMemo(
    () =>
      authState.isMember
        ? ["Lịch tuần này của tôi", "Gói của tôi", "Gợi ý PT phù hợp"]
        : ["Gợi ý vài gym phù hợp", "Tôi nên ăn gì", "Tôi muốn tìm PT cho người mới"],
    [authState.isMember]
  );

  const showIntroHero = messages.length === 1 && messages[0]?.role === "assistant";

  return (
    <div className="gfms-ai-chatbox-root">
      {!open ? (
        <button className="gfms-ai-fab" onClick={() => setOpen(true)} type="button">
          <MessageCircle size={20} />
          <span>Trợ lý AI</span>
        </button>
      ) : null}

      {open ? (
        <div className="gfms-ai-panel">
          <div className="gfms-ai-header">
            <div className="gfms-ai-header-left">
              <div className="gfms-ai-badge">
                <Bot size={17} />
              </div>
              <div>
                <div className="gfms-ai-title">GFMS AI Assistant</div>
                <div className="gfms-ai-subtitle">{statusText}</div>
              </div>
            </div>

            <button className="gfms-ai-close" onClick={() => setOpen(false)} type="button">
              <X size={18} />
            </button>
          </div>

          <div className="gfms-ai-messages" ref={messagesRef} onScroll={handleScroll}>
            {showIntroHero ? (
              <div className="gfms-ai-hero">
                <div className="gfms-ai-hero-icon"><Bot size={22} /></div>
                <div className="gfms-ai-hero-title">Xin chào, mình là GFMS AI</div>
                <div className="gfms-ai-hero-subtitle">Bạn cứ chat tự nhiên. Mình sẽ trả lời ngắn gọn, đúng trọng tâm và bám dữ liệu hệ thống khi cần.</div>
                <div className="gfms-ai-hero-hints">Ví dụ: {emptyHints.join(" • ")}</div>
              </div>
            ) : null}

            {messages.map((msg, index) => (
              showIntroHero && index === 0 ? null : <div key={msg.id} className={`gfms-ai-message ${msg.role === "user" ? "is-user" : "is-assistant"}`}>
                <div className="gfms-ai-bubble">
                  <p className="gfms-ai-message-text">{msg.content}</p>
                  {msg.cards ? <HorizontalCardList cards={msg.cards} onAction={runAction} /> : null}
                  {msg.role === "assistant" ? <ActionButtons actions={msg.actions} onAction={runAction} /> : null}
                </div>
              </div>
            ))}

            {loading ? (
              <div className="gfms-ai-message is-assistant">
                <div className="gfms-ai-bubble typing">
                  <TypingDots />
                </div>
              </div>
            ) : null}
          </div>

          {showScrollToBottom ? (
            <button
              type="button"
              className="gfms-ai-scroll-bottom"
              onClick={() => messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" })}
            >
              <ChevronRight size={16} style={{ transform: "rotate(90deg)" }} />
            </button>
          ) : null}

          <form
            className="gfms-ai-input-wrap"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(text);
            }}
          >
            <input
              ref={inputRef}
              className="gfms-ai-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Hỏi tự nhiên như: tuần này tôi có lịch gì, tôi nên ăn gì..."
            />
            <button className="gfms-ai-send" type="submit" disabled={loading || !text.trim()}>
              <Send size={18} />
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
