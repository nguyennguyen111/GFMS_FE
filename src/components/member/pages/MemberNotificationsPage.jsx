import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing, CalendarCheck, CreditCard, Dumbbell, MessageCircle, RefreshCw, ShieldAlert, Star, Tag, Repeat, UserPlus } from "lucide-react";
import "../member-pages.css";
import "./MemberNotificationsPage.css";
import useRealtimeNotifications from "../../../hooks/useRealtimeNotifications";
import { previewTextFromPayload } from "../../../utils/chatPayload";

const iconMap = {
  booking_update: CalendarCheck,
  booking_reschedule: Repeat,
  package_purchase: CreditCard,
  payment: CreditCard,
  trainer_request: UserPlus,
  chat: MessageCircle,
  review: Star,
  promo: Tag,
  security: ShieldAlert,
  system: RefreshCw,
};

const categoryMap = {
  booking_update: "Lịch tập & Buổi đã hoàn thành",
  booking_reschedule: "Đổi lịch & Xác nhận",
  package_purchase: "Thanh toán & Gói tập",
  payment: "Thanh toán & Gói tập",
  trainer_request: "Tài khoản & Yêu cầu",
  chat: "Tin nhắn & Tương tác",
  review: "Đánh giá & Phản hồi",
  security: "Hệ thống & Bảo mật",
  promo: "Ưu đãi & Khuyến mãi",
  system: "Cập nhật hệ thống",
};

function fmtRelative(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

export default function MemberNotificationsPage() {
  const navigate = useNavigate();
  const { items, unreadCount, loading, markOne, markAll } = useRealtimeNotifications();
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => (
    filter === "unread" ? items.filter((item) => !item.isRead) : items
  ), [items, filter]);


  const resolveNotificationPath = (item) => {
    const type = String(item?.notificationType || "").toLowerCase();
    if (type === "chat") return "/member/messages";
    if (["booking_update", "booking", "booking_reschedule"].includes(type)) return "/member/bookings";
    if (["package_purchase", "transaction", "payment"].includes(type)) return "/member/my-packages";
    if (type === "review") return "/member/reviews";
    if (type === "trainer_request") return "/member/profile";
    if (type === "promo") return "/member/my-packages";
    return "/member/notifications";
  };

  const handleOpenNotification = async (item) => {
    if (!item?.isRead) {
      try { await markOne(item.id); } catch {}
    }
    navigate(resolveNotificationPath(item));
  };

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((item) => {
      const key = categoryMap[item.notificationType] || "Thông báo khác";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="mh-wrap mn-page">
      <div className="mh-head mn-head">
        <div className="mn-head-left">
          <span className="mn-sub-label">Trung tâm điều khiển</span>
          <h2 className="mh-title mn-title">Thông báo realtime</h2>
          <div className="mh-sub mn-desc">Nhận thông báo mua gói, hoàn thành buổi tập, tin nhắn PT và mọi cập nhật quan trọng dành cho hội viên.</div>
        </div>

        <div className="mn-filter-tabs">
          <button type="button" className={`mn-tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>Tất cả</button>
          <button type="button" className={`mn-tab ${filter === "unread" ? "active" : ""}`} onClick={() => setFilter("unread")}>Chưa đọc ({unreadCount})</button>
        </div>
      </div>

      {loading ? <div className="m-empty">Đang tải...</div> : null}

      <div className="mn-list-wrap">
        {!loading && !grouped.length ? <div className="m-empty">Hiện chưa có thông báo nào.</div> : null}
        {grouped.map(([category, notis]) => (
          <div key={category} className="mn-category-block">
            <div className="mn-category-header">
              <span className="mn-category-title">{category}</span>
              <div className="mn-category-line" />
            </div>

            <div className="mn-list">
              {notis.map((item) => {
                const Icon = iconMap[item.notificationType] || BellRing;
                const promo = item.notificationType === "promo" || item.notificationType === "package_purchase";
                return (
                  <button type="button" key={item.id} className={`mn-item ${item.isRead ? "read" : "unread"} ${promo ? "promo" : ""}`} onClick={() => handleOpenNotification(item)}>
                    {!item.isRead ? <div className="mn-unread-dot" /> : null}
                    <div className="mn-icon"><Icon size={22} /></div>
                    <div className="mn-content">
                      <div className="mn-content-head">
                        <h3 className="mn-item-title">{item.title}</h3>
                        <span className="mn-time">{fmtRelative(item.createdAt || item.ts)}</span>
                      </div>
                      <p className="mn-item-desc">{previewTextFromPayload(item.message) || item.message}</p>
                      {!item.isRead ? <span className="mn-inline-read">Nhấn để mở</span> : <span className="mn-inline-read muted">Đã xem</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mn-footer-action">
        <button type="button" className="mn-mark-all-btn" onClick={markAll} disabled={!unreadCount}>Đánh dấu tất cả là đã đọc</button>
      </div>
    </div>
  );
}
