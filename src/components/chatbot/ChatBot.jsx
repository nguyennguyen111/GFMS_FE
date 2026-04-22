import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import "./ChatBot.css";
import { aiChat } from "../../services/aiService";
import { getCurrentUser, getAccessToken, isLoggedIn } from "../../utils/auth";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const CHATBOT_SESSION_KEY = "gfms_ai_chat_session_v6";
const CHATBOT_BOOKING_CONTEXT_KEY = "gfms_ai_booking_context_v2";
const CHATBOT_PREFERENCE_KEY = "gfms_ai_user_preferences_v1";

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
    authKey: isMember
      ? `member:${user.id || user.username || "unknown"}`
      : `user:${user.id || user.username || "unknown"}`,
  };
};

const buildPageContext = (pathname) => {
  const ctx = { pathname };
  const pkgDetail = pathname.match(/^\/member\/my-packages\/(\d+)$/);
  if (pkgDetail) ctx.activationId = Number(pkgDetail[1]);

  if (pathname.startsWith("/member/my-packages")) ctx.pageType = "my_packages";
  else if (pathname.startsWith("/member/bookings")) ctx.pageType = "my_bookings";
  else if (pathname.startsWith("/member/progress")) ctx.pageType = "progress";
  else if (pathname.startsWith("/member/reviews")) ctx.pageType = "reviews";
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
    ? `Chào ${auth.username}, mình là trợ lý GFMS. Mình có thể nhớ luồng bạn đang làm để hỗ trợ nhanh hơn.`
    : "Chào bạn, mình là trợ lý GFMS. Mình có thể gợi ý gym, gói tập, PT và điều hướng nhanh đúng trang cần mở.",
  cards: null,
  actions: [],
});

const isNearBottom = (element, threshold = 120) => {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
};

