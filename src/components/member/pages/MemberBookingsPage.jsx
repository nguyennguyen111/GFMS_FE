import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { connectSocket } from "../../../services/socketClient";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [feedbackHighlightId, setFeedbackHighlightId] = useState(null);
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
    const raw = searchParams.get("sessionFeedback");
    if (!raw) return;
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return;
    setFeedbackHighlightId(id);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("sessionFeedback");
        return next;
      },
      { replace: true }
    );
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!feedbackHighlightId || !bookings.length) return;
    const b = bookings.find((x) => Number(x.id) === Number(feedbackHighlightId));
    if (b) setSelected(b);
  }, [feedbackHighlightId, bookings]);

  useEffect(() => {
    const socket = connectSocket();
    const onBookingStatusChanged = () => {
      loadBookings();
    };
    const onNotificationNew = (payload) => {
      const t = String(
        payload?.notificationType || payload?.type || "",
      ).toLowerCase();
      if (t === "booking_update" || t === "session_feedback") loadBookings();
    };
    socket.on("booking:status-changed", onBookingStatusChanged);
    socket.on("notification:new", onNotificationNew);
    return () => {
      socket.off("booking:status-changed", onBookingStatusChanged);
      socket.off("notification:new", onNotificationNew);
    };
  }, [loadBookings]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekCursor, i));
  }, [weekCursor]);

  const weekStartISO = toISO(weekDays[0]);
  const weekEndISO = toISO(weekDays[6]);

  const weekBookings = useMemo(() => {
    const filtered = bookings.filter((b) => {
      const key = String(b?.bookingDate || "").slice(0, 10);
      return key >= weekStartISO && key <= weekEndISO;
    });

    // Deduplicate accidental duplicate slots by date/time/trainer/package.
    // Keep the newest record so UI only renders one session card per slot.
    const bySlot = new Map();
    filtered.forEach((b) => {
      const slotKey = [
        String(b?.bookingDate || "").slice(0, 10),
        String(b?.startTime || "").slice(0, 5),
        String(b?.endTime || "").slice(0, 5),
        Number(b?.trainerId || b?.Trainer?.id || 0),
        Number(b?.packageActivationId || 0),
      ].join("|");
      const prev = bySlot.get(slotKey);
      if (!prev || Number(b?.id || 0) > Number(prev?.id || 0)) {
        bySlot.set(slotKey, b);
      }
    });

    return Array.from(bySlot.values());
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

                      const requestBadge = b?.pendingRescheduleRequest
                        ? { text: "Đang chờ đổi lịch", cls: "pending" }
                        : b?.latestRescheduleRequest?.status === "rejected"
                        ? { text: "Đổi lịch bị từ chối", cls: "rejected" }
                        : b?.isRescheduled || b?.latestRescheduleRequest?.status === "approved"
                        ? { text: "Đã đổi lịch", cls: "approved" }
                        : null;

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

                          {requestBadge ? <div className={`mb-sessionTag mb-sessionTag--${requestBadge.cls}`}>{requestBadge.text}</div> : null}

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

      {selected ? (
        <BookingDetailModal
          booking={selected}
          initialShowFeedback={
            feedbackHighlightId != null && Number(selected.id) === Number(feedbackHighlightId)
          }
          onClose={() => {
            setSelected(null);
            setFeedbackHighlightId(null);
          }}
          onUpdated={async () => {
            await loadBookings();
            setSelected(null);
            setFeedbackHighlightId(null);
          }}
        />
      ) : null}
    </div>
  );
}