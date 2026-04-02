import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CircleX,
  Clock3,
  Dumbbell,
} from "lucide-react";
import "./MemberBookingPage.css";
import { memberGetMyBookings } from "../../../services/memberBookingService";
import { confirmPayosPayment } from "../../../services/paymentService";
import BookingDetailModal from "./BookingDetailModal";

const DAY_NAMES = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const pad2 = (n) => String(n).padStart(2, "0");

const toISO = (date) => {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
};

const startOfWeekMonday = (input) => {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const fmtRange = (start) => {
  const end = addDays(start, 6);
  return `${pad2(start.getDate())}/${pad2(start.getMonth() + 1)}/${start.getFullYear()} - ${pad2(
    end.getDate()
  )}/${pad2(end.getMonth() + 1)}/${end.getFullYear()}`;
};

const fmtTime = (value) => String(value || "").slice(0, 5);

const getMemberSessionDisplay = (booking) => {
  const st = String(booking?.status || "").toLowerCase();
  if (st === "cancelled") return { key: "cancelled", label: "Đã huỷ" };

  const taStatus = String(booking?.trainerAttendance?.status || "").toLowerCase();
  if (taStatus === "present" || taStatus === "completed") {
    return { key: "present", label: "Có mặt" };
  }
  if (taStatus === "absent") {
    return { key: "absent", label: "Vắng mặt" };
  }

  if (st === "in_progress" || st === "completed") {
    return { key: "attended", label: "Đã điểm danh" };
  }
  return { key: "scheduled", label: "Chưa điểm danh" };
};

export default function MemberBookingsCalendarPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [weekCursor, setWeekCursor] = useState(() => startOfWeekMonday(new Date()));

  const loadBookings = useCallback(async () => {
    try {
      const res = await memberGetMyBookings();
      const data = res?.data?.data || [];
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load bookings failed:", err);
      setBookings([]);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const payosStatus = params.get("payos");
    const orderCode = params.get("orderCode");

    if (!payosStatus) return;

    const runConfirm = async () => {
      try {
        if (payosStatus === "success" && orderCode) {
          await confirmPayosPayment(orderCode);
        }
      } catch (err) {
        console.error("Confirm PayOS failed:", err);
      } finally {
        await loadBookings();
        navigate(location.pathname, { replace: true });
      }
    };

    runConfirm();
  }, [location.pathname, location.search, navigate, loadBookings]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekCursor, i));
  }, [weekCursor]);

  const weekStartISO = toISO(weekDays[0]);
  const weekEndISO = toISO(weekDays[6]);

  const weekBookings = useMemo(() => {
    return bookings.filter((b) => {
      const key = String(b?.bookingDate || "").slice(0, 10);
      return key >= weekStartISO && key <= weekEndISO;
    });
  }, [bookings, weekStartISO, weekEndISO]);

  const grouped = useMemo(() => {
    const map = {};
    weekDays.forEach((d) => {
      map[toISO(d)] = [];
    });

    weekBookings.forEach((b) => {
      const key = String(b?.bookingDate || "").slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });

    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) =>
        String(a?.startTime || "").localeCompare(String(b?.startTime || ""))
      );
    });

    return map;
  }, [weekBookings, weekDays]);

  const counts = useMemo(() => {
    const c = {
      total: weekBookings.length,
      pending: 0,
      present: 0,
      absent: 0,
      cancelled: 0,
    };

    weekBookings.forEach((b) => {
      const st = String(b?.status || "").toLowerCase();
      if (st === "cancelled") {
        c.cancelled += 1;
        return;
      }
      const ta = String(b?.trainerAttendance?.status || "").toLowerCase();
      if (ta === "present" || ta === "completed") c.present += 1;
      else if (ta === "absent") c.absent += 1;
      else c.pending += 1;
    });

    return c;
  }, [weekBookings]);

  const todayISO = toISO(new Date());

  return (
    <div className="mb-page">
      <div className="mb-pageGlow mb-pageGlow--left" />
      <div className="mb-pageGlow mb-pageGlow--right" />

      <div className="mb-shell">
        <section className="mb-header">
          <div className="mb-titleGroup">
            <span className="mb-kicker">Training Schedule</span>
            <h1 className="mb-title">Lịch tập trong tuần</h1>
            <p className="mb-subtitle">
              Theo dõi booking theo từng tuần, dễ xem và dễ quản lý lịch tập hơn.
            </p>
          </div>

          <div className="mb-weekNav">
            <button
              type="button"
              className="mb-navBtn"
              onClick={() => setWeekCursor(addDays(weekCursor, -7))}
            >
              <ChevronLeft size={16} />
              <span>Tuần trước</span>
            </button>

            <button
              type="button"
              className="mb-navBtn active"
              onClick={() => setWeekCursor(startOfWeekMonday(new Date()))}
            >
              Tuần này
            </button>

            <button
              type="button"
              className="mb-navBtn"
              onClick={() => setWeekCursor(addDays(weekCursor, 7))}
            >
              <span>Tuần tới</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </section>

        <section className="mb-summaryGrid">
          <div className="mb-summaryCard">
            <span className="mb-summaryLabel">Tổng số buổi</span>
            <span className="mb-summaryValue">{pad2(counts.total)}</span>
          </div>

          <div className="mb-summaryCard border-secondary">
            <span className="mb-summaryLabel">Chưa điểm danh</span>
            <span className="mb-summaryValue">{pad2(counts.pending)}</span>
          </div>

          <div className="mb-summaryCard border-primary">
            <span className="mb-summaryLabel">Có mặt</span>
            <span className="mb-summaryValue text-primary">{pad2(counts.present)}</span>
          </div>

          <div className="mb-summaryCard border-absent">
            <span className="mb-summaryLabel">Vắng mặt</span>
            <span className="mb-summaryValue text-absent">{pad2(counts.absent)}</span>
          </div>

          <div className="mb-summaryCard border-error">
            <span className="mb-summaryLabel">Đã huỷ</span>
            <span className="mb-summaryValue text-error">{pad2(counts.cancelled)}</span>
          </div>
        </section>

        <div className="mb-rangeBar">
          <div className="mb-dateIndicator">
            <CalendarDays size={18} />
            <span>{fmtRange(weekCursor)}</span>
          </div>

          <div className="mb-pillGroup">
            <span className="mb-pill">Tổng: {counts.total}</span>
            <span className="mb-pill is-muted">Chưa điểm danh: {counts.pending}</span>
            <span className="mb-pill is-green">Có mặt: {counts.present}</span>
            <span className="mb-pill is-absent">Vắng: {counts.absent}</span>
            <span className="mb-pill is-red">Đã huỷ: {counts.cancelled}</span>
          </div>
        </div>

        <section className="mb-calendarGrid">
          {weekDays.map((day, idx) => {
            const iso = toISO(day);
            const dayBookings = grouped[iso] || [];
            const isToday = iso === todayISO;
            const isWeekend = idx >= 5;

            return (
              <div
                key={iso}
                className={`mb-dayCol ${isToday ? "isToday" : ""}`}
              >
                <div className={`mb-dayHead ${isToday ? "active" : ""} ${isWeekend ? "weekend" : ""}`}>
                  <span className="mb-dayName">{DAY_NAMES[idx]}</span>
                  <span className="mb-dayShort">{DAY_SHORT[idx]}</span>
                  <span className="mb-dayDate">{pad2(day.getDate())}</span>
                </div>

                <div className="mb-dayBody">
                  {dayBookings.length === 0 ? (
                    <div className="mb-emptyCell">Trống</div>
                  ) : (
                    dayBookings.map((b) => {
                      const disp = getMemberSessionDisplay(b);
                      const displayKey = disp.key;
                      const isActive = isToday && displayKey === "scheduled";

                      return (
                        <button
                          key={b.id}
                          type="button"
                          className={`mb-sessionCard ${displayKey} ${isActive ? "active" : ""}`}
                          onClick={() => setSelected(b)}
                        >
                          <div className="mb-sessionHead">
                            <span className="mb-sessionTime">
                              {fmtTime(b.startTime)} - {fmtTime(b.endTime)}
                            </span>

                            {isActive ? (
                              <Clock3 size={16} className="mb-sessionPulse" />
                            ) : displayKey === "present" || displayKey === "attended" ? (
                              <ClipboardCheck size={16} className="mb-sessionIcon ok" />
                            ) : displayKey === "absent" ? (
                              <CircleX size={16} className="mb-sessionIcon absent" />
                            ) : displayKey === "cancelled" ? (
                              <CircleX size={16} className="mb-sessionIcon error" />
                            ) : (
                              <Dumbbell size={16} className="mb-sessionIcon" />
                            )}
                          </div>

                          <div className="mb-sessionInfo">
                            <h4 className="mb-sessionTrainer">
                              {b?.Trainer?.User?.username || "PT"}
                            </h4>
                            <p className="mb-sessionPackage">
                              {b?.Package?.name || "Gói tập"}
                            </p>
                          </div>

                          <div className={`mb-sessionBtn ${displayKey}`}>
                            {disp.label}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {selected && <BookingDetailModal booking={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}