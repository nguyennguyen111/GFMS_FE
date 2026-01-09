import React, { useEffect, useMemo, useState } from "react";
import {
  memberGetMyBookings,
  memberCancelBooking,
} from "../../../services/memberBookingService";
import { useNavigate } from "react-router-dom";

const fmtDate = (d) => (d ? String(d).slice(0, 10) : "—");

export default function MemberBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [actingId, setActingId] = useState(null);

  const [status, setStatus] = useState("all"); // all/confirmed/in_progress/completed/cancelled/pending/no_show
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await memberGetMyBookings();
      setBookings(res.data.data || []);
    } catch (e) {
      setErr("Không tải được lịch đã đặt.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (status === "all") return bookings;
    return bookings.filter((b) => b.status === status);
  }, [bookings, status]);

  const handleCancel = async (id) => {
    if (!window.confirm("Huỷ lịch này?")) return;
    setActingId(id);
    try {
      await memberCancelBooking(id, { reason: "Member cancelled" });
      await load();
    } catch (e) {
      alert(e.response?.data?.message || "Huỷ lịch thất bại");
    } finally {
      setActingId(null);
    }
  };

  const statusBadge = (s) => {
    const map = {
      confirmed: ["is-on", "Confirmed"],
      in_progress: ["is-on", "In progress"],
      completed: ["is-on", "Completed"],
      cancelled: ["is-off", "Cancelled"],
      pending: ["is-off", "Pending"],
      no_show: ["is-off", "No show"],
    };
    const [cls, text] = map[s] || ["is-off", s || "—"];
    return <span className={`op-badge ${cls}`}>{text}</span>;
  };

  return (
    <div className="op-wrap">
      <div className="op-head">
        <div>
          <h2 className="op-title">📖 Lịch đã đặt</h2>
          <div className="op-sub">
            Quản lý lịch • Huỷ lịch (pending/confirmed) • Check-in buổi tập.
          </div>
        </div>

        <div className="op-toolbar">
          <button className="op-btn op-btn--small op-btn--primary" onClick={() => navigate("/member/bookings/new")}>
            + Đặt lịch
          </button>
          <button className="op-btn op-btn--small" onClick={load} disabled={loading}>
            ↻ Tải lại
          </button>
        </div>
      </div>

      <div className="op-card padded" style={{ marginBottom: 12 }}>
        <div className="op-row">
          <label>Lọc theo trạng thái</label>
          <select className="op-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No show</option>
          </select>
          <div className="op-sub" style={{ marginTop: 6 }}>
            • Hiển thị: <b>{filtered.length}</b> lịch
          </div>
        </div>
      </div>

      {err && <div className="op-error">{err}</div>}

      <div className="op-card">
        {loading ? (
          <div className="op-empty">Đang tải lịch...</div>
        ) : filtered.length === 0 ? (
          <div className="op-empty">
            Chưa có lịch nào. Bạn có thể bấm <b>+ Đặt lịch</b> để tạo booking mới.
          </div>
        ) : (
          <table className="op-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Giờ</th>
                <th>PT</th>
                <th>Gym</th>
                <th>Trạng thái</th>
                <th style={{ width: 220 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td>{fmtDate(b.bookingDate)}</td>
                  <td>{b.startTime || "—"}</td>
                  <td>
                    <div className="op-name">{b.Trainer?.User?.username || "—"}</div>
                    <div className="op-desc">{b.Trainer?.User?.email || ""}</div>
                  </td>
                  <td>{b.Gym?.name || "—"}</td>
                  <td>{statusBadge(b.status)}</td>
                  <td>
                    <div className="op-actions">
                      {(b.status === "pending" || b.status === "confirmed") && (
                        <button
                          className="op-btn op-btn--warn op-btn--small"
                          onClick={() => handleCancel(b.id)}
                          disabled={actingId === b.id}
                        >
                          {actingId === b.id ? "Đang huỷ..." : "Huỷ"}
                        </button>
                      )}

                      {(b.status === "confirmed" || b.status === "in_progress") && (
                        <button
                          className="op-btn op-btn--ok op-btn--small"
                          onClick={() => navigate(`/member/checkin/${b.id}`)}
                        >
                          {b.status === "confirmed" ? "Check-in" : "Vào check-in"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
