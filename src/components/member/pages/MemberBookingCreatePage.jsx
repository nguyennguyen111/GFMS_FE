import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  memberGetTrainers,
  memberGetSlots,
  memberCreateBooking,
} from "../../../services/memberBookingService";

// ===== local date helpers (avoid UTC shift) =====
function toLocalISODate(d = new Date()) {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function formatVN(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
function weekdayVN(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const map = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return map[d.getDay()];
}
function nowMinutesLocal() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}
function timeToMinutes(t) {
  const [hh, mm] = String(t || "").split(":");
  return (parseInt(hh, 10) || 0) * 60 + (parseInt(mm, 10) || 0);
}

export default function MemberBookingCreatePage() {
  const navigate = useNavigate();

  const todayISO = useMemo(() => toLocalISODate(new Date()), []);

  const [trainers, setTrainers] = useState([]);
  const [trainerId, setTrainerId] = useState("");

  const [weekStart, setWeekStart] = useState(todayISO);
  const [date, setDate] = useState(todayISO);

  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState("");

  const [loadingTrainers, setLoadingTrainers] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const selectedTrainer = useMemo(
    () => trainers.find((t) => String(t.id) === String(trainerId)),
    [trainers, trainerId]
  );

  const weekDays = useMemo(() => {
    const base = new Date(`${weekStart}T00:00:00`);
    return Array.from({ length: 7 }).map((_, i) => {
      const iso = toLocalISODate(addDays(base, i));
      return {
        iso,
        disabled: iso < todayISO,
      };
    });
  }, [weekStart, todayISO]);

  // Load trainers
  useEffect(() => {
    (async () => {
      setErr("");
      setLoadingTrainers(true);
      try {
        const res = await memberGetTrainers();
        const data = res.data?.data || [];
        setTrainers(data);
        if (data.length > 0) setTrainerId(String(data[0].id));
      } catch (e) {
        setErr("Không tải được danh sách PT trong gym của bạn.");
      } finally {
        setLoadingTrainers(false);
      }
    })();
  }, []);

  // Load slots
  const loadSlots = useCallback(async () => {
    setSlots([]);
    setSlot("");
    if (!trainerId || !date) return;
    if (date < todayISO) return;

    setLoadingSlots(true);
    setErr("");
    try {
      const res = await memberGetSlots({ trainerId, date });
      setSlots(res.data?.data || []);
    } catch (e) {
      setErr(e.response?.data?.message || "Không tải được lịch trống của PT.");
    } finally {
      setLoadingSlots(false);
    }
  }, [trainerId, date, todayISO]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const canSubmit = !!trainerId && !!date && !!slot && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      setErr("Vui lòng chọn PT, ngày và khung giờ.");
      return;
    }

    // FE guard (BE đã chặn)
    if (date < todayISO) {
      setErr("Không thể đặt lịch trong quá khứ.");
      return;
    }
    if (date === todayISO) {
      const sMin = timeToMinutes(slot);
      if (sMin <= nowMinutesLocal()) {
        setErr("Khung giờ này đã qua. Vui lòng chọn giờ khác.");
        return;
      }
    }

    setSubmitting(true);
    setErr("");
    try {
      await memberCreateBooking({ trainerId, date, startTime: slot });
      navigate("/member/bookings", { replace: true });
    } catch (e) {
      setErr(e.response?.data?.message || "Đặt lịch thất bại.");
      // nếu conflict 409 thì reload slot để UI update ngay
      await loadSlots();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="op-wrap">
      <div className="op-head">
        <div>
          <h2 className="op-title">📅 Đặt lịch PT</h2>
          <div className="op-sub">
            Lịch hiển thị là <b>lịch trống của PT</b> theo ngày (slot 60 phút) • PT thuộc gym của bạn (TrainerShare).
          </div>
        </div>

        <div className="op-toolbar">
          <button className="op-btn op-btn--small" onClick={() => navigate("/member/bookings")}>
            ← Lịch của tôi
          </button>
        </div>
      </div>

      {err && <div className="op-error">{err}</div>}

      <div className="op-card padded">
        <div className="op-grid">
          {/* Trainer cards */}
          <div className="op-row">
            <label>Huấn luyện viên</label>

            {loadingTrainers ? (
              <div className="op-sub">• Đang tải PT...</div>
            ) : trainers.length === 0 ? (
              <div className="op-sub">• Chưa có PT nào được share vào gym của bạn.</div>
            ) : (
              <div className="pt-grid">
                {trainers.map((t) => {
                  const active = String(t.id) === String(trainerId);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`pt-card ${active ? "is-active" : ""}`}
                      onClick={() => setTrainerId(String(t.id))}
                    >
                      <div className="pt-top">
                        <div className="pt-avatar">🏋️</div>
                        <div className="pt-info">
                          <div className="pt-name">{t.User?.username || `Trainer #${t.id}`}</div>
                          <div className="pt-sub">{t.User?.email || ""}</div>
                        </div>
                      </div>
                      <div className="pt-meta">
                        <span className="pt-pill">TrainerShare</span>
                        {t.share?.toGym?.name ? <span className="pt-dim">• {t.share.toGym.name}</span> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedTrainer && (
              <div className="op-sub" style={{ marginTop: 10 }}>
                • Bạn đang chọn: <b>{selectedTrainer.User?.username}</b>
              </div>
            )}
          </div>

          {/* Week selector */}
          <div className="op-row">
            <label>Chọn ngày (theo tuần)</label>

            <div className="wk-toolbar">
              <button
                type="button"
                className="op-btn op-btn--small"
                onClick={() => setWeekStart(toLocalISODate(addDays(new Date(`${weekStart}T00:00:00`), -7)))}
              >
                ← Tuần trước
              </button>

              <button
                type="button"
                className="op-btn op-btn--small"
                onClick={() => {
                  setWeekStart(todayISO);
                  setDate(todayISO);
                }}
              >
                Hôm nay
              </button>

              <button
                type="button"
                className="op-btn op-btn--small"
                onClick={() => setWeekStart(toLocalISODate(addDays(new Date(`${weekStart}T00:00:00`), 7)))}
              >
                Tuần sau →
              </button>
            </div>

            <div className="wk-tabs">
              {weekDays.map((d) => {
                const active = d.iso === date;
                return (
                  <button
                    key={d.iso}
                    type="button"
                    className={`wk-tab ${active ? "is-active" : ""}`}
                    disabled={d.disabled || !trainerId}
                    onClick={() => setDate(d.iso)}
                    title={d.disabled ? "Không đặt lịch quá khứ" : ""}
                  >
                    <div className="wk-day">{weekdayVN(d.iso)}</div>
                    <div className="wk-date">
                      {d.iso.slice(8, 10)}/{d.iso.slice(5, 7)}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="op-sub" style={{ marginTop: 8 }}>
              • Ngày đang chọn: <b>{formatVN(date)}</b>
            </div>
          </div>

          {/* Slots */}
          <div className="op-row">
            <label>Khung giờ trống (Calendar PT)</label>

            {!trainerId ? (
              <div className="op-sub">• Chọn PT trước.</div>
            ) : loadingSlots ? (
              <div className="op-sub">• Đang tải lịch trống...</div>
            ) : slots.length === 0 ? (
              <div className="op-sub">• Ngày này không có slot trống (hoặc PT không làm việc ngày này).</div>
            ) : (
              <div className="slot-grid">
                {slots.map((s, idx) => {
                  const value = s.startTime;
                  const active = String(slot) === String(value);

                  // FE extra guard for today
                  const disabled =
                    date === todayISO && timeToMinutes(value) <= nowMinutesLocal();

                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`slot-chip ${active ? "is-active" : ""}`}
                      onClick={() => setSlot(value)}
                      disabled={disabled}
                      title={disabled ? "Slot đã qua" : ""}
                    >
                      <div className="slot-time">{s.startTime}</div>
                      <div className="slot-sub">{s.endTime}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {slot && (
              <div className="op-sub" style={{ marginTop: 10 }}>
                • Bạn đã chọn: <b>{slot}</b>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="op-row">
            <label>Tóm tắt</label>
            <div className="summary-card">
              <div className="summary-item">
                <div className="summary-k">PT</div>
                <div className="summary-v">{selectedTrainer?.User?.username || "—"}</div>
              </div>
              <div className="summary-item">
                <div className="summary-k">Ngày</div>
                <div className="summary-v">{formatVN(date) || "—"}</div>
              </div>
              <div className="summary-item">
                <div className="summary-k">Giờ</div>
                <div className="summary-v">{slot || "—"}</div>
              </div>
              <div className="summary-note">
                * Khi checkout buổi tập: trừ 1 buổi trong gói + cộng 1 session cho PT.
              </div>
            </div>
          </div>
        </div>

        <div className="op-modal__foot">
          <button className="op-btn" onClick={() => navigate("/member/packages")}>
            Xem gói tập
          </button>

          <button className="op-btn op-btn--primary" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? "Đang đặt..." : "Đặt lịch"}
          </button>
        </div>
      </div>

      {/* CSS: bạn có thể chuyển qua memberUI.css */}
      <style>{`
        .pt-grid{
          display:grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap:12px;
          margin-top:6px;
        }
        @media (max-width: 900px){ .pt-grid{ grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 520px){ .pt-grid{ grid-template-columns: 1fr; } }

        .pt-card{
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 16px;
          padding: 12px;
          cursor: pointer;
          color: rgba(255,255,255,0.92);
          text-align: left;
          transition: 150ms ease;
        }
        .pt-card:hover{ transform: translateY(-1px); border-color: rgba(255,165,0,0.35); }
        .pt-card.is-active{
          border-color: rgba(255,165,0,0.75);
          box-shadow: 0 0 0 3px rgba(255,165,0,0.15) inset;
        }
        .pt-top{ display:flex; gap:10px; align-items:center; }
        .pt-avatar{
          width:40px; height:40px; border-radius: 12px;
          display:flex; align-items:center; justify-content:center;
          background: rgba(255,165,0,0.15);
          border: 1px solid rgba(255,165,0,0.25);
          flex: 0 0 auto;
        }
        .pt-name{ font-weight: 900; }
        .pt-sub{ font-size: 12px; opacity: 0.75; margin-top:2px; }
        .pt-meta{ display:flex; gap:8px; align-items:center; margin-top:10px; }
        .pt-pill{
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
        }
        .pt-dim{ font-size: 12px; opacity: 0.7; }

        .wk-toolbar{ display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px; }
        .wk-tabs{ display:grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap:10px; }
        @media (max-width: 900px){ .wk-tabs{ grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (max-width: 520px){ .wk-tabs{ grid-template-columns: repeat(2, minmax(0, 1fr)); } }

        .wk-tab{
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          padding: 10px;
          cursor:pointer;
          color: rgba(255,255,255,0.92);
          text-align:left;
          transition:150ms ease;
        }
        .wk-tab:hover{ transform: translateY(-1px); border-color: rgba(255,165,0,0.35); }
        .wk-tab:disabled{ opacity:0.45; cursor:not-allowed; transform:none; }
        .wk-tab.is-active{
          border-color: rgba(255,165,0,0.75);
          box-shadow: 0 0 0 3px rgba(255,165,0,0.15) inset;
        }
        .wk-day{ font-weight:900; }
        .wk-date{ font-size:12px; opacity:0.8; margin-top:2px; }

        .slot-grid{ display:grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap:10px; margin-top:6px; }
        @media (max-width: 900px){ .slot-grid{ grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 520px){ .slot-grid{ grid-template-columns: repeat(2, minmax(0, 1fr)); } }

        .slot-chip{
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          padding: 10px;
          text-align:left;
          cursor:pointer;
          color: rgba(255,255,255,0.92);
          transition:150ms ease;
        }
        .slot-chip:hover{ transform: translateY(-1px); border-color: rgba(255,165,0,0.35); }
        .slot-chip:disabled{ opacity:0.45; cursor:not-allowed; transform:none; }
        .slot-chip.is-active{
          border-color: rgba(255,165,0,0.75);
          box-shadow: 0 0 0 3px rgba(255,165,0,0.15) inset;
        }
        .slot-time{ font-weight:900; }
        .slot-sub{ font-size:12px; opacity:0.75; margin-top:2px; }

        .summary-card{
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 16px;
          padding: 12px;
        }
        .summary-item{
          display:flex;
          justify-content:space-between;
          padding: 8px 6px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .summary-item:last-of-type{ border-bottom:none; }
        .summary-k{ opacity:0.75; }
        .summary-v{ font-weight:900; }
        .summary-note{ margin-top:10px; font-size:12px; opacity:0.7; }
      `}</style>
    </div>
  );
}
