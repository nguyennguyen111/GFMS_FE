import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  memberCheckinBooking,
  memberCheckoutBooking,
  memberGetMyBookings,
} from "../../../services/memberBookingService";

const STATUS_META = {
  pending: { label: "Chờ xác nhận", tone: "gray" },
  confirmed: { label: "Đã xác nhận", tone: "blue" },
  in_progress: { label: "Đang tập", tone: "amber" },
  completed: { label: "Hoàn thành", tone: "green" },
  cancelled: { label: "Đã huỷ", tone: "red" },
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

function StatusPill({ status }) {
  const meta = STATUS_META[status] || { label: status || "-", tone: "gray" };
  return (
    <span className={`att-badge att-badge--${meta.tone}`} title={status}>
      <span className="att-badge__dot" />
      {meta.label}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="att-card">
      <div className="att-skel att-skel--h1" />
      <div className="att-skel att-skel--p" />
      <div className="att-grid3" style={{ marginTop: 14 }}>
        <div className="att-skel att-skel--box" />
        <div className="att-skel att-skel--box" />
        <div className="att-skel att-skel--box" />
      </div>
    </div>
  );
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
  // (Nếu muốn “thoáng” theo BE hiện tại: set false)
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
      alert("✅ Check-in thành công");
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
      alert("🎉 Buổi tập hoàn thành");
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

  const status = booking?.status;
  const checkInTime = booking?.checkinTime || booking?.checkInTime;
  const checkOutTime = booking?.checkoutTime || booking?.checkOutTime;

  return (
    <>
      <style>{`
        :root{
          --bg0:#0b1020;
          --bg1:#0e1630;
          --card:rgba(255,255,255,.08);
          --card2:rgba(255,255,255,.06);
          --border:rgba(255,255,255,.14);
          --text:#eaf0ff;
          --muted:rgba(234,240,255,.72);
          --muted2:rgba(234,240,255,.55);
          --shadow: 0 18px 70px rgba(0,0,0,.45);
        }

        .att-page{
          min-height: calc(100vh - 0px);
          color: var(--text);
          background:
            radial-gradient(900px 500px at 20% 10%, rgba(111, 74, 255, .30), transparent 60%),
            radial-gradient(700px 420px at 80% 15%, rgba(0, 186, 255, .24), transparent 60%),
            radial-gradient(700px 500px at 50% 90%, rgba(255, 180, 0, .16), transparent 60%),
            linear-gradient(180deg, var(--bg0), var(--bg1));
          padding: 28px 0 64px;
        }

        .att-wrap{
          width: min(1080px, calc(100% - 32px));
          margin: 0 auto;
        }

        .att-top{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .att-titleRow{
          display:flex;
          align-items:center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .att-title{
          font-size: 30px;
          line-height: 1.15;
          margin: 0;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .att-sub{
          margin-top: 8px;
          color: var(--muted);
          font-size: 14px;
          display:flex;
          flex-direction:column;
          gap: 4px;
        }

        .att-mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

        .att-actions{
          display:flex;
          align-items:center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .att-btn{
          border: 1px solid var(--border);
          background: rgba(255,255,255,.06);
          color: var(--text);
          border-radius: 14px;
          padding: 10px 12px;
          font-weight: 800;
          cursor: pointer;
          transition: transform .12s ease, background .12s ease, opacity .12s ease;
          backdrop-filter: blur(10px);
        }
        .att-btn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.10); }
        .att-btn:disabled{ opacity: .55; cursor: not-allowed; transform: none; }

        .att-btn--ghost{
          background: transparent;
        }

        .att-card{
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 22px;
          box-shadow: var(--shadow);
          backdrop-filter: blur(14px);
          padding: 18px;
        }

        .att-cardHead{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap: 14px;
        }

        .att-cardTitle{
          font-size: 18px;
          font-weight: 900;
          margin: 0;
          letter-spacing: -0.01em;
        }
        .att-cardDesc{
          margin-top: 6px;
          font-size: 13px;
          color: var(--muted);
        }

        .att-tags{
          display:flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content:flex-end;
        }
        .att-tag{
          border: 1px solid rgba(255,255,255,.18);
          background: rgba(0,0,0,.18);
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 12px;
          color: var(--muted);
          font-weight: 800;
        }
        .att-tag b{ color: var(--text); }

        .att-grid3{
          display:grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 12px;
          margin-top: 14px;
        }
        @media (max-width: 900px){
          .att-grid3{ grid-template-columns: 1fr; }
          .att-top{ flex-direction:column; }
        }

        .att-kpi{
          background: var(--card2);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 18px;
          padding: 14px;
        }
        .att-kpiLabel{
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .12em;
          color: var(--muted2);
          font-weight: 900;
        }
        .att-kpiValue{
          margin-top: 8px;
          font-size: 22px;
          font-weight: 950;
          letter-spacing: -0.02em;
        }
        .att-kpiSub{
          margin-top: 6px;
          font-size: 12.5px;
          color: var(--muted);
        }

        .att-steps{
          display:grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 12px;
          margin-top: 12px;
        }
        @media (max-width: 900px){
          .att-steps{ grid-template-columns: 1fr; }
        }
        .att-step{
          background: rgba(0,0,0,.16);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 18px;
          padding: 14px;
        }
        .att-stepTitle{
          font-weight: 950;
          margin: 0;
        }
        .att-stepText{
          margin-top: 8px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
        }
        .att-stepText b{ color: var(--text); }

        .att-bottomActions{
          display:flex;
          gap: 10px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        .att-btnPrimary{
          background: linear-gradient(135deg, rgba(37,99,235,.92), rgba(99,102,241,.75));
          border: 1px solid rgba(255,255,255,.18);
        }
        .att-btnPrimary:hover{ background: linear-gradient(135deg, rgba(37,99,235,1), rgba(99,102,241,.9)); }

        .att-btnOk{
          background: linear-gradient(135deg, rgba(15,23,42,.85), rgba(2,132,199,.30));
          border: 1px solid rgba(255,255,255,.18);
        }

        .att-btnDisabled{
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.12);
          color: rgba(234,240,255,.55);
        }

        .att-error{
          margin-bottom: 12px;
          background: rgba(220,38,38,.14);
          border: 1px solid rgba(220,38,38,.30);
          color: rgba(255,220,220,.95);
          padding: 12px 14px;
          border-radius: 18px;
          backdrop-filter: blur(10px);
        }
        .att-errorTitle{
          font-weight: 950;
          margin-bottom: 4px;
        }

        .att-badge{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 999px;
          font-weight: 950;
          font-size: 13px;
          border: 1px solid rgba(255,255,255,.18);
          background: rgba(0,0,0,.20);
        }
        .att-badge__dot{
          width: 8px; height: 8px;
          border-radius: 999px;
          background: currentColor;
          opacity: .7;
        }
        .att-badge--green{ color: rgba(134,239,172,.95); }
        .att-badge--blue{ color: rgba(147,197,253,.98); }
        .att-badge--amber{ color: rgba(253,230,138,.98); }
        .att-badge--red{ color: rgba(252,165,165,.98); }
        .att-badge--gray{ color: rgba(226,232,240,.95); }

        .att-foot{
          margin-top: 12px;
          font-size: 12px;
          color: var(--muted2);
        }

        /* Skeleton */
        .att-skel{
          background: linear-gradient(90deg, rgba(255,255,255,.06), rgba(255,255,255,.14), rgba(255,255,255,.06));
          background-size: 200% 100%;
          animation: sk 1.2s ease-in-out infinite;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.10);
        }
        .att-skel--h1{ height: 26px; width: 280px; }
        .att-skel--p{ height: 14px; width: 420px; margin-top: 12px; opacity: .9; }
        .att-skel--box{ height: 92px; border-radius: 18px; }
        @keyframes sk{
          0%{ background-position: 0% 50%; }
          100%{ background-position: 100% 50%; }
        }
      `}</style>

      <div className="att-page">
        <div className="att-wrap">
          {/* Header */}
          <div className="att-top">
            <div>
              <div className="att-titleRow">
                <h1 className="att-title">📍 Điểm danh buổi tập</h1>
                {booking?.status && <StatusPill status={booking.status} />}
              </div>

              <div className="att-sub">
                <div>
                  <b>Booking:</b> <span className="att-mono">{id}</span>
                </div>
                <div>{headerSubtitle}</div>
              </div>
            </div>

            <div className="att-actions">
              <button className="att-btn att-btn--ghost" onClick={() => navigate("/member/bookings")}>
                ← Quay lại lịch
              </button>
              <button
                className="att-btn"
                onClick={loadBooking}
                disabled={loading || actionIn || actionOut}
                title="Tải lại"
              >
                ⟳ Reload
              </button>
            </div>
          </div>

          {err && (
            <div className="att-error">
              <div className="att-errorTitle">Có lỗi</div>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>{err}</div>
            </div>
          )}

          {loading ? (
            <Skeleton />
          ) : !booking ? (
            <div className="att-card">
              <h3 className="att-cardTitle">Không có dữ liệu booking</h3>
              <div className="att-cardDesc">
                Booking không tồn tại trong lịch của bạn, hoặc bạn không có quyền truy cập.
              </div>
              <div className="att-bottomActions">
                <button className="att-btn" onClick={() => navigate("/member/bookings")}>
                  ← Quay lại lịch
                </button>
                <button className="att-btn" onClick={loadBooking}>
                  ⟳ Thử lại
                </button>
              </div>
            </div>
          ) : (
            <div className="att-card">
              {/* Card head */}
              <div className="att-cardHead">
                <div>
                  <h3 className="att-cardTitle">Thông tin buổi tập</h3>
                  <div className="att-cardDesc">
                    Kiểm soát theo trạng thái booking + ghi nhận Attendance (member).
                  </div>
                </div>

                <div className="att-tags">
                  <span className="att-tag">
                    method: <b className="att-mono">qr</b>
                  </span>
                  <span className="att-tag">
                    type: <b className="att-mono">member</b>
                  </span>
                  <span className="att-tag">
                    status: <b className="att-mono">present</b>
                  </span>
                </div>
              </div>

              {/* KPI */}
              <div className="att-grid3">
                <div className="att-kpi">
                  <div className="att-kpiLabel">Ngày</div>
                  <div className="att-kpiValue">{booking.bookingDate || "-"}</div>
                  <div className="att-kpiSub">
                    {formatTime(booking.startTime)} → {formatTime(booking.endTime)}
                  </div>
                </div>

                <div className="att-kpi">
                  <div className="att-kpiLabel">Check-in time</div>
                  <div className="att-kpiValue">{formatDateTime(checkInTime)}</div>
                  <div className="att-kpiSub">Tạo Attendance.checkInTime khi check-in</div>
                </div>

                <div className="att-kpi">
                  <div className="att-kpiLabel">Check-out time</div>
                  <div className="att-kpiValue">{formatDateTime(checkOutTime)}</div>
                  <div className="att-kpiSub">Hoàn tất: trừ buổi gói + cộng session cho PT</div>
                </div>
              </div>

              {/* Steps */}
              <div className="att-steps">
                <div className="att-step">
                  <p className="att-stepTitle">Bước 1 • Check-in</p>
                  <div className="att-stepText">
                    Điều kiện: <b>status = confirmed</b>
                    <br />
                    Kết quả: tạo Attendance + booking → <b>in_progress</b>
                  </div>
                </div>

                <div className="att-step">
                  <p className="att-stepTitle">Bước 2 • Hoàn thành</p>
                  <div className="att-stepText">
                    Điều kiện: <b>{STRICT_CHECKOUT ? "status = in_progress" : "in_progress / confirmed"}</b>
                    <br />
                    Kết quả: booking → <b>completed</b>
                  </div>
                </div>

                <div className="att-step">
                  <p className="att-stepTitle">Lưu ý</p>
                  <div className="att-stepText">
                    MVP dùng <b>method = "qr"</b>. Sau này có thể thay QR thật / NFC / manual.
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="att-bottomActions">
                <button
                  className={[
                    "att-btn",
                    canCheckin ? "att-btnOk" : "att-btnDisabled",
                  ].join(" ")}
                  onClick={handleCheckin}
                  disabled={!canCheckin || actionIn || actionOut}
                  title={canCheckin ? "Check-in buổi tập" : `Không thể check-in khi status = ${status}`}
                >
                  {actionIn ? "Đang check-in..." : "✅ Check-in"}
                </button>

                <button
                  className={[
                    "att-btn",
                    canCheckout ? "att-btnPrimary" : "att-btnDisabled",
                  ].join(" ")}
                  onClick={handleCheckout}
                  disabled={!canCheckout || actionOut || actionIn}
                  title={canCheckout ? "Hoàn thành buổi tập" : `Không thể checkout khi status = ${status}`}
                >
                  {actionOut ? "Đang hoàn thành..." : "🏁 Hoàn thành buổi"}
                </button>
              </div>

              <div className="att-foot">
                Tip: Nếu muốn UI hiển thị Attendance thực (method/status/checkInTime/checkOutTime), hãy cho BE include Attendance theo
                bookingId hoặc thêm endpoint <span className="att-mono">GET /api/member/bookings/:id</span>.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
