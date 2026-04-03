import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  memberCheckinBooking,
  memberCheckoutBooking,
  memberGetMyBookings,
} from "../../../services/memberBookingService";
import "../member-pages.css";
import { showAppToast } from "../../../utils/appToast";

const STATUS_META = {
  pending: { label: "Chờ xác nhận", cls: "is-off" },
  confirmed: { label: "Đã xác nhận", cls: "is-on" },
  in_progress: { label: "Đang tập", cls: "is-on" },
  completed: { label: "Hoàn thành", cls: "is-on" },
  cancelled: { label: "Đã huỷ", cls: "is-off" },
  no_show: { label: "No show", cls: "is-off" },
};

function formatTime(timeStr) {
  if (!timeStr) return "-";
  return String(timeStr).slice(0, 5);
}
function formatDateTime(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "-";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export default function MemberCheckinPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [actionIn, setActionIn] = useState(false);
  const [actionOut, setActionOut] = useState(false);
  const [err, setErr] = useState("");
  const [booking, setBooking] = useState(null);

  // ✅ Chuẩn nghiệp vụ: checkout chỉ khi in_progress
  const STRICT_CHECKOUT = true;

  const loadBooking = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await memberGetMyBookings();
      const list = res?.data?.data || [];
      const found = list.find((b) => String(b.id) === String(id));
      setBooking(found || null);
      if (!found) setErr("Không tìm thấy booking trong lịch của bạn (hoặc bạn không có quyền).");
    } catch (e) {
      setErr(e?.response?.data?.message || "Không tải được dữ liệu booking.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const status = booking?.status;
  const canCheckin = useMemo(() => booking?.status === "confirmed", [booking]);
  const canCheckout = useMemo(() => {
    if (!booking) return false;
    if (STRICT_CHECKOUT) return booking.status === "in_progress";
    return ["in_progress", "confirmed"].includes(booking.status);
  }, [booking, STRICT_CHECKOUT]);

  const handleCheckin = async () => {
    if (!canCheckin) return;
    const ok = window.confirm(
      "Xác nhận CHECK-IN?\n\n- Booking chuyển sang 'in_progress'\n- Tạo Attendance (member) với checkInTime"
    );
    if (!ok) return;

    setErr("");
    setActionIn(true);
    try {
      await memberCheckinBooking(id, { method: "qr" });
      await loadBooking();
      showAppToast({ type: "success", title: "Check-in", message: "Check-in thành công" });
    } catch (e) {
      setErr(e?.response?.data?.message || "Check-in thất bại");
    } finally {
      setActionIn(false);
    }
  };

  const handleCheckout = async () => {
    if (!canCheckout) return;
    const ok = window.confirm(
      "Xác nhận HOÀN THÀNH buổi tập?\n\n- Trừ 1 buổi gói\n- Cộng 1 session cho PT\n- Booking → completed"
    );
    if (!ok) return;

    setErr("");
    setActionOut(true);
    try {
      await memberCheckoutBooking(id);
      showAppToast({ type: "success", title: "Hoàn thành", message: "Buổi tập đã hoàn thành" });
      navigate("/member/bookings", { replace: true });
    } catch (e) {
      setErr(e?.response?.data?.message || "Checkout thất bại");
    } finally {
      setActionOut(false);
    }
  };

  const headerSubtitle = useMemo(() => {
    if (!booking) return `Booking ID: ${id}`;
    const gym = booking?.Gym?.name || booking?.gym?.name || booking?.gymName;
    const trainerName =
      booking?.Trainer?.User?.username ||
      booking?.Trainer?.User?.email ||
      booking?.Trainer?.name ||
      booking?.trainerName ||
      "PT";
    return `${gym ? `🏟️ ${gym} • ` : ""}👤 ${trainerName}`;
  }, [booking, id]);

  const checkInTime = booking?.checkinTime || booking?.checkInTime;
  const checkOutTime = booking?.checkoutTime || booking?.checkOutTime;

  const badge = STATUS_META[status] || { label: status || "—", cls: "is-off" };

  return (
    <div className="mh-wrap">
      <div className="mh-head">
        <div>
          <h2 className="mh-title">📍 Điểm danh buổi tập</h2>
          <div className="mh-sub">
            <span className={`m-badge ${badge.cls}`} style={{ marginRight: 8 }}>{badge.label}</span>
            <span className="mh-sub">{headerSubtitle}</span>
          </div>
        </div>

        <div className="mh-toolbar">
          <button className="m-btn m-btn--small m-btn--ghost" onClick={() => navigate("/member/bookings")}>
            ← Quay lại lịch
          </button>
          <button className="m-btn m-btn--small" onClick={loadBooking} disabled={loading || actionIn || actionOut}>
            ⟳ Reload
          </button>
        </div>
      </div>

      {err && <div className="m-error">{err}</div>}

      <div className="m-card padded">
        {loading ? (
          <div className="m-empty">Đang tải dữ liệu booking...</div>
        ) : !booking ? (
          <div className="m-empty">
            Không có dữ liệu booking. Hãy quay lại lịch và chọn đúng booking.
          </div>
        ) : (
          <>
            <div className="ci-grid">
              <div className="ci-kpi">
                <div className="ci-k">Ngày</div>
                <div className="ci-v">{booking.bookingDate || "-"}</div>
                <div className="ci-s">{formatTime(booking.startTime)} → {formatTime(booking.endTime)}</div>
              </div>

              <div className="ci-kpi">
                <div className="ci-k">Check-in time</div>
                <div className="ci-v">{formatDateTime(checkInTime)}</div>
                <div className="ci-s">Tạo Attendance.checkInTime khi check-in</div>
              </div>

              <div className="ci-kpi">
                <div className="ci-k">Check-out time</div>
                <div className="ci-v">{formatDateTime(checkOutTime)}</div>
                <div className="ci-s">Hoàn tất: trừ buổi gói + cộng session cho PT</div>
              </div>
            </div>

            <div className="m-divider" />

            <div className="ci-steps">
              <div className="ci-step">
                <div className="ci-stepT">Bước 1 • Check-in</div>
                <div className="ci-stepD">
                  Điều kiện: <b>status = confirmed</b><br />
                  Kết quả: tạo Attendance + booking → <b>in_progress</b>
                </div>
              </div>

              <div className="ci-step">
                <div className="ci-stepT">Bước 2 • Hoàn thành</div>
                <div className="ci-stepD">
                  Điều kiện: <b>{STRICT_CHECKOUT ? "status = in_progress" : "in_progress / confirmed"}</b><br />
                  Kết quả: booking → <b>completed</b>
                </div>
              </div>

              <div className="ci-step">
                <div className="ci-stepT">Lưu ý</div>
                <div className="ci-stepD">
                  MVP dùng <b>method = "qr"</b>. Sau này có thể thay QR thật / NFC / manual.
                </div>
              </div>
            </div>

            <div className="ci-actions">
              <button
                className={`m-btn ${canCheckin ? "m-btn--ok" : ""}`}
                onClick={handleCheckin}
                disabled={!canCheckin || actionIn || actionOut}
                title={canCheckin ? "Check-in buổi tập" : `Không thể check-in khi status = ${status}`}
              >
                {actionIn ? "Đang check-in..." : "✅ Check-in"}
              </button>

              <button
                className={`m-btn ${canCheckout ? "m-btn--primary" : ""}`}
                onClick={handleCheckout}
                disabled={!canCheckout || actionOut || actionIn}
                title={canCheckout ? "Hoàn thành buổi tập" : `Không thể checkout khi status = ${status}`}
              >
                {actionOut ? "Đang hoàn thành..." : "🏁 Hoàn thành buổi"}
              </button>
            </div>

            <div className="mh-sub" style={{ marginTop: 10 }}>
              Tip: Nếu muốn UI hiển thị Attendance thực, hãy cho BE include Attendance theo bookingId hoặc thêm endpoint
              <b> GET /api/member/bookings/:id</b>.
            </div>
          </>
        )}
      </div>

      {/* local styles */}
      <style>{`
        .ci-grid{
          display:grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 12px;
        }
        @media (max-width: 900px){
          .ci-grid{ grid-template-columns: 1fr; }
        }
        .ci-kpi{
          background: rgba(0,0,0,.18);
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 18px;
          padding: 14px;
        }
        .ci-k{
          font-size: 11px;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: rgba(255,255,255,.60);
          font-weight: 1000;
        }
        .ci-v{
          margin-top: 8px;
          font-size: 20px;
          font-weight: 1100;
          letter-spacing: -0.02em;
        }
        .ci-s{
          margin-top: 6px;
          font-size: 12px;
          color: rgba(255,255,255,.68);
          line-height: 1.45;
        }

        .ci-steps{
          display:grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 12px;
        }
        @media (max-width: 900px){
          .ci-steps{ grid-template-columns: 1fr; }
        }
        .ci-step{
          background: rgba(0,0,0,.18);
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 18px;
          padding: 14px;
        }
        .ci-stepT{ font-weight: 1100; }
        .ci-stepD{
          margin-top: 8px;
          color: rgba(255,255,255,.72);
          font-size: 13px;
          line-height: 1.5;
        }

        .ci-actions{
          display:flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 14px;
        }
      `}</style>
    </div>
  );
}
