import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CalendarCheck, CreditCard, MessageCircle, RefreshCw, Star } from "lucide-react";
import "../member/member-pages.css";
import "./PTNotificationsPage.css";
import useTrainerNotifications from "../../hooks/useTrainerNotifications";

const iconMap = {
  booking_update: CalendarCheck,
  withdrawal: CreditCard,
  chat: MessageCircle,
  request_update: RefreshCw,
  review: Star,
  feedback: Star,
  system: RefreshCw,
};

const categoryMap = {
  booking_update: "Lịch & buổi tập",
  withdrawal: "Tài chính & rút tiền",
  chat: "Tin nhắn",
  request_update: "Yêu cầu & phê duyệt",
  review: "Đánh giá & phản hồi",
  feedback: "Đánh giá & phản hồi",
  system: "Hệ thống",
};

function fmtRelative(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

export default function PTNotificationsPage() {
  const navigate = useNavigate();
  const { items, unreadCount, loading, markOne, markAll } = useTrainerNotifications();
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(
    () => (filter === "unread" ? items.filter((item) => !item.isRead) : items),
    [items, filter]
  );

  const resolvePath = (item) => {
    const type = String(item?.notificationType || "").toLowerCase();
    if (type === "withdrawal" || type === "payment") return "/pt/finance";
    if (type === "review" || type === "feedback") return "/pt/feedback";
    if (type === "chat") return "/pt/messages";
    if (type === "request_update") return "/pt/requests";
    if (["booking_update", "booking"].includes(type)) return "/pt/dashboard";
    return "/pt/notifications";
  };

  const handleOpen = async (item) => {
    if (!item?.isRead) {
      try {
        await markOne(item.id);
      } catch {}
    }
    navigate(resolvePath(item));
  };

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((item) => {
      const key = categoryMap[item.notificationType] || "Khác";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="ptn-wrap mh">
      <div className="ptn-head">
        <div>
          <h1 className="mh-title">Thông báo</h1>
        </div>
        <div className="ptn-tabs">
          <button
            type="button"
            className={`mh-btn mh-btn--ghost ${filter === "all" ? "is-on" : ""}`}
            onClick={() => setFilter("all")}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`mh-btn mh-btn--ghost ${filter === "unread" ? "is-on" : ""}`}
            onClick={() => setFilter("unread")}
          >
            Chưa đọc ({unreadCount})
          </button>
          {unreadCount > 0 ? (
            <button type="button" className="mh-btn mh-btn--primary" onClick={() => markAll()}>
              Đọc hết
            </button>
          ) : null}
        </div>
      </div>

      {loading ? <div className="ptn-empty">Đang tải…</div> : null}

      {!loading && !grouped.length ? (
        <div className="ptn-empty">Chưa có thông báo.</div>
      ) : null}

      <div className="ptn-blocks">
        {grouped.map(([category, notis]) => (
          <section key={category} className="ptn-block">
            <h2 className="ptn-cat">{category}</h2>
            <ul className="ptn-list">
              {notis.map((item) => {
                const Icon = iconMap[item.notificationType] || Bell;
                const unread = !item.isRead;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`ptn-item ${unread ? "unread" : ""}`}
                      onClick={() => handleOpen(item)}
                    >
                      <div className="ptn-icon">
                        <Icon size={18} />
                      </div>
                      <div className="ptn-body">
                        <div className="ptn-title">{item.title || "Thông báo"}</div>
                        <div className="ptn-msg">{item.message || ""}</div>
                        <div className="ptn-time">{fmtRelative(item.createdAt)}</div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
