import React, { useEffect, useRef, useState } from "react";
import {
  Bell,
  BellRing,
  CalendarDays,
  CheckCheck,
  CreditCard,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
  Star,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import useRealtimeNotifications from "../../hooks/useRealtimeNotifications";
import useSelectedGym from "../../hooks/useSelectedGym";
import { previewTextFromPayload } from "../../utils/chatPayload";
import { resolveOwnerNotificationPath } from "../../utils/ownerNotificationRouting";
import "./OwnerHeaderNotifications.css";

function formatNotificationTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function getNotificationVisual(item) {
  const type = String(item?.notificationType || "").toLowerCase();

  if (["booking_update", "booking"].includes(type)) {
    return { Icon: CalendarDays, label: "Lịch tập", tone: "booking" };
  }
  if (["package_purchase", "transaction", "payment"].includes(type)) {
    return { Icon: CreditCard, label: "Thanh toán", tone: "payment" };
  }
  if (type === "quotation") {
    return { Icon: CreditCard, label: "Báo giá", tone: "payment" };
  }
  if (type === "purchaseorder") {
    return { Icon: CalendarDays, label: "Đơn mua", tone: "booking" };
  }
  if (type === "receipt") {
    return { Icon: CalendarDays, label: "Nhận hàng", tone: "booking" };
  }
  if (type === "transfer") {
    return { Icon: RefreshCw, label: "Chuyển kho", tone: "system" };
  }
  if (type === "promo") {
    return { Icon: Tag, label: "Ưu đãi", tone: "promo" };
  }
  if (type === "review") {
    return { Icon: Star, label: "Đánh giá", tone: "review" };
  }
  if (type === "chat") {
    return { Icon: MessageCircle, label: "Tin nhắn", tone: "chat" };
  }
  if (["withdrawal", "commission"].includes(type)) {
    return { Icon: Wallet, label: "Tài chính", tone: "finance" };
  }
  if (type === "trainer_share") {
    return { Icon: Users, label: "Chia sẻ PT", tone: "share" };
  }
  if (type === "trainer_request") {
    return { Icon: Users, label: "Yêu cầu PT", tone: "share" };
  }
  if (type === "maintenance") {
    return { Icon: ShieldAlert, label: "Bảo trì", tone: "security" };
  }
  if (type === "security") {
    return { Icon: ShieldAlert, label: "Bảo mật", tone: "security" };
  }
  if (type === "system") {
    return { Icon: RefreshCw, label: "Hệ thống", tone: "system" };
  }

  return { Icon: BellRing, label: "Thông báo", tone: "default" };
}

export default function OwnerHeaderNotifications({ onNavigate }) {
  const notificationRef = useRef(null);
  const [open, setOpen] = useState(false);
  const { selectedGymId } = useSelectedGym();
  const notifications = useRealtimeNotifications({ gymId: selectedGymId });
  const unreadPreviewItems = notifications.items.filter((item) => !item.isRead).slice(0, 5);

  useEffect(() => {
    const onClick = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const openNotificationItem = async (item) => {
    if (!item) return;
    if (!item.isRead) {
      try {
        await notifications.markOne(item.id);
      } catch {}
    }
    setOpen(false);
    onNavigate(resolveOwnerNotificationPath(item));
  };

  return (
    <div className="ohn-wrap" ref={notificationRef}>
      <button
        type="button"
        className={`header-icon-btn ${open ? "is-open" : ""}`}
        aria-label="Thông báo"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Bell size={18} />
        {notifications.unreadCount > 0 ? (
          <span className="ohn-badge" />
        ) : null}
      </button>

      {open ? (
        <div className="ohn-panel" role="menu">
          <div className="ohn-panel__head">
            <div>
              <div className="ohn-panel__title">Thông báo</div>
              <div className="ohn-panel__meta">
                {notifications.unreadCount > 0 ? `${notifications.unreadCount} chưa đọc` : "Bạn đã xem hết"}
              </div>
            </div>
            {notifications.unreadCount > 0 ? (
              <button
                type="button"
                className="ohn-panel__markall"
                onClick={async () => {
                  try {
                    await notifications.markAll();
                    setOpen(false);
                  } catch {}
                }}
              >
                <CheckCheck size={15} />
                <span>Đọc hết</span>
              </button>
            ) : null}
          </div>

          <div className="ohn-panel__list">
            {notifications.loading ? (
              <div className="ohn-panel__empty">Đang tải thông báo...</div>
            ) : unreadPreviewItems.length === 0 ? (
              <div className="ohn-panel__empty">
                <BellRing size={18} />
                <span>Không còn thông báo chưa đọc.</span>
              </div>
            ) : (
              unreadPreviewItems.map((item) => {
                const visual = getNotificationVisual(item);
                const NotificationIcon = visual.Icon;

                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`ohn-item ${item.isRead ? "is-read" : "is-unread"} tone-${visual.tone}`}
                    onClick={() => openNotificationItem(item)}
                  >
                    <div className={`ohn-item__icon tone-${visual.tone}`}>
                      <NotificationIcon size={16} />
                    </div>
                    <div className="ohn-item__text">
                      <div className="ohn-item__titleRow">
                        <span className="ohn-item__title">{item.title}</span>
                        <span className="ohn-item__time">{formatNotificationTime(item.createdAt || item.ts)}</span>
                      </div>
                      <div className="ohn-item__metaRow">
                        <span className={`ohn-item__tag tone-${visual.tone}`}>{visual.label}</span>
                        {!item.isRead ? <span className="ohn-item__new">Mới</span> : null}
                      </div>
                      <div className="ohn-item__message">{previewTextFromPayload(item.message) || item.message}</div>
                    </div>
                    {!item.isRead ? <span className="ohn-item__dot" /> : null}
                  </button>
                );
              })
            )}
          </div>

          <div className="ohn-panel__footer">
            <button
              type="button"
              className="ohn-panel__viewall"
              onClick={() => {
                setOpen(false);
                onNavigate("/owner/notifications");
              }}
            >
              Xem tất cả
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}