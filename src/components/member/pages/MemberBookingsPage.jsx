import React, { useEffect, useMemo, useState } from "react";
import "./MemberBookingPage.css";
import { memberGetMyBookings } from "../../../services/memberBookingService";
import BookingDetailModal from "./BookingDetailModal";

const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export default function MemberBookingsCalendarPage() {
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [cursor, setCursor] = useState(() => new Date());

  useEffect(() => {
    memberGetMyBookings().then(res => {
      setBookings(res.data.data || []);
    });
  }, []);

  const byDate = useMemo(() => {
    return bookings.reduce((acc, b) => {
      const date = b.bookingDate.slice(0, 10);
      acc[date] = acc[date] || [];
      acc[date].push(b);
      return acc;
    }, {});
  }, [bookings]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const offset = (firstDay.getDay() + 6) % 7;

  const today = new Date().toISOString().slice(0, 10);

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }

  return (
    <div className="cal-wrap">
      {/* ===== HEADER ===== */}
      <div className="cal-header">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</button>
        <h2>📅 Tháng {month + 1} / {year}</h2>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))}>›</button>
      </div>

      {/* ===== GRID ===== */}
      <div className="cal-grid">
        {DAYS.map(d => (
          <div key={d} className="cal-head">{d}</div>
        ))}

        {cells.map((d, i) => {
          if (!d) return <div key={i} className="cal-cell empty" />;

          const iso = d.toISOString().slice(0, 10);
          const dayBookings = byDate[iso] || [];
          const isToday = iso === today;

          return (
            <div
              key={i}
              className={`cal-cell
                ${dayBookings.length ? "has-booking" : ""}
                ${isToday ? "today" : ""}
              `}
            >
              <div className="cal-date">{d.getDate()}</div>

              <div className="cal-events">
                {dayBookings.map(b => (
                  <div
                    key={b.id}
                    className={`cal-event ${b.status}`}
                    onClick={() => setSelected(b)}
                  >
                    <div className="row time">
                      ⏰ {b.startTime.slice(0, 5)} – {b.endTime.slice(0, 5)}
                    </div>

                    <div className="row pt">
                      🧑‍🏫 {b.Trainer?.User?.username || "PT"}
                    </div>

                    <div className={`row status ${b.status}`}>
                      {b.status === "confirmed" && "🟢 Đã xác nhận"}
                      {b.status === "completed" && "✅ Hoàn thành"}
                      {b.status === "cancelled" && "🔴 Đã huỷ"}
                    </div>
                  </div>

                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <BookingDetailModal
          booking={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