const readPreferences = (authKey) => {
  try {
    const raw = localStorage.getItem(`${CHATBOT_PREFERENCE_KEY}:${authKey}`);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
};

const mergeCountMap = (prevMap = {}, key) => {
  if (!key) return prevMap || {};
  return {
    ...(prevMap || {}),
    [key]: Number(prevMap?.[key] || 0) + 1,
  };
};

const pickTopKey = (map) => {
  const rows = Object.entries(map || {});
  if (!rows.length) return null;
  rows.sort((a, b) => Number(b[1]) - Number(a[1]));
  return rows[0]?.[0] || null;
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
    rail.scrollBy({ left: dir * 232, behavior: "smooth" });
  };

  return (
    <div className="gfms-ai-card-block">
      <div className="gfms-ai-card-block-head">
        {cards.title ? <div className="gfms-ai-card-block-title">{cards.title}</div> : <div />}
        {cards.items.length > 1 ? (
          <div className="gfms-ai-card-controls">
            <button type="button" className="gfms-ai-icon-btn" onClick={() => scrollByCard(-1)}>
              <ChevronLeft size={14} />
            </button>
            <button type="button" className="gfms-ai-icon-btn" onClick={() => scrollByCard(1)}>
              <ChevronRight size={14} />
            </button>
          </div>
        ) : null}
      </div>

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
                {!item.imageUrl ? (
                  <div className="gfms-ai-card-image-fallback">{item.title?.[0] || "G"}</div>
                ) : null}
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
  const shouldAutoScrollRef = useRef(true);

  const [authState, setAuthState] = useState(readAuthState());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([createWelcomeMessage(readAuthState())]);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [bookingContext, setBookingContext] = useState(null);
  const [userPreferences, setUserPreferences] = useState(readPreferences(readAuthState().authKey));

  const scrollToBottom = (behavior = "smooth") => {
    const box = messagesRef.current;
    if (!box) return;
    box.scrollTo({
      top: box.scrollHeight,
      behavior,
    });
  };

  const persistSession = (
    nextMessages,
    nextAuthKey = authState.authKey,
    nextBookingContext = bookingContext
  ) => {
    try {
      sessionStorage.setItem(
        `${CHATBOT_SESSION_KEY}:${nextAuthKey}`,
        JSON.stringify({
          messages: nextMessages,
          bookingContext: nextBookingContext || null,
        })
      );

      sessionStorage.setItem(
        `${CHATBOT_BOOKING_CONTEXT_KEY}:${nextAuthKey}`,
        JSON.stringify(nextBookingContext || null)
      );
    } catch {}
  };

  const persistPreferences = (nextPreferences, nextAuthKey = authState.authKey) => {
    try {
      localStorage.setItem(
        `${CHATBOT_PREFERENCE_KEY}:${nextAuthKey}`,
        JSON.stringify(nextPreferences || {})
      );
    } catch {}
  };

  const trackActionPreference = (action) => {
    if (!action?.type) return;

    setUserPreferences((prev) => {
      const next = {
        ...(prev || {}),
        lastActionType: action.type,
        lastUpdatedAt: Date.now(),
      };

      if (action.type === "NAVIGATE_TO_PAGE") {
        next.lastVisitedPath = action?.payload?.path || prev?.lastVisitedPath || "/";
        next.navCounts = mergeCountMap(prev?.navCounts, next.lastVisitedPath);
        next.favoritePath = pickTopKey(next.navCounts);
      }

      if (action.type === "AI_SELECT_TRAINER") {
        const trainerName = action?.payload?.trainerName || null;
        const trainerId = action?.payload?.trainerId || null;
        next.lastTrainerName = trainerName;
        next.lastTrainerId = trainerId;
        next.trainerCounts = mergeCountMap(prev?.trainerCounts, trainerName || String(trainerId || ""));
        next.favoriteTrainerName = pickTopKey(next.trainerCounts);
      }

      if (action.type === "AI_SELECT_PACKAGE") {
        const packageName = action?.payload?.packageName || null;
        const packageId = action?.payload?.packageId || null;
        next.lastPackageName = packageName;
        next.lastPackageId = packageId;
        next.packageCounts = mergeCountMap(prev?.packageCounts, packageName || String(packageId || ""));
        next.favoritePackageName = pickTopKey(next.packageCounts);
      }

      persistPreferences(next);
      return next;
    });
  };

  const trackMessagePreference = (message) => {
    const normalized = String(message || "").toLowerCase();

    setUserPreferences((prev) => {
      const next = {
        ...(prev || {}),
        lastMessageAt: Date.now(),
      };

      if (/đặt lịch|booking|book pt|book/.test(normalized)) {
        next.intentCounts = mergeCountMap(prev?.intentCounts, "booking");
      } else if (/pt|trainer|huấn luyện viên/.test(normalized)) {
        next.intentCounts = mergeCountMap(prev?.intentCounts, "trainer");
      } else if (/gói|package/.test(normalized)) {
        next.intentCounts = mergeCountMap(prev?.intentCounts, "package");
      } else if (/lịch/.test(normalized)) {
        next.intentCounts = mergeCountMap(prev?.intentCounts, "schedule");
      }

      next.favoriteIntent = pickTopKey(next.intentCounts);
      persistPreferences(next);
      return next;
    });
  };

  const resetSessionForAuth = (nextAuth) => {
    const welcome = [createWelcomeMessage(nextAuth)];
    setAuthState(nextAuth);
    setMessages(welcome);
    setBookingContext(null);
    setUserPreferences(readPreferences(nextAuth.authKey));
    setLoading(false);
    setText("");
    setShowScrollToBottom(false);
    shouldAutoScrollRef.current = true;
    persistSession(welcome, nextAuth.authKey, null);
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

      if (parsed?.bookingContext && typeof parsed.bookingContext === "object") {
        setBookingContext(parsed.bookingContext);
      } else {
        const rawBooking = sessionStorage.getItem(`${CHATBOT_BOOKING_CONTEXT_KEY}:${authState.authKey}`);
        if (rawBooking) {
          const parsedBooking = JSON.parse(rawBooking);
          setBookingContext(parsedBooking && typeof parsedBooking === "object" ? parsedBooking : null);
        } else {
          setBookingContext(null);
        }
      }

      setUserPreferences(readPreferences(authState.authKey));
    } catch {}
  }, [authState.authKey]);

  useEffect(() => {
    persistSession(messages, authState.authKey, bookingContext);
  }, [messages, bookingContext, authState.authKey]);

  useEffect(() => {
    const box = messagesRef.current;
    if (!box) return;

    if (shouldAutoScrollRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom(messages.length <= 2 ? "auto" : "smooth");
      });
    }
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      scrollToBottom("auto");
      inputRef.current?.focus();
    });
  }, [open]);

  const handleScroll = () => {
    const box = messagesRef.current;
    if (!box) return;

    const nearBottom = isNearBottom(box);
    shouldAutoScrollRef.current = nearBottom;
    setShowScrollToBottom(!nearBottom);
  };

  const appendMessage = (msg) => {
    setMessages((prev) => [...prev, { id: uid(), ...msg }]);
  };

  const getSanitizedHistory = (currentMessages, nextUserMsg) => {
    return [...currentMessages, nextUserMsg]
      .filter((m) => ["user", "assistant"].includes(m.role))
      .slice(-12)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));
  };

  const sendMessage = async (rawText, bookingContextOverride = null) => {
    const currentAuth = readAuthState();

    if (currentAuth.authKey !== authState.authKey) {
      resetSessionForAuth(currentAuth);
      return;
    }

    const message = String(rawText || "").trim();
    if (!message || loading) return;

    trackMessagePreference(message);

    const nextUserMsg = { id: uid(), role: "user", content: message };
    const pageContext = buildPageContext(location.pathname);
    const nextHistory = getSanitizedHistory(messages, nextUserMsg);
    const effectiveBookingContext = bookingContextOverride || bookingContext;

    shouldAutoScrollRef.current = true;
    setMessages((prev) => [...prev, nextUserMsg]);
    setText("");
    setLoading(true);

    try {
      const data = await aiChat({
        message,
        history: nextHistory,
        pageContext,
        bookingContext: effectiveBookingContext,
        userPreferences,
      });

      const newestAuth = readAuthState();
      if (newestAuth.authKey !== currentAuth.authKey) {
        resetSessionForAuth(newestAuth);
        return;
      }

      if (data?.bookingContext && typeof data.bookingContext === "object") {
        setBookingContext((prev) => ({
          ...(prev || {}),
          ...data.bookingContext,
        }));
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

  const runAction = async (action) => {
    if (!action?.type) return;
    trackActionPreference(action);

    if (action.type === "NAVIGATE_TO_PAGE") {
      const path = action?.payload?.path || "/";
      navigate(path);
      setOpen(false);
      return;
    }

    if (action.type === "AI_SET_PROMPT") {
      const prompt = action?.payload?.prompt;
      const nextBookingContext = action?.payload?.bookingContext || null;

      if (nextBookingContext) {
        setBookingContext((prev) => ({
          ...(prev || {}),
          ...nextBookingContext,
        }));
      }

      if (prompt) {
        setText(prompt);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return;
    }

    if (action.type === "AI_SELECT_TRAINER") {
      const trainerPayload = action?.payload || {};
      const nextBookingContext = {
        trainerId: trainerPayload.trainerId || null,
        trainerName: trainerPayload.trainerName || null,
        gymId: trainerPayload.gymId || null,
        gymName: trainerPayload.gymName || null,
        packageId: trainerPayload.packageId || null,
        packageName: trainerPayload.packageName || null,
        activationId: trainerPayload.activationId || bookingContext?.activationId || null,
        selectedDate: null,
        selectedTime: null,
        selectionSource: "trainer_card",
      };

      setBookingContext((prev) => ({
        ...(prev || {}),
        ...nextBookingContext,
      }));

      await sendMessage(
        `Tôi chọn PT ${trainerPayload.trainerName || ""}`.trim(),
        {
          ...(bookingContext || {}),
          ...nextBookingContext,
        }
      );
      return;
    }

    if (action.type === "AI_SELECT_PACKAGE") {
      const pkgPayload = action?.payload || {};
      const nextBookingContext = {
        packageId: pkgPayload.packageId || null,
        packageName: pkgPayload.packageName || null,
        gymId: pkgPayload.gymId || null,
        gymName: pkgPayload.gymName || null,
        trainerId: pkgPayload.trainerId || bookingContext?.trainerId || null,
        trainerName: pkgPayload.trainerName || bookingContext?.trainerName || null,
        activationId: pkgPayload.activationId || bookingContext?.activationId || null,
        selectedDate: pkgPayload.selectedDate || bookingContext?.selectedDate || null,
        selectedTime: null,
        selectionSource: "package_card",
      };

      setBookingContext((prev) => ({
        ...(prev || {}),
        ...nextBookingContext,
      }));

      await sendMessage(
        `Tôi chọn gói ${pkgPayload.packageName || ""}`.trim(),
        {
          ...(bookingContext || {}),
          ...nextBookingContext,
        }
      );
    }
  };

  const statusText = authState.isMember
    ? `Đang hỗ trợ ${authState.username}`
    : "Tư vấn gym, PT, gói tập";

  const habitHint = useMemo(() => {
    if (!userPreferences || typeof userPreferences !== "object") return null;
    if (userPreferences.favoriteTrainerName) return `Hay chọn PT ${userPreferences.favoriteTrainerName}`;
    if (userPreferences.favoritePackageName) return `Quan tâm ${userPreferences.favoritePackageName}`;
    if (userPreferences.favoriteIntent === "booking") return "Bạn hay dùng luồng đặt lịch";
    return null;
  }, [userPreferences]);

  const emptyHints = useMemo(
    () =>
      authState.isMember
        ? ["Lịch tuần này của tôi", "Gói của tôi", "Gợi ý PT phù hợp", "Đặt lịch với PT đang có"]
        : ["Gợi ý vài gym phù hợp", "Tôi nên ăn gì", "Tôi muốn tìm PT cho người mới"],
    [authState.isMember]
  );

  const showIntroHero = messages.length === 1 && messages[0]?.role === "assistant";

  return (
    <div className="gfms-ai-chatbox-root">
      {!open ? (
        <button className="gfms-ai-fab" onClick={() => setOpen(true)} type="button">
          <MessageCircle size={16} />
          <span>AI</span>
        </button>
      ) : null}

      {open ? (
        <div className="gfms-ai-panel">
          <div className="gfms-ai-header">
            <div className="gfms-ai-header-left">
              <div className="gfms-ai-badge">
                <Bot size={14} />
              </div>
              <div className="gfms-ai-header-copy">
                <div className="gfms-ai-title">GFMS AI Assistant</div>
                <div className="gfms-ai-subtitle">{statusText}</div>
                {habitHint ? (
                  <div className="gfms-ai-habit-row">
                    <Sparkles size={11} />
                    <span>{habitHint}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <button className="gfms-ai-close" onClick={() => setOpen(false)} type="button">
              <X size={15} />
            </button>
          </div>

          <div className="gfms-ai-messages" ref={messagesRef} onScroll={handleScroll}>
            {showIntroHero ? (
              <div className="gfms-ai-hero">
                <div className="gfms-ai-hero-icon">
                  <Bot size={18} />
                </div>
                <div className="gfms-ai-hero-title">Xin chào, mình là GFMS AI</div>
                <div className="gfms-ai-hero-subtitle">
                  Mình có thể tư vấn, nhớ luồng đang làm và đưa bạn tới đúng trang nhanh hơn.
                </div>

                <div className="gfms-ai-hero-hints">
                  {emptyHints.map((hint, index) => (
                    <button
                      key={`${hint}-${index}`}
                      type="button"
                      className="gfms-ai-suggestion-chip"
                      onClick={() => {
                        setText(hint);
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }}
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((msg, index) =>
              showIntroHero && index === 0 ? null : (
                <div
                  key={msg.id}
                  className={`gfms-ai-message ${msg.role === "user" ? "is-user" : "is-assistant"}`}
                >
                  <div className="gfms-ai-message-stack">
                    <div className="gfms-ai-bubble">
                      <p className="gfms-ai-message-text">{msg.content}</p>
                    </div>

                    {msg.cards ? <HorizontalCardList cards={msg.cards} onAction={runAction} /> : null}

                    {msg.role === "assistant" ? (
                      <ActionButtons actions={msg.actions} onAction={runAction} />
                    ) : null}
                  </div>
                </div>
              )
            )}

            {loading ? (
              <div className="gfms-ai-message is-assistant">
                <div className="gfms-ai-message-stack">
                  <div className="gfms-ai-bubble typing">
                    <TypingDots />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {showScrollToBottom ? (
            <button
              type="button"
              className="gfms-ai-scroll-bottom"
              onClick={() => {
                shouldAutoScrollRef.current = true;
                scrollToBottom("smooth");
              }}
            >
              <ChevronDown size={14} />
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
              placeholder="Nhập tin nhắn..."
            />
            <button className="gfms-ai-send" type="submit" disabled={loading || !text.trim()}>
              <Send size={15} />
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}