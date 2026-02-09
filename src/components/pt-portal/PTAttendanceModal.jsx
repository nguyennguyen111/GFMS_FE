import React from "react";
import "./PTAttendanceModal.css";

const fmtDT = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const pickMemberLabel = (booking) => {
  const m = booking?.Member;
  return m?.fullName || m?.name || m?.membershipNumber || (booking?.memberId ? `Member #${booking.memberId}` : "—");
};

const pickGymLabel = (booking) => {
  const g = booking?.Gym;
  return g?.name || (booking?.gymId ? `Gym #${booking.gymId}` : "—");
};

export default function PTAttendanceModal({ open, booking, loading, error, onClose, onCheckIn, onCheckOut }) {
  if (!open) return null;

  const ta = booking?.trainerAttendance || null;
  const canIn =
    !!booking &&
    !ta?.checkInTime &&
    ["pending", "confirmed", "in_progress"].includes(String(booking?.status || "").toLowerCase());

  const canOut =
    !!booking &&
    !!ta?.checkInTime &&
    !ta?.checkOutTime &&
    ["pending", "confirmed", "in_progress"].includes(String(booking?.status || "").toLowerCase());

  return (
    <div className="ptAttModal__backdrop" onMouseDown={onClose}>
      <div className="ptAttModal__card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ptAttModal__head">
          <div>
            <div className="ptAttModal__title">Điểm danh buổi tập</div>
            <div className="ptAttModal__sub">
              {booking ? `${String(booking?.startTime || "").slice(0, 5)} - ${String(booking?.endTime || "").slice(0, 5)}` : ""}
            </div>
          </div>
          <button className="ptAttModal__x" onClick={onClose}>
            ✕
          </button>
        </div>

        {error ? <div className="ptAttModal__err">{error}</div> : null}

        {!booking ? (
          <div className="ptAttModal__empty">
            Slot này chưa có học viên (chỉ là lịch rảnh).
          </div>
        ) : (
          <>
            <div className="ptAttModal__grid">
              <div className="ptAttModal__row">
                <span className="k">Học viên</span>
                <span className="v">{pickMemberLabel(booking)}</span>
              </div>
              <div className="ptAttModal__row">
                <span className="k">Cơ sở</span>
                <span className="v">{pickGymLabel(booking)}</span>
              </div>
              <div className="ptAttModal__row">
                <span className="k">Booking</span>
                <span className="v">{booking?.status || "—"}</span>
              </div>
              <div className="ptAttModal__row">
                <span className="k">Check-in</span>
                <span className="v">{fmtDT(ta?.checkInTime)}</span>
              </div>
              <div className="ptAttModal__row">
                <span className="k">Check-out</span>
                <span className="v">{fmtDT(ta?.checkOutTime)}</span>
              </div>
            </div>

            <div className="ptAttModal__actions">
              <button className="ptAttModal__btn" disabled={!canIn || loading} onClick={onCheckIn}>
                {loading ? "..." : "Check-in"}
              </button>
              <button className="ptAttModal__btn ptAttModal__btn--ghost" disabled={!canOut || loading} onClick={onCheckOut}>
                {loading ? "..." : "Check-out"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
