import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import useAdminRealtimeNotifications from "../../hooks/useAdminRealtimeNotifications";
import {
  adminNotificationCategoryLabel,
  resolveAdminNotificationHref,
} from "../../constants/adminNotificationDeepLinks";
import "./AdminNotificationBell.css";

function fmtTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminNotificationBell() {
  const navigate = useNavigate();
  const { items, unreadCount, loading, markOne, markAll, refresh } = useAdminRealtimeNotifications();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onItemClick = async (item) => {
    const href = resolveAdminNotificationHref(item);
    if (!item.isRead) {
      try {
        await markOne(item.id);
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    navigate(href);
  };

  return (
    <div className="ad-bell-wrap" ref={wrapRef}>
      <button
        type="button"
        className="ad-bell-btn"
        aria-label="Thông báo"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) refresh();
        }}
      >
        <Bell size={20} strokeWidth={2.2} />
        {unreadCount > 0 ? <span className="ad-bell-badge">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="ad-bell-panel" role="dialog" aria-label="Thông báo quản trị">
          <div className="ad-bell-panel__head">
            <div className="ad-bell-panel__title">Thông báo</div>
            <div className="ad-bell-panel__actions">
              <button type="button" onClick={() => refresh()}>
                Làm mới
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await markAll();
                  } catch {
                    /* ignore */
                  }
                }}
                disabled={unreadCount === 0}
              >
                Đọc hết
              </button>
            </div>
          </div>
          <div className="ad-bell-list">
            {loading && items.length === 0 ? (
              <div className="ad-bell-empty">Đang tải…</div>
            ) : null}
            {!loading && items.length === 0 ? <div className="ad-bell-empty">Không có thông báo.</div> : null}
            {items.map((it) => (
              <button
                key={it.id}
                type="button"
                className={`ad-bell-item ${it.isRead ? "" : "ad-bell-item--unread"}`}
                onClick={() => onItemClick(it)}
              >
                <div className="ad-bell-item__meta">
                  <span className="ad-bell-item__cat">
                    {adminNotificationCategoryLabel(it.notificationType || it.type)}
                  </span>
                  <span className="ad-bell-item__time">{fmtTime(it.createdAt)}</span>
                </div>
                <div className="ad-bell-item__title">{it.title}</div>
                <div className="ad-bell-item__msg">{it.message}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
