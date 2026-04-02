import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  memberGetTrainers,
  memberGetSlots,
  memberCreateBooking,
} from "../../../services/memberBookingService";
import "./MemberBookingCreatePage.css";

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};
const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export default function MemberBookingCreatePage() {
  const [params] = useSearchParams();
  const activationId = params.get("activationId");
  const navigate = useNavigate();

  const [pkg, setPkg] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [trainerId, setTrainerId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const daysOfWeek = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(todayISO(), i)),
    []
  );

  useEffect(() => {
    memberGetTrainers({ activationId }).then(res => {
      setPkg(res.data.data.package);
      setTrainers(res.data.data.trainers);
      if (res.data.data.trainers.length) {
        setTrainerId(String(res.data.data.trainers[0].id));
      }
    });
  }, [activationId]);

  useEffect(() => {
    if (!trainerId) return;
    memberGetSlots({ trainerId, date, activationId }).then(res => {
      setSlots(res.data.data);
    });
  }, [trainerId, date, activationId]);

  const submit = async () => {
    try {
      setLoading(true);
      await memberCreateBooking({ activationId, trainerId, date, startTime: slot });
      navigate("/member/bookings");
    } catch (e) {
      setError(e.response?.data?.message || "Đặt lịch thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="booking-wrap">
      <div className="booking-card">
        <h2>📅 Đặt lịch PT</h2>

        {pkg && (
          <div className="package-box">
            {pkg.name} • còn {pkg.sessionsRemaining} buổi
          </div>
        )}

        <h4>👤 Huấn luyện viên</h4>
        <div className="pt-row">
          {trainers.map(t => (
            <button
              key={t.id}
              className={`pt-chip ${trainerId === String(t.id) ? "active" : ""}`}
              onClick={() => setTrainerId(String(t.id))}
            >
              {t.User.username}
            </button>
          ))}
        </div>

        <h4>📆 Tuần này</h4>
        <div className="week-row">
          {daysOfWeek.map((d, i) => (
            <button
              key={d}
              className={`day-chip ${date === d ? "active" : ""}`}
              onClick={() => setDate(d)}
            >
              {weekDays[i]}<br />
              {d.slice(8,10)}/{d.slice(5,7)}
            </button>
          ))}
        </div>

        <h4>⏰ Khung giờ</h4>
        <div className="slot-grid">
          {slots.map(s => (
            <button
              key={s.startTime}
              className={`slot-cell ${slot === s.startTime ? "active" : ""}`}
              onClick={() => setSlot(s.startTime)}
            >
              {s.startTime.slice(0,5)}
            </button>
          ))}
          {!slots.length && <div className="empty-slot">Không có slot trống</div>}
        </div>

        <button className="submit-btn" disabled={!slot || loading} onClick={submit}>
          {loading ? <span className="spinner" /> : "Đặt lịch"}
        </button>

        {error && <div className="booking-error">{error}</div>}
      </div>
    </div>
  );
}
