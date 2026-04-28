import React, { useMemo, useState } from "react";
import { BellRing } from "lucide-react";
import useAdminRealtimeNotifications from "../../../hooks/useAdminRealtimeNotifications";
import {
  adminNotificationCategoryLabel,
  resolveAdminNotificationHref,
} from "../../../constants/adminNotificationDeepLinks";
import "./AdminNotificationsPage.css";

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

export default function AdminNotificationsPage() {
  const { items, unreadCount, loading, markOne, markAll } = useAdminRealtimeNotifications();
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(
    () => (filter === "unread" ? items.filter((item) => !item.isRead) : items),
    [items, filter]
  );

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((item) => {
      const key = adminNotificationCategoryLabel(item.notificationType || item.type || "system");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return [...map.entries()];
  }, [filtered]);

  const handleOpen = async (item) => {
    if (!item?.isRead) {
      try {
        await markOne(item.id);
      } catch {
        // ignore
      }
    }
    const href = resolveAdminNotificationHref(item);
    if (href) window.location.assign(href);
  };

  return (
    <div className="adn-page">
      <div className="adn-head">
        <div>
          <h2 className="adn-title">Thông báo quản trị</h2>
          <p className="adn-sub">Theo dõi duyệt yêu cầu, bảo trì, nhượng quyền và các cập nhật hệ thống theo thời gian thực.</p>
        </div>
        <div className="adn-tabs">
          <button
            type="button"
            className={`adn-tab ${filter === "all" ? "is-active" : ""}`}
            onClick={() => setFilter("all")}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`adn-tab ${filter === "unread" ? "is-active" : ""}`}
            onClick={() => setFilter("unread")}
          >
            Chưa đọc ({unreadCount})
          </button>
        </div>
      </div>

      {loading ? <div className="adn-empty">Đang tải...</div> : null}

      {!loading && grouped.length === 0 ? <div className="adn-empty">Hiện chưa có thông báo nào.</div> : null}

      {!loading && grouped.length > 0 ? (
        <div className="adn-groups">
          {grouped.map(([category, rows]) => (
            <section key={category} className="adn-group">
              <div className="adn-group__head">
                <span>{category}</span>
                <div className="adn-group__line" />
              </div>
              <div className="adn-list">
                {rows.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`adn-item ${item.isRead ? "read" : "unread"}`}
                    onClick={() => handleOpen(item)}
                  >
                    {!item.isRead ? <span className="adn-item__dot" /> : null}
                    <div className="adn-item__icon">
                      <BellRing size={20} />
                    </div>
                    <div className="adn-item__body">
                      <div className="adn-item__top">
                        <h3>{item.title || "Thông báo"}</h3>
                        <span>{fmtRelative(item.createdAt || item.ts)}</span>
                      </div>
                      <p>{item.message}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      <div className="adn-foot">
        <button type="button" className="ad-btn" onClick={markAll} disabled={!unreadCount}>
          Đánh dấu tất cả là đã đọc
        </button>
      </div>
    </div>
  );
}
