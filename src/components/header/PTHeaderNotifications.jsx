import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BellRing,
  CalendarCheck,
  CreditCard,
  MessageCircle,
  RefreshCw,
  Star,
} from "lucide-react";
import useTrainerNotifications from "../../hooks/useTrainerNotifications";
import { previewTextFromPayload } from "../../utils/chatPayload";
import { resolveTrainerNotificationPath } from "../../utils/ptNotificationRouting";

const iconMap = {
  booking_update: CalendarCheck,
  booking: CalendarCheck,
  booking_reschedule: CalendarCheck,
  trainer_share: RefreshCw,
  withdrawal: CreditCard,
  payment: CreditCard,
  chat: MessageCircle,
  request_update: RefreshCw,
  review: Star,
  feedback: Star,
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

export default function PTHeaderNotifications({ onNavigate }) {
  const { items, unreadCount, loading, markOne, markAll } = useTrainerNotifications();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
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

  const handleOpenItem = async (item) => {
    if (!item) return;
    if (!item?.isRead) {
      try {
        await markOne(item.id);
      } catch {}
    }
    setOpen(false);
    onNavigate(resolveTrainerNotificationPath(item));
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
        {unreadCount > 0 ? (
          <span className="header-noti-count">{unreadCount > 99 ? "99+" : unreadCount}</span>
        ) : null}
      </button>

      {open && (
        <div className="header-notification-dropdown" role="menu">
          <div className="header-notification-dropdown__head">
            <div>
              <div className="header-notification-dropdown__eyebrow">Thông báo</div>
              <h3 className="header-notification-dropdown__title">Cập nhật gần đây</h3>
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
            {loading ? <div className="header-notification-empty">Đang tải...</div> : null}

            {!loading && latestItems.length === 0 ? (
              <div className="header-notification-empty">Hiện chưa có thông báo nào.</div>
            ) : null}

            {!loading &&
              latestItems.map((item) => {
                const type = String(item?.notificationType || "");
                const Icon = iconMap[type] || BellRing;
                const message = previewTextFromPayload(item.message) || item.message || "";

                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`header-notification-item ${item.isRead ? "read" : "unread"}`}
                    onClick={() => handleOpenItem(item)}
                  >
                    <div className="header-notification-item__icon">
                      <Icon size={18} />
                    </div>

                    <div className="header-notification-item__content">
                      <div className="header-notification-item__top">
                        <h4 className="header-notification-item__title">{item.title || "Thông báo"}</h4>
                        <span className="header-notification-item__time">
                          {fmtRelative(item.createdAt || item.ts)}
                        </span>
                      </div>

                      <p className="header-notification-item__desc">{message}</p>
                    </div>

                    {!item.isRead ? <span className="header-notification-item__dot" /> : null}
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
                onNavigate("/pt/notifications");
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

