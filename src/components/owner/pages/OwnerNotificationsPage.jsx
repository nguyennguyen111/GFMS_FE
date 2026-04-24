import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing, CalendarCheck, CreditCard, PackageCheck, RefreshCw, ShieldAlert, ShoppingCart, Star, Tag, ToolCase, Users, Wallet } from "lucide-react";
import "../../member/member-pages.css";
import "../../member/pages/MemberNotificationsPage.css";
import useRealtimeNotifications from "../../../hooks/useRealtimeNotifications";
import useSelectedGym from "../../../hooks/useSelectedGym";
import { previewTextFromPayload } from "../../../utils/chatPayload";
import { resolveOwnerNotificationPath } from "../../../utils/ownerNotificationRouting";

const iconMap = {
  booking_update: CalendarCheck,
  package_purchase: CreditCard,
  membership_card_purchase: CreditCard,
  review: Star,
  trainer_request: Users,
  quotation: ShoppingCart,
  purchaseorder: PackageCheck,
  receipt: PackageCheck,
  payment: CreditCard,
  maintenance: ToolCase,
  promo: Tag,
  security: ShieldAlert,
  system: RefreshCw,
  withdrawal: Wallet,
  trainer_share: Users,
};

const categoryMap = {
  booking_update: "Lịch tập & Điểm danh",
  package_purchase: "Thanh toán & Gói tập",
  membership_card_purchase: "Thẻ thành viên",
  review: "Đánh giá hội viên",
  trainer_request: "Duyệt yêu cầu huấn luyện viên",
  quotation: "Báo giá mua hàng",
  purchaseorder: "Đơn mua hàng",
  receipt: "Nhận hàng & Kho thiết bị",
  payment: "Thanh toán procurement",
  maintenance: "Bảo trì thiết bị",
  promo: "Ưu đãi & Khuyến mãi",
  security: "Hệ thống & Bảo mật",
  system: "Cập nhật hệ thống",
  withdrawal: "Rút tiền & Hoa hồng",
  trainer_share: "Chia sẻ huấn luyện viên",
};

function fmtRelative(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

export default function OwnerNotificationsPage() {
  const navigate = useNavigate();
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const { items, unreadCount, loading, markOne, markAll } = useRealtimeNotifications({ gymId: selectedGymId });
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => (
    filter === "unread" ? items.filter((item) => !item.isRead) : items
  ), [items, filter]);

  const handleOpenNotification = async (item) => {
    if (!item?.isRead) {
      try { await markOne(item.id); } catch {}
    }
    navigate(resolveOwnerNotificationPath(item));
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
          <h2 className="mh-title mn-title">Thông báo </h2>
          <div className="mh-sub mn-desc">
            {selectedGymId
              ? `Theo dõi cập nhật của chi nhánh ${selectedGymName || `#${selectedGymId}`}, bao gồm lịch tập, chia sẻ huấn luyện viên và các nghiệp vụ phát sinh.`
              : "Theo dõi lịch tập, chia sẻ huấn luyện viên, đánh giá và các cập nhật quan trọng của hệ thống quản lý phòng tập."}
          </div>
        </div>

        <div className="mn-filter-tabs">
          <button type="button" className={`mn-tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>Tất cả</button>
          <button type="button" className={`mn-tab ${filter === "unread" ? "active" : ""}`} onClick={() => setFilter("unread")}>Chưa đọc ({unreadCount})</button>
        </div>
      </div>

      {loading ? <div className="m-empty">Đang tải...</div> : null}

      <div className="mn-list-wrap">
        {!loading && !grouped.length ? <div className="m-empty">{selectedGymId ? "Chi nhánh đang chọn hiện chưa có thông báo nào." : "Hiện chưa có thông báo nào."}</div> : null}
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