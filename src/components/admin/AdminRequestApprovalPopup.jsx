import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing, CheckCheck, ChevronRight, Clock, ShieldCheck, X } from "lucide-react";
import useAdminRealtimeNotifications from "../../hooks/useAdminRealtimeNotifications";
import { adminNotificationCategoryLabel, resolveAdminNotificationHref } from "../../constants/adminNotificationDeepLinks";
import "./AdminRequestApprovalPopup.css";

const REQUEST_KEYWORDS = ["franchise", "nhượng quyền", "nhuong quyen", "purchase", "combo", "maintenance", "bảo trì", "bao tri"];

function normalizeText(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isApprovalRequest(item) {
  const rawType = item?.notificationType || item?.type || item?.category || "";
  const haystack = normalizeText([rawType, item?.title, item?.message].filter(Boolean).join(" "));
  return REQUEST_KEYWORDS.some((keyword) => haystack.includes(normalizeText(keyword)));
}

function fmtTime(value) {
  if (!value) return "Vừa xong";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Vừa xong";
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getRequestTone(item) {
  const raw = normalizeText([item?.notificationType, item?.type, item?.title, item?.message].join(" "));
  if (raw.includes("franchise") || raw.includes("nhuong quyen")) return { label: "Nhượng quyền", className: "is-franchise", href: "/admin/franchises" };
  if (raw.includes("purchase") || raw.includes("combo")) return { label: "Mua combo", className: "is-combo", href: "/admin/purchase-workflow" };
  if (raw.includes("maintenance") || raw.includes("bao tri")) return { label: "Bảo trì", className: "is-maintenance", href: "/admin/maintenance" };
  return { label: adminNotificationCategoryLabel(item?.notificationType || item?.type), className: "is-default", href: null };
}

export default function AdminRequestApprovalPopup() {
  const navigate = useNavigate();
  const { items, unreadCount, loading, markOne, markAll, refresh } = useAdminRealtimeNotifications();
  const [open, setOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("gfms_admin_request_popup_dismissed") || "[]")); } catch { return new Set(); }
  });
  const lastAutoOpenedIdRef = useRef(null);

  const requestItems = useMemo(() => (items || [])
    .filter((item) => item && !item.isRead && !dismissedIds.has(String(item.id)) && isApprovalRequest(item))
    .slice(0, 5), [items, dismissedIds]);

  const primaryItem = requestItems[0];

  useEffect(() => {
    if (!primaryItem?.id || lastAutoOpenedIdRef.current === primaryItem.id) return;
    lastAutoOpenedIdRef.current = primaryItem.id;
    setOpen(true);
  }, [primaryItem?.id]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const persistDismissed = (nextSet) => {
    try { localStorage.setItem("gfms_admin_request_popup_dismissed", JSON.stringify(Array.from(nextSet).slice(-80))); } catch { /* ignore */ }
  };

  const dismissOne = (id) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(String(id));
      persistDismissed(next);
      return next;
    });
  };

  const closePopup = () => {
    requestItems.forEach((item) => dismissOne(item.id));
    setOpen(false);
  };

  const handleGoApprove = async (item) => {
    const fallback = getRequestTone(item).href;
    const href = resolveAdminNotificationHref(item) || fallback || "/admin/dashboard";
    try { if (!item.isRead) await markOne(item.id); } catch { /* route first */ }
    dismissOne(item.id);
    setOpen(false);
    navigate(href);
  };

  const handleMarkAllAndClose = async () => {
    try { await markAll(); await refresh(); } catch { /* ignore */ }
    closePopup();
  };

  if (!open || requestItems.length === 0) return null;

  return (
    <div className="ad-approval-pop" role="presentation">
      <div className="ad-approval-pop__backdrop" onClick={closePopup} />
      <section className="ad-approval-pop__panel" role="dialog" aria-modal="true" aria-label="Yêu cầu mới cần admin duyệt">
        <div className="ad-approval-pop__glow" />
        <header className="ad-approval-pop__head">
          <div className="ad-approval-pop__icon"><BellRing size={22} /></div>
          <div>
            <div className="ad-approval-pop__eyebrow">Request mới từ Owner</div>
            <h2>Admin cần duyệt {requestItems.length} yêu cầu</h2>
            <p>Hệ thống vừa ghi nhận yêu cầu cần xử lý. Vào đúng màn nghiệp vụ để kiểm tra thông tin và phê duyệt.</p>
          </div>
          <button type="button" className="ad-approval-pop__close" onClick={closePopup} aria-label="Đóng popup"><X size={18} /></button>
        </header>

        <div className="ad-approval-pop__summary">
          <span><ShieldCheck size={15} /> Luồng duyệt enterprise</span>
          <span><Clock size={15} /> {loading ? "Đang đồng bộ…" : `${unreadCount || requestItems.length} thông báo chưa đọc`}</span>
        </div>

        <div className="ad-approval-pop__list">
          {requestItems.map((item) => {
            const tone = getRequestTone(item);
            return (
              <article className={`ad-approval-card ${tone.className}`} key={item.id}>
                <div className="ad-approval-card__top">
                  <span className="ad-approval-card__type">{tone.label}</span>
                  <span className="ad-approval-card__time">{fmtTime(item.createdAt)}</span>
                </div>
                <h3>{item.title || "Yêu cầu mới cần duyệt"}</h3>
                <p>{item.message || "Owner vừa gửi một yêu cầu mới. Vui lòng kiểm tra và xử lý trong màn quản trị."}</p>
                <div className="ad-approval-card__actions">
                  <button type="button" className="ad-approval-card__primary" onClick={() => handleGoApprove(item)}>Đi tới duyệt <ChevronRight size={16} /></button>
                  <button type="button" className="ad-approval-card__ghost" onClick={() => dismissOne(item.id)}>Nhắc sau</button>
                </div>
              </article>
            );
          })}
        </div>

        <footer className="ad-approval-pop__foot">
          <button type="button" onClick={handleMarkAllAndClose}><CheckCheck size={16} /> Đánh dấu đã xem & đóng</button>
        </footer>
      </section>
    </div>
  );
}
