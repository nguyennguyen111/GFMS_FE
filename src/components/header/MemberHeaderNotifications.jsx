import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BellRing,
  CalendarCheck,
  CreditCard,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Star,
  Tag,
  Repeat,
  UserPlus,
} from "lucide-react";
import useRealtimeNotifications from "../../hooks/useRealtimeNotifications";
import { previewTextFromPayload } from "../../utils/chatPayload";

const iconMap = {
  booking_update: CalendarCheck,
  booking_reschedule: Repeat,
  package_purchase: CreditCard,
  payment: CreditCard,
  trainer_request: UserPlus,
  chat: MessageCircle,
  session_feedback: MessageSquare,
  review: Star,
  promo: Tag,
  security: ShieldAlert,
  system: RefreshCw,
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

export default function MemberHeaderNotifications({ onNavigate }) {
  const { items, unreadCount, loading, markOne, markAll } =
    useRealtimeNotifications({ enabled: true });

  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const latestItems = useMemo(() => {
    return Array.isArray(items) ? items.slice(0, 8) : [];
  }, [items]);

  const resolveNotificationPath = (item) => {
    const type = String(item?.notificationType || "").toLowerCase();

    if (type === "chat") return "/member/messages";
    if (type === "session_feedback") {
      const rid = item?.relatedId ?? item?.related_id;
      return rid ? `/member/bookings?sessionFeedback=${rid}` : "/member/bookings";
    }
    if (["booking_update", "booking", "booking_reschedule"].includes(type)) {
      return "/member/bookings";
    }
    if (["package_purchase", "transaction", "payment"].includes(type)) {
      return "/member/my-packages";
    }
    if (type === "review") return "/member/reviews";
    if (type === "trainer_request") return "/member/profile";
    if (type === "promo") return "/member/my-packages";

    return "/member/notifications";
  };

  const handleOpenItem = async (item) => {
    if (!item?.isRead) {
      try {
        await markOne(item.id);
      } catch {}
    }

    setOpen(false);
    onNavigate(resolveNotificationPath(item));
  };

  const handleMarkAll = async () => {
    try {
      await markAll();
    } catch {}
  };

  return (
    <div className="header-notification-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`header-icon-btn ${open ? "is-open" : ""}`}
        aria-label="Thông báo"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} />
        {unreadCount > 0 ? <span className="header-noti-dot" /> : null}
      </button>

      {open && (
        <div className="header-notification-dropdown" role="menu">
          <div className="header-notification-dropdown__head">
            <div>
              <div className="header-notification-dropdown__eyebrow">
                Thông báo
              </div>
              <h3 className="header-notification-dropdown__title">
                Cập nhật gần đây
              </h3>
            </div>

            <button
              type="button"
              className="header-notification-dropdown__markall"
              onClick={handleMarkAll}
              disabled={!unreadCount}
            >
              Đọc tất cả
            </button>
          </div>

          <div className="header-notification-dropdown__body">
            {loading ? (
              <div className="header-notification-empty">Đang tải...</div>
            ) : null}

            {!loading && latestItems.length === 0 ? (
              <div className="header-notification-empty">
                Hiện chưa có thông báo nào.
              </div>
            ) : null}

            {!loading &&
              latestItems.map((item) => {
                const Icon = iconMap[item.notificationType] || BellRing;
                const message =
                  previewTextFromPayload(item.message) || item.message || "";

                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`header-notification-item ${
                      item.isRead ? "read" : "unread"
                    }`}
                    onClick={() => handleOpenItem(item)}
                  >
                    <div className="header-notification-item__icon">
                      <Icon size={18} />
                    </div>

                    <div className="header-notification-item__content">
                      <div className="header-notification-item__top">
                        <h4 className="header-notification-item__title">
                          {item.title}
                        </h4>
                        <span className="header-notification-item__time">
                          {fmtRelative(item.createdAt || item.ts)}
                        </span>
                      </div>

                      <p className="header-notification-item__desc">
                        {message}
                      </p>
                    </div>

                    {!item.isRead ? (
                      <span className="header-notification-item__dot" />
                    ) : null}
                  </button>
                );
              })}
          </div>

          <div className="header-notification-dropdown__foot">
            <button
              type="button"
              className="header-notification-dropdown__viewall"
              onClick={() => {
                setOpen(false);
                onNavigate("/member/notifications");
              }}
            >
              Xem tất cả
            </button>
          </div>
        </div>
      )}
    </div>
  );
}