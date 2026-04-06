import React, { useState, useEffect } from "react";
import "./PTAttendanceModal.css";

export const PT_ATTENDANCE_LOCK_MSG =
  "Buổi tập này đã được chốt kỳ lương hoặc chủ gym đã chi trả hoa hồng. Không thể điểm danh hay chỉnh sửa trạng thái có mặt / vắng mặt.";

const fmtDT = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const pickMemberLabel = (booking) => {
  const memberName = booking?.Member?.User?.username || booking?.Member?.fullName || booking?.Member?.name;
  return memberName || (booking?.memberId ? `Học viên #${booking.memberId}` : "—");
};

const pickGymLabel = (booking) => {
  const g = booking?.Gym;
  return g?.gymName || g?.name || (booking?.gymId ? `Cơ sở #${booking.gymId}` : "—");
};

export default function PTAttendanceModal({ open, booking, loading, error, onClose, onCheckIn, onCheckOut, onComplete, onReset, refresh }) {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setIsEditing(false);
  }, [open, booking?.id]);

  if (!open) return null;

  const ta = booking?.trainerAttendance || null;
  const currentStatus = (ta?.status || booking?.status || "").toLowerCase();
  const bookingStatus = String(booking?.status || "").toLowerCase();
  const isCompleted = bookingStatus === "completed";
  const comm = String(booking?.commissionStatus || "").toLowerCase();
  const commissionLocked = comm === "calculated" || comm === "paid";

  const handleAction = async (type) => {
    if (commissionLocked) return;
    try {
      if (type === "present") {
        await onCheckIn({ status: "present" });
      } else {
        await onCheckOut({ status: "absent" });
      }
      setIsEditing(false);
      if (refresh) await refresh();
    } catch (e) {
      console.error("Lỗi:", e);
    }
  };

  return (
    <div className="ptAttModal__backdrop" onMouseDown={onClose}>
      <div className="ptAttModal__card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ptAttModal__head">
          <div>
            <div className="ptAttModal__title">ĐIỂM DANH BUỔI TẬP</div>
            <div className="ptAttModal__sub">
              {booking ? `${String(booking?.startTime || "").slice(0, 5)} - ${String(booking?.endTime || "").slice(0, 5)}` : ""}
            </div>
          </div>
          <button className="ptAttModal__x" onClick={onClose}>✕</button>
        </div>

        {error ? <div className="ptAttModal__err">{error}</div> : null}

        {!booking ? (
          <div className="ptAttModal__empty">Slot này chưa có học viên.</div>
        ) : (
          <>
            <div className="ptAttModal__grid">
              <div className="ptAttModal__row">
                <span className="k">Học viên</span>
                <span className="v" style={{fontWeight: 'bold'}}>{pickMemberLabel(booking)}</span>
              </div>
              <div className="ptAttModal__row">
                <span className="k">Cơ sở</span>
                <span className="v" style={{fontWeight: 'bold'}}>{pickGymLabel(booking)}</span>
              </div>
              <div className="ptAttModal__row">
                <span className="k">Trạng thái</span>
                <span className={`v status-tag ${currentStatus}`}>
                  {isCompleted && currentStatus === "present" ? (
                    <span className="ptAttModal__status-text--present">✅ Hoàn thành</span>
                  ) : currentStatus === "present" ? (
                    <span className="ptAttModal__status-text--present">✅ Đã có mặt</span>
                  ) : currentStatus === "absent" ? (
                    <span className="ptAttModal__status-text--absent">❌ Đã vắng mặt</span>
                  ) : (
                    <span className="ptAttModal__status-text--pending">Chưa điểm danh</span>
                  )}
                </span>
              </div>
              {ta?.checkInTime && (
                <div className="ptAttModal__row">
                  <span className="k">Thời điểm check-in</span>
                  <span className="v" style={{fontWeight: 'bold'}}>{fmtDT(ta?.checkInTime)}</span>
                </div>
              )}
            </div>

            {commissionLocked ? (
              <div className="ptAttModal__lockPanel">
                <div className="ptAttModal__lockTitle">Đã chi trả / đã chốt kỳ</div>
                <p className="ptAttModal__lockText">{PT_ATTENDANCE_LOCK_MSG}</p>
                <button type="button" className="ptAttModal__lockBtn" onClick={onClose}>
                  Đã hiểu
                </button>
              </div>
            ) : (
              <div
                className={
                  ta && !isEditing
                    ? "ptAttModal__actions ptAttModal__actions--single"
                    : "ptAttModal__actions"
                }
              >
                {ta && !isEditing ? (
                  <>
                    {!isCompleted && currentStatus === "present" && onComplete ? (
                      <button
                        type="button"
                        className="ptAttModal__btn ptAttModal__btn--present"
                        disabled={loading}
                        onClick={async () => {
                          await onComplete({ status: "present" });
                          setIsEditing(false);
                          if (refresh) await refresh();
                        }}
                      >
                        {loading ? "..." : "✓ Hoàn thành buổi tập"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="ptAttModal__btn ptAttModal__btn--edit"
                      onClick={() => setIsEditing(true)}
                    >
                      ✎ Chỉnh sửa điểm danh
                    </button>
                  </>
                ) : (
                  <>
                    {ta && (
                      <button
                        type="button"
                        className="ptAttModal__btn ptAttModal__btn--reset"
                        disabled={loading}
                        onClick={async () => {
                          if (!onReset) return;
                          await onReset();
                          setIsEditing(false);
                          if (refresh) await refresh();
                        }}
                      >
                        {loading ? "..." : "↺ Chưa điểm danh"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="ptAttModal__btn ptAttModal__btn--present"
                      disabled={loading}
                      onClick={() => handleAction("present")}
                    >
                      {loading ? "..." : "✓ Có mặt"}
                    </button>
                    <button
                      type="button"
                      className="ptAttModal__btn ptAttModal__btn--absent"
                      disabled={loading}
                      onClick={() => handleAction("absent")}
                    >
                      {loading ? "..." : "✗ Vắng mặt"}
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
