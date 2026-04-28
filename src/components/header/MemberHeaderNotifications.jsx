import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  X,
} from "lucide-react";
import useRealtimeNotifications from "../../hooks/useRealtimeNotifications";
import { previewTextFromPayload } from "../../utils/chatPayload";
import { resolveMemberNotificationPath } from "../../utils/memberNotificationRouting";
import "./MemberHeaderNotifications.css";

const iconMap = {
  booking_update: CalendarCheck,
  booking: CalendarCheck,
  booking_reschedule: Repeat,
  package_purchase: CreditCard,
  membership_card: CreditCard,
  payment: CreditCard,
  transaction: CreditCard,
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

function getNotificationIcon(item) {
  const type = String(item?.notificationType || item?.type || "").toLowerCase();
  return iconMap[type] || BellRing;
}

export default function MemberHeaderNotifications({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [toastItem, setToastItem] = useState(null);
  const wrapRef = useRef(null);
  const toastTimerRef = useRef(null);

  const closeToast = useCallback(() => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToastItem(null);
  }, []);

  const showRealtimeToast = useCallback(
    (payload) => {
      if (!payload?.id) return;
      if (open) return;

      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }

      setToastItem(payload);
      toastTimerRef.current = window.setTimeout(() => {
        setToastItem(null);
        toastTimerRef.current = null;
      }, 5000);
    },
    [open]
  );

  const { items, unreadCount, loading, markOne, markAll } =
    useRealtimeNotifications({
      enabled: true,
      onNewNotification: showRealtimeToast,
    });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        closeToast();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeToast]);

  useEffect(() => {
    if (open) closeToast();
  }, [open, closeToast]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const latestItems = useMemo(() => {
    return Array.isArray(items) ? items.slice(0, 8) : [];
  }, [items]);

  const handleOpenItem = async (item) => {
    if (!item) return;

    closeToast();

    if (!item?.isRead) {
      try {
        await markOne(item.id);
      } catch {}
    }

    setOpen(false);
    onNavigate(resolveMemberNotificationPath(item));
  };

  const handleMarkAll = async () => {
    try {
      await markAll();
    } catch {}
  };

  const ToastIcon = toastItem ? getNotificationIcon(toastItem) : BellRing;
  const toastMessage = toastItem
    ? previewTextFromPayload(toastItem.message) || toastItem.message || ""
    : "";

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

      {!open && toastItem ? (
        <button
          type="button"
          className="header-notification-toast"
          onClick={() => handleOpenItem(toastItem)}
        >
          <div className="header-notification-toast__icon">
            <ToastIcon size={18} />
          </div>

          <div className="header-notification-toast__content">
            <div className="header-notification-toast__label">Thông báo mới</div>
            <div className="header-notification-toast__titleRow">
              <h4 className="header-notification-toast__title">
                {toastItem.title || "Thông báo"}
              </h4>
              <span className="header-notification-toast__time">
                {fmtRelative(toastItem.createdAt || toastItem.ts)}
              </span>
            </div>
            <p className="header-notification-toast__message">{toastMessage}</p>
            <span className="header-notification-toast__hint">Nhấn để mở chi tiết</span>
          </div>

          <span
            role="button"
            tabIndex={0}
            className="header-notification-toast__close"
            aria-label="Đóng thông báo"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeToast();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                closeToast();
              }
            }}
          >
            <X size={15} />
          </span>
        </button>
      ) : null}

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
                const Icon = getNotificationIcon(item);
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
                          {item.title || "Thông báo"}
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
                closeToast();
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
