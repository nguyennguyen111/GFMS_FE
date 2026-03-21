import React, { useEffect } from "react";
import { CalendarDays, Clock3, Dumbbell, MapPin, UserRound, X } from "lucide-react";
import "./BookingDetailModal.css";

const normalizeStatus = (s) => {
  if (s === "in_progress" || s === "completed") return "attended";
  if (s === "cancelled") return "cancelled";
  return "scheduled";
};

const statusText = (s) => {
  const x = normalizeStatus(s);
  if (x === "attended") return "Đã điểm danh";
  if (x === "cancelled") return "Đã huỷ";
  return "Chưa điểm danh";
};

const fmtDate = (value) => {
  const raw = String(value || "").slice(0, 10);
  if (!raw) return "—";
  const [y, m, d] = raw.split("-");
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

  const displayStatus = normalizeStatus(booking.status);

  return (
    <div className="bd-backdrop" onClick={onClose}>
      <div
        className="bd-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="bd-head">
          <div>
            <div className="bd-kicker">Booking detail</div>
            <h3 className="bd-title">Chi tiết buổi tập</h3>
            <p className="bd-sub">Xem nhanh thông tin lịch tập của bạn.</p>
          </div>

          <button className="bd-x" onClick={onClose} type="button" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="bd-top">
          <div className={`bd-status ${displayStatus}`}>{statusText(booking.status)}</div>
          <div className="bd-timeChip">
            <Clock3 size={15} />
            <span>
              {fmtTime(booking.startTime)} - {fmtTime(booking.endTime)}
            </span>
          </div>
        </div>

        <div className="bd-grid">
          <div className="bd-row">
            <span className="bd-label">
              <CalendarDays size={15} />
              <span>Ngày tập</span>
            </span>
            <b className="bd-value">{fmtDate(booking.bookingDate)}</b>
          </div>

          <div className="bd-row">
            <span className="bd-label">
              <Clock3 size={15} />
              <span>Khung giờ</span>
            </span>
            <b className="bd-value">
              {fmtTime(booking.startTime)} - {fmtTime(booking.endTime)}
            </b>
          </div>

          <div className="bd-row">
            <span className="bd-label">
              <UserRound size={15} />
              <span>PT / Trainer</span>
            </span>
            <b className="bd-value">{booking?.Trainer?.User?.username || "PT"}</b>
          </div>

          <div className="bd-row">
            <span className="bd-label">
              <MapPin size={15} />
              <span>Gym</span>
            </span>
            <b className="bd-value">{booking?.Gym?.name || "—"}</b>
          </div>

          <div className="bd-row">
            <span className="bd-label">
              <Dumbbell size={15} />
              <span>Gói tập</span>
            </span>
            <b className="bd-value">{booking?.Package?.name || "—"}</b>
          </div>
        </div>

        <div className="bd-actions">
          <button className="bd-btn" onClick={onClose} type="button">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}