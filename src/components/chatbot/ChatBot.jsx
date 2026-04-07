import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Loader2,
  MessageCircle,
  Package,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import "./ChatBot.css";
import { aiChat, aiConfirmAction } from "../../services/aiService";
import { getCurrentUser, getAccessToken, isLoggedIn } from "../../utils/auth";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
    authKey: isMember ? `member:${user.id || user.username || "unknown"}` : "guest",
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

const normalizeSuggestions = (suggestions) => {
  if (!Array.isArray(suggestions)) return [];
  return suggestions
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") return { type: "message", label: item, value: item };
      if (item.type === "action") {
        return { type: "action", label: item.label || "Mở", action: item.action || null };
      }
      return {
        type: "message",
        label: item.label || item.value || "",
        value: item.value || item.label || "",
      };
    })
    .filter(Boolean);
};

const createWelcomeMessage = (auth) => ({
  id: uid(),
  role: "assistant",
  content: auth.isMember
    ? `Chào ${auth.username}, mình là GFMS AI Assistant. Mình có thể xem gói của bạn, lịch sắp tới, tư vấn ăn uống theo chỉ số gần nhất và hỗ trợ đặt lịch PT đúng flow gym → gói tập → PT.`
    : "Chào bạn, mình là GFMS AI Assistant. Bạn có thể hỏi tự nhiên như ăn gì, gym nào hợp, gói nào ổn, PT nào phù hợp hoặc nhập BMI để mình tư vấn sát hơn.",
  suggestions: normalizeSuggestions(
    auth.isMember
      ? [
          { type: "message", label: "Gói của tôi", value: "Gói của tôi" },
          { type: "message", label: "Lịch sắp tới", value: "Lịch sắp tới của tôi" },
          { type: "message", label: "Tôi nên ăn gì?", value: "Tôi nên ăn gì?" },
        ]
      : [
          { type: "message", label: "Tính BMI cho tôi", value: "Tôi cao 170cm nặng 65kg, hãy tính BMI và tư vấn cho tôi" },
          { type: "message", label: "Gợi ý gym cho tôi", value: "Gợi ý gym cho tôi" },
          { type: "message", label: "Tôi nên ăn gì?", value: "Tôi nên ăn gì?" },
        ]
  ),
  cards: null,
  proposedAction: null,
  requiresConfirmation: false,
  bmiSummary: null,
});

const buildQuickActions = (isMember) =>
  isMember
    ? [
        {
          icon: <Package size={14} />,
          label: "Gói của tôi",
          mode: "message",
          prompt: "Gói của tôi",
        },
        {
          icon: <CalendarDays size={14} />,
          label: "Lịch sắp tới",
          mode: "message",
          prompt: "Lịch sắp tới của tôi",
        },
        {
          icon: <Activity size={14} />,
          label: "BMI / dinh dưỡng",
          mode: "message",
          prompt: "Tôi nên ăn gì?",
        },
      ]
    : [
        {
          icon: <Sparkles size={14} />,
          label: "Tính BMI",
          mode: "focus-bmi",
        },
        {
          icon: <Dumbbell size={14} />,
          label: "Gym phù hợp",
          mode: "message",
          prompt: "Gợi ý gym cho tôi",
        },
        {
          icon: <Package size={14} />,
          label: "Gói phù hợp",
          mode: "message",
          prompt: "Gợi ý gói tập phù hợp",
        },
        {
          icon: <Activity size={14} />,
          label: "Ăn gì",
          mode: "message",
          prompt: "Tôi nên ăn gì?",
        },
      ];

const isNearBottom = (element, threshold = 120) => {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
};

function HorizontalCardList({ cards, onAction, loading }) {
  const railRef = useRef(null);
  if (!cards?.items?.length) return null;

  const scrollByCard = (dir) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: dir * 260, behavior: "smooth" });
  };

  return (
    <div className="gfms-ai-card-block">
      {cards.title && <div className="gfms-ai-card-block-title">{cards.title}</div>}
      {cards.items.length > 1 && (
        <div className="gfms-ai-card-controls">
          <button type="button" className="gfms-ai-icon-btn" onClick={() => scrollByCard(-1)}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="gfms-ai-icon-btn" onClick={() => scrollByCard(1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      <div ref={railRef} className="gfms-ai-card-rail">
        {cards.items.map((item) => (
          <div key={item.id || item.title} className="gfms-ai-mini-card">
            {item.badge && <div className="gfms-ai-mini-badge">{item.badge}</div>}
            <div className="gfms-ai-mini-title">{item.title}</div>
            {item.subtitle ? <div className="gfms-ai-mini-subtitle">{item.subtitle}</div> : null}
            {item.meta ? <div className="gfms-ai-mini-meta">{item.meta}</div> : null}
            {item.action ? (
              <button
                type="button"
                className="gfms-ai-mini-action"
                onClick={() => onAction(item.action)}
                disabled={loading}
              >
                {item.actionLabel || "Xem chi tiết"}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChatBot() {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const messagesRef = useRef(null);
  const bmiRef = useRef(null);

  const [authState, setAuthState] = useState(readAuthState());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([createWelcomeMessage(readAuthState())]);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [latestBmi, setLatestBmi] = useState(null);
  const [bmiExpanded, setBmiExpanded] = useState(true);
  const [bmiForm, setBmiForm] = useState({
    heightCm: "170",
    weightKg: "65",
    goal: "Cải thiện sức khỏe",
  });

  const resetGuestSession = () => {
    const guest = readAuthState();
    setAuthState(guest);
    setMessages([createWelcomeMessage(guest)]);
    setLoading(false);
    setText("");
    setShowScrollToBottom(false);
    setLatestBmi(null);
    setBmiExpanded(true);
  };

  const resetSessionForAuth = (nextAuth) => {
    setAuthState(nextAuth);
    setMessages([createWelcomeMessage(nextAuth)]);
    setLoading(false);
    setText("");
    setShowScrollToBottom(false);
    setLatestBmi(null);
    setBmiExpanded(!nextAuth.isMember);
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
    const next = readAuthState();

    if (next.authKey !== authState.authKey) {
      resetSessionForAuth(next);
      return;
    }

    if (!next.isMember) {
      setMessages((prev) => {
        const hasMemberOnlyText = prev.some((m) => {
          const c = String(m?.content || "").toLowerCase();
          return (
            c.includes("gói của bạn") ||
            c.includes("lịch sắp tới") ||
            c.includes("buổi gần nhất của bạn") ||
            c.includes("đặt lịch pt đúng flow")
          );
        });

        if (hasMemberOnlyText) {
          return [createWelcomeMessage(next)];
        }

        return prev;
      });
    }
  }, [location.pathname, open]); // sync lại khi đổi trang hoặc mở box

  const quickActions = useMemo(() => buildQuickActions(authState.isMember), [authState.isMember]);

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
    if (msg?.bmiSummary?.bmi) {
      setLatestBmi(msg.bmiSummary);
      setBmiExpanded(false);
      setBmiForm((prev) => ({
        ...prev,
        heightCm: String(msg.bmiSummary.heightCm || prev.heightCm),
        weightKg: String(msg.bmiSummary.weightKg || prev.weightKg),
        goal: msg.bmiSummary.goal || prev.goal,
      }));
    }
  };

  const handleNavigateAction = (action) => {
    const path = action?.payload?.path;
    if (path) navigate(path);
  };

  const runAction = (action) => {
    if (!action) return;
    if (action.type === "NAVIGATE_TO_PAGE") {
      handleNavigateAction(action);
      return;
    }
    if (action.type === "AI_SET_PROMPT") {
      const prompt = action?.payload?.prompt;
      if (prompt) sendMessage(prompt);
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

    const blockedGuestMemberPrompts = [
      "gói của tôi",
      "lịch sắp tới của tôi",
      "lịch của tôi",
      "tôi muốn đặt lịch pt",
      "đặt lịch pt",
    ];

    if (!currentAuth.isMember) {
      const lower = message.toLowerCase();
      if (blockedGuestMemberPrompts.some((x) => lower.includes(x))) {
        appendMessage({
          role: "assistant",
          content:
            "Phần này dành cho member đã đăng nhập. Bạn có thể hỏi BMI, ăn uống, gym phù hợp hoặc gói tập phù hợp trước nhé.",
          suggestions: normalizeSuggestions([
            { type: "message", label: "Tính BMI cho tôi", value: "Tôi cao 170cm nặng 65kg, hãy tính BMI và tư vấn cho tôi" },
            { type: "message", label: "Gợi ý gym cho tôi", value: "Gợi ý gym cho tôi" },
          ]),
          cards: null,
          proposedAction: null,
          requiresConfirmation: false,
          bmiSummary: latestBmi,
        });
        return;
      }
    }

    const pageContext = buildPageContext(location.pathname);
    const nextUserMsg = { id: uid(), role: "user", content: message };
    const nextHistory = [...messages, nextUserMsg].slice(-14).map((m) => ({
      role: m.role,
      content: m.content,
    }));

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

      appendMessage({
        role: "assistant",
        content: data?.reply || "Mình chưa thể phản hồi lúc này.",
        suggestions: normalizeSuggestions(data?.suggestions || []),
        cards: data?.cards || null,
        proposedAction: data?.proposedAction || null,
        requiresConfirmation: !!data?.requiresConfirmation,
        bmiSummary: data?.bmiSummary || null,
      });
    } catch (e) {
      appendMessage({
        role: "assistant",
        content: e?.response?.data?.EM || e?.message || "Đã có lỗi khi gọi AI assistant.",
        suggestions: [],
        cards: null,
        proposedAction: null,
        requiresConfirmation: false,
        bmiSummary: null,
      });
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  const handleConfirm = async (action) => {
    const currentAuth = readAuthState();
    if (!currentAuth.isMember) {
      resetGuestSession();
      return;
    }

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
        cards: null,
        proposedAction: null,
        requiresConfirmation: false,
        bmiSummary: null,
      });
    } catch (e) {
      appendMessage({
        role: "assistant",
        content: e?.response?.data?.EM || e?.message || "Không thể xác nhận thao tác này.",
        suggestions: [],
        cards: null,
        proposedAction: null,
        requiresConfirmation: false,
        bmiSummary: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (item) => {
    if (!item) return;
    if (item.type === "action" && item.action) {
      runAction(item.action);
      return;
    }
    sendMessage(item.value || item.label);
  };

  const handleBmiSubmit = (e) => {
    e.preventDefault();
    const { heightCm, weightKg, goal } = bmiForm;
    if (!heightCm || !weightKg) return;
    sendMessage(`Tôi cao ${heightCm}cm nặng ${weightKg}kg, mục tiêu ${goal}, hãy tính BMI và tư vấn cho tôi`);
  };

  const heroText = latestBmi?.bmi
    ? `BMI ${latestBmi.bmi} • ${latestBmi.classification?.label || ""}${latestBmi.goal ? ` • ${latestBmi.goal}` : ""}`
    : authState.isMember
      ? "Hiểu gói tập, lịch tập và PT của bạn"
      : "Tư vấn gym, gói tập, PT và BMI tự nhiên hơn";

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
                <div className="gfms-ai-subtitle">{heroText}</div>
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
                  if (item.mode === "action") runAction(item.action);
                  else if (item.mode === "focus-bmi") {
                    setBmiExpanded(true);
                    bmiRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  } else {
                    sendMessage(item.prompt);
                  }
                }}
                disabled={loading}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {!authState.isMember && (
            <div className="gfms-ai-hero">
              <div className="gfms-ai-hero-top">
                <div>
                  <div className="gfms-ai-hero-title">
                    {latestBmi?.bmi ? "BMI cá nhân hóa" : "Bắt đầu nhanh với BMI"}
                  </div>
                  <div className="gfms-ai-hero-subtitle">
                    {latestBmi?.bmi
                      ? `${buildBmiSummaryLineInline(latestBmi)}`
                      : "Nhập chiều cao, cân nặng và mục tiêu để AI tư vấn sát hơn."}
                  </div>
                </div>
                <button type="button" className="gfms-ai-hero-cta" onClick={() => setBmiExpanded((prev) => !prev)}>
                  {bmiExpanded ? "Thu gọn" : latestBmi?.bmi ? "Cập nhật" : "Mở nhanh"}
                </button>
              </div>
            </div>
          )}

          <div className="gfms-ai-messages" ref={messagesRef} onScroll={handleScroll}>
            {!authState.isMember && bmiExpanded && (
              <div className="gfms-ai-message is-assistant is-static-card" ref={bmiRef}>
                <div className="gfms-ai-bubble gfms-ai-bmi-bubble">
                  <div className="gfms-ai-bmi-card-title">Tính BMI nhanh</div>
                  <form className="gfms-ai-bmi-form" onSubmit={handleBmiSubmit}>
                    <div className="gfms-ai-bmi-grid">
                      <label>
                        <span>Chiều cao (cm)</span>
                        <input
                          value={bmiForm.heightCm}
                          onChange={(e) => setBmiForm((prev) => ({ ...prev, heightCm: e.target.value }))}
                          inputMode="numeric"
                        />
                      </label>
                      <label>
                        <span>Cân nặng (kg)</span>
                        <input
                          value={bmiForm.weightKg}
                          onChange={(e) => setBmiForm((prev) => ({ ...prev, weightKg: e.target.value }))}
                          inputMode="numeric"
                        />
                      </label>
                    </div>
                    <label>
                      <span>Mục tiêu</span>
                      <select value={bmiForm.goal} onChange={(e) => setBmiForm((prev) => ({ ...prev, goal: e.target.value }))}>
                        <option>Cải thiện sức khỏe</option>
                        <option>Giảm mỡ</option>
                        <option>Tăng cân</option>
                        <option>Tăng cơ</option>
                      </select>
                    </label>
                    <button type="submit" className="gfms-ai-bmi-submit" disabled={loading}>
                      <Sparkles size={16} />
                      <span>Tính BMI và tư vấn cho tôi</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`gfms-ai-message ${msg.role === "user" ? "is-user" : "is-assistant"}`}>
                <div className="gfms-ai-bubble">
                  <p>{msg.content}</p>

                  {msg.cards ? <HorizontalCardList cards={msg.cards} onAction={runAction} loading={loading} /> : null}

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
                      <button type="button" className="gfms-ai-action-btn" onClick={() => runAction(msg.proposedAction)}>
                        <span>{msg.proposedAction?.label || "Mở trang"}</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}

                  {!!msg.proposedAction && !!msg.requiresConfirmation && authState.isMember && (
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

          {showScrollToBottom && (
            <button
              type="button"
              className="gfms-ai-scroll-bottom"
              onClick={() => messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" })}
            >
              <ChevronRight size={16} style={{ transform: "rotate(90deg)" }} />
            </button>
          )}

          <form className="gfms-ai-input-wrap" onSubmit={(e) => { e.preventDefault(); sendMessage(text); }}>
            <input
              ref={inputRef}
              className="gfms-ai-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                authState.isMember
                  ? "Ví dụ: gói của tôi, mai có lịch không, tôi nên ăn gì, tôi muốn đặt lịch PT"
                  : "Ví dụ: ăn gì, gym nào hợp, gói nào ổn, PT nào hợp với tôi"
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

function buildBmiSummaryLineInline(bmiContext) {
  if (!bmiContext?.bmi) return "";
  const parts = [`BMI hiện tại ${bmiContext.bmi}`, bmiContext.classification?.label || null];
  if (bmiContext.goal) parts.push(bmiContext.goal);
  return parts.filter(Boolean).join(" • ");
}