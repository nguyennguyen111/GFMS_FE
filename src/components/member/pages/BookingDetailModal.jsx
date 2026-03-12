import React, { useEffect } from "react";
import "./BookingDetailModal.css";

const statusText = (s) => {
  if (s === "confirmed") return "Đã xác nhận";
  if (s === "completed") return "Hoàn thành";
  if (s === "cancelled") return "Đã huỷ";
  return s || "—";
};

const fmtDate = (value) => {
  const raw = String(value || "").slice(0, 10);
  if (!raw) return "—";
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return raw;
  return `${d}/${m}/${y}`;
};

const fmtTime = (value) => String(value || "").slice(0, 5) || "—";

export default function BookingDetailModal({ booking, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!booking) return null;

  return (
    <div className="bd-backdrop" onClick={onClose}>
      <div
        className="bd-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-detail-title"
      >
        <div className="bd-head">
          <div className="bd-headLeft">
            <div className="bd-kicker">CHI TIẾT BOOKING</div>
            <h3 className="bd-title" id="booking-detail-title">
              Buổi tập của bạn
            </h3>
            <p className="bd-sub">Xem nhanh thông tin lịch tập, PT, phòng gym và gói đã đặt.</p>
          </div>

          <button className="bd-x" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        <div className="bd-topMeta">
          <div className={`bd-status ${booking.status}`}>{statusText(booking.status)}</div>
          <div className="bd-timeChip">
            {fmtTime(booking.startTime)} – {fmtTime(booking.endTime)}
          </div>
        </div>

        <div className="bd-section">
          <div className="bd-sectionTitle">Thông tin buổi tập</div>

          <div className="bd-grid">
            <div className="bd-row">
              <div className="bd-labelWrap">
                <span className="bd-icon">📅</span>
                <span className="bd-label">Ngày tập</span>
              </div>
              <b className="bd-value">{fmtDate(booking.bookingDate)}</b>
            </div>

            <div className="bd-row">
              <div className="bd-labelWrap">
                <span className="bd-icon">⏰</span>
                <span className="bd-label">Khung giờ</span>
              </div>
              <b className="bd-value">
                {fmtTime(booking.startTime)} – {fmtTime(booking.endTime)}
              </b>
            </div>

            <div className="bd-row">
              <div className="bd-labelWrap">
                <span className="bd-icon">🧑‍🏫</span>
                <span className="bd-label">PT / Trainer</span>
              </div>
              <b className="bd-value">{booking?.Trainer?.User?.username || "PT"}</b>
            </div>

            <div className="bd-row">
              <div className="bd-labelWrap">
                <span className="bd-icon">🏋️</span>
                <span className="bd-label">Phòng gym</span>
              </div>
              <b className="bd-value">{booking?.Gym?.name || "—"}</b>
            </div>

            <div className="bd-row">
              <div className="bd-labelWrap">
                <span className="bd-icon">📦</span>
                <span className="bd-label">Gói tập</span>
              </div>
              <b className="bd-value">{booking?.Package?.name || "—"}</b>
            </div>
          </div>
        </div>

        <div className="bd-actions">
          <button className="bd-btn bd-btnGhost" onClick={onClose} type="button">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}