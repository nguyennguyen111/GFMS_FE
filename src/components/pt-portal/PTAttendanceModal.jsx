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
  // Lấy username từ include: Member -> User -> username
  const memberName = booking?.Member?.User?.username || booking?.Member?.fullName || booking?.Member?.name;
  return memberName || (booking?.memberId ? `Member #${booking.memberId}` : "—");
};

const pickGymLabel = (booking) => {
  const g = booking?.Gym;
  return g?.gymName || g?.name || (booking?.gymId ? `Gym #${booking.gymId}` : "—");
};

export default function PTAttendanceModal({ open, booking, loading, error, onClose, onCheckIn, onCheckOut, refresh }) {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setIsEditing(false);
  }, [open, booking?.id]);

  if (!open) return null;

  const ta = booking?.trainerAttendance || null;
  const currentStatus = (ta?.status || booking?.status || "").toLowerCase();
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
                <span className={`v status-tag ${currentStatus}`} style={{fontWeight: 'bold'}}>
                  {currentStatus === 'present' ? <span style={{color: '#2ecc71'}}>✅ Đã có mặt</span> : 
                   currentStatus === 'absent' ? <span style={{color: '#e74c3c'}}>❌ Đã vắng mặt</span> : 'Chưa điểm danh'}
                </span>
              </div>
              {ta?.checkInTime && (
                <div className="ptAttModal__row">
                  <span className="k">Check-in</span>
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
              <div className="ptAttModal__actions" style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "20px" }}>
                {ta && !isEditing ? (
                  <button
                    type="button"
                    className="ptAttModal__btn"
                    style={{
                      backgroundColor: "#f0f0f0",
                      color: "#333",
                      width: "200px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                    onClick={() => setIsEditing(true)}
                  >
                    ✎ Chỉnh sửa điểm danh
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="ptAttModal__btn"
                      style={{ backgroundColor: "#064433", color: "#2ecc71", border: "1px solid #2ecc71", flex: 1 }}
                      disabled={loading}
                      onClick={() => handleAction("present")}
                    >
                      {loading ? "..." : "✓ Có mặt"}
                    </button>
                    <button
                      type="button"
                      className="ptAttModal__btn"
                      style={{ backgroundColor: "#2d1a1a", color: "#e74c3c", border: "1px solid #e74c3c", flex: 1 }}
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