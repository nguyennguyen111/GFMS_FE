import React, { useEffect, useMemo, useState } from "react";
import "./MemberBookingPage.css";
import { memberGetMyBookings } from "../../../services/memberBookingService";
import BookingDetailModal from "./BookingDetailModal";

const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const monthLabel = (d) => `Tháng ${d.getMonth() + 1} / ${d.getFullYear()}`;

const normalizeStatus = (s) => {
  if (s === "in_progress") return "completed";
  return s;
};

const statusLabel = (s) => {
  const normalized = normalizeStatus(s);
  if (normalized === "confirmed") return "Đã xác nhận";
  if (normalized === "completed") return "Hoàn thành";
  if (normalized === "cancelled") return "Đã huỷ";
  return "—";
};

const pad2 = (n) => String(n).padStart(2, "0");

const toLocalDateKey = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = pad2(dateObj.getMonth() + 1);
  const d = pad2(dateObj.getDate());
  return `${y}-${m}-${d}`;
};

const bookingDateKey = (bookingDate) => {
  if (!bookingDate) return "";
  const s = String(bookingDate);
  return s.length >= 10 ? s.slice(0, 10) : s;
};

const fmtTime = (t) => {
  if (!t) return "";
  return String(t).slice(0, 5);
};

export default function MemberBookingsCalendarPage() {
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState(null);

  const [cursor, setCursor] = useState(() => new Date());
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedDay, setSelectedDay] = useState(() => toLocalDateKey(new Date()));

  useEffect(() => {
    memberGetMyBookings()
      .then((res) => {
        const data = res?.data?.data || [];
        setBookings(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Load bookings failed:", err);
        setBookings([]);
      });
  }, []);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();

    return bookings.filter((b) => {
      const trainerName = b?.Trainer?.User?.username || "";
      const gymName = b?.Gym?.name || "";
      const packageName = b?.Package?.name || "";

      const matchText =
        !text ||
        `${trainerName} ${gymName} ${packageName}`.toLowerCase().includes(text);

      const normalizedStatus = normalizeStatus(b.status);
      const matchStatus = status === "all" ? true : normalizedStatus === status;

      return matchText && matchStatus;
    });
  }, [bookings, q, status]);

  const byDate = useMemo(() => {
    return filtered.reduce((acc, b) => {
      const date = bookingDateKey(b.bookingDate);
      if (!date) return acc;
      if (!acc[date]) acc[date] = [];
      acc[date].push(b);
      return acc;
    }, {});
  }, [filtered]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const offset = (firstDay.getDay() + 6) % 7;

  const todayISO = toLocalDateKey(new Date());

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));

  const counts = useMemo(() => {
    const c = { all: filtered.length, confirmed: 0, completed: 0, cancelled: 0 };

    filtered.forEach((b) => {
      const normalizedStatus = normalizeStatus(b.status);

      if (normalizedStatus === "confirmed") c.confirmed += 1;
      else if (normalizedStatus === "completed") c.completed += 1;
      else if (normalizedStatus === "cancelled") c.cancelled += 1;
    });

    return c;
  }, [filtered]);

  const jumpToday = () => {
    const now = new Date();
    setCursor(now);
    setSelectedDay(toLocalDateKey(now));
  };

  const dayList = useMemo(() => {
    const list = (byDate[selectedDay] || []).slice();
    list.sort((a, b) => String(a.startTime || "").localeCompare(String(b.startTime || "")));
    return list;
  }, [byDate, selectedDay]);

  const selectedDayText = useMemo(() => {
    if (!selectedDay) return "Chọn ngày";
    const [y, m, d] = selectedDay.split("-");
    return `Ngày ${d}/${m}/${y}`;
  }, [selectedDay]);

  return (
    <div className="cal-shell">
      <div className="cal-page">
        <div className="cal-hero">
          <div className="cal-heroTop">
            <div className="cal-titleBox">
              <div className="cal-kicker">LỊCH BUỔI TẬP</div>
              <h2 className="cal-title">Calendar Booking</h2>
              <p className="cal-sub">
                Theo dõi lịch booking của bạn theo ngày, lọc nhanh và xem chi tiết từng buổi tập.
              </p>
            </div>

            <div className="cal-monthNav">
              <button
                className="cal-navBtn"
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                type="button"
                aria-label="Tháng trước"
              >
                ‹
              </button>

              <div className="cal-monthText">{monthLabel(cursor)}</div>

              <button
                className="cal-navBtn"
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                type="button"
                aria-label="Tháng sau"
              >
                ›
              </button>

              <button className="cal-todayBtn" onClick={jumpToday} type="button">
                Hôm nay
              </button>
            </div>
          </div>

          <div className="cal-summaryRow">
            <div className="cal-stats">
              <span className="cal-pill">
                Tổng <b>{counts.all}</b>
              </span>
              <span className="cal-pill">
                Confirmed <b>{counts.confirmed}</b>
              </span>
              <span className="cal-pill">
                Completed <b>{counts.completed}</b>
              </span>
              <span className="cal-pill">
                Cancelled <b>{counts.cancelled}</b>
              </span>
            </div>
          </div>

          <div className="cal-toolbar" role="search">
            <div className="cal-search">
              <span className="cal-searchIcon">🔎</span>
              <input
                placeholder="Tìm theo PT / Gym / Gói..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {q && (
                <button className="cal-clear" onClick={() => setQ("")} type="button">
                  ✕
                </button>
              )}
            </div>

            <div className="cal-filtersWrap">
              <div className="cal-filters">
                <button
                  className={`cal-chip ${status === "all" ? "active" : ""}`}
                  onClick={() => setStatus("all")}
                  type="button"
                >
                  <span className="chip-label">Tất cả</span>
                  <span className="chip-count">{counts.all}</span>
                </button>

                <button
                  className={`cal-chip ${status === "confirmed" ? "active confirmed" : ""}`}
                  onClick={() => setStatus("confirmed")}
                  type="button"
                >
                  <span className="chip-dot confirmed" />
                  <span className="chip-label">Đã xác nhận</span>
                  <span className="chip-count">{counts.confirmed}</span>
                </button>

                <button
                  className={`cal-chip ${status === "completed" ? "active completed" : ""}`}
                  onClick={() => setStatus("completed")}
                  type="button"
                >
                  <span className="chip-dot completed" />
                  <span className="chip-label">Hoàn thành</span>
                  <span className="chip-count">{counts.completed}</span>
                </button>

                <button
                  className={`cal-chip ${status === "cancelled" ? "active cancelled" : ""}`}
                  onClick={() => setStatus("cancelled")}
                  type="button"
                >
                  <span className="chip-dot cancelled" />
                  <span className="chip-label">Đã huỷ</span>
                  <span className="chip-count">{counts.cancelled}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="cal-board">
          <div className="cal-grid">
            {DAYS.map((d) => (
              <div key={d} className="cal-head">
                {d}
              </div>
            ))}

            {cells.map((d, i) => {
              if (!d) return <div key={i} className="cal-cell empty" />;

              const iso = toLocalDateKey(d);
              const dayBookings = (byDate[iso] || []).slice();
              const isToday = iso === todayISO;
              const isSelected = iso === selectedDay;

              dayBookings.sort((a, b) =>
                String(a.startTime || "").localeCompare(String(b.startTime || ""))
              );

              return (
                <div
                  key={i}
                  className={`cal-cell ${isToday ? "today" : ""} ${
                    dayBookings.length ? "has" : ""
                  } ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedDay(iso)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedDay(iso);
                    }
                  }}
                >
                  <div className="cal-cellTop">
                    <div className={`cal-date ${isToday ? "today" : ""}`}>{d.getDate()}</div>
                    {dayBookings.length > 0 && <div className="cal-dot" />}
                  </div>

                  <div className="cal-events">
                    {dayBookings.slice(0, 3).map((b) => (
                      <button
                        key={b.id}
                        className={`cal-event ${normalizeStatus(b.status)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(b);
                        }}
                        type="button"
                        title={`${fmtTime(b.startTime)}-${fmtTime(b.endTime)} • ${
                          b?.Trainer?.User?.username || "PT"
                        }`}
                      >
                        <div className="ev-time">
                          {fmtTime(b.startTime)}–{fmtTime(b.endTime)}
                        </div>
                        <div className="ev-pt">{b?.Trainer?.User?.username || "PT"}</div>
                        <div className="ev-status">{statusLabel(b.status)}</div>
                      </button>
                    ))}

                    {dayBookings.length > 3 && (
                      <div className="cal-more">+{dayBookings.length - 3} buổi</div>
                    )}

                    {dayBookings.length === 0 && <div className="cal-emptyHint">—</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selected && <BookingDetailModal booking={selected} onClose={() => setSelected(null)} />}
      </div>

      <aside className="cal-side">
        <div className="cal-sideHead">
          <div>
            <div className="cal-sideKicker">BOOKING TRONG NGÀY</div>
            <div className="cal-sideTitle">{selectedDayText}</div>
          </div>
          <button className="cal-sideBtn" onClick={() => setSelectedDay(todayISO)} type="button">
            Hôm nay
          </button>
        </div>

        <div className="cal-sideBody">
          {dayList.length === 0 ? (
            <div className="cal-sideEmpty">
              <div className="cal-sideEmptyIcon">🗓️</div>
              <div className="cal-sideEmptyText">Không có booking trong ngày này.</div>
              <div className="cal-sideEmptyHint">Chọn ngày khác trên lịch để xem.</div>
            </div>
          ) : (
            <div className="cal-sideList">
              {dayList.map((b) => (
                <button
                  key={b.id}
                  className={`cal-sideItem ${normalizeStatus(b.status)}`}
                  type="button"
                  onClick={() => setSelected(b)}
                >
                  <div className="si-top">
                    <div className="si-timeBlock">
                      <div className="si-time">
                        {fmtTime(b.startTime)}–{fmtTime(b.endTime)}
                      </div>
                      <div className="si-duration">Buổi tập cá nhân</div>
                    </div>

                    <div className={`si-badge ${normalizeStatus(b.status)}`}>
                      {statusLabel(b.status)}
                    </div>
                  </div>

                  <div className="si-main">
                    <div className="si-name">🧑‍🏫 {b?.Trainer?.User?.username || "PT"}</div>
                    <div className="si-row">🏋️ {b?.Gym?.name || "—"}</div>
                    <div className="si-row">📦 {b?.Package?.name || "—"}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="cal-sideFoot">
          <div className="cal-sideHint">
            Click ngày để xem danh sách • Click booking để mở chi tiết
          </div>
        </div>
      </aside>
    </div>
  );
}