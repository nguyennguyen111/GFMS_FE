// src/components/pt-portal/PTSchedule.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getPTScheduleSlots, getPTDetails, getMyPTProfile } from "../../services/ptService";
import "./PTSchedule.css";

import PTAttendanceModal from "./PTAttendanceModal";
import { getPTAttendanceSchedule, ptCheckIn, ptCheckOut } from "../../services/ptAttendanceService";

const VI_DAY = {
  monday: "Thứ 2",
  tuesday: "Thứ 3",
  wednesday: "Thứ 4",
  thursday: "Thứ 5",
  friday: "Thứ 6",
  saturday: "Thứ 7",
  sunday: "Chủ nhật",
};

const dayKeyFromDate = (d) => {
  const idx = d.getDay(); // 0 Sun ... 6 Sat
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][idx];
};

const formatDate = (d) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const startOfWeekMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun..6 Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
};

const parseTimeToMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const monthLabel = (m) => `Tháng ${m}`;

// ✅ helper convert Date -> YYYY-MM-DD for attendance API
const toYMD = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const PTSchedule = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ptId, setPtId] = useState(id && id !== "undefined" ? String(id) : null);
  const [resolveError, setResolveError] = useState("");

  const [activeTab, setActiveTab] = useState("week");

  // schedule = slotsByDay (vì getPTSchedule đã trả slots)
  const [schedule, setSchedule] = useState(null);
  const [pt, setPT] = useState(null);
  const [loading, setLoading] = useState(true);

  // week navigation
  const [weekOffset, setWeekOffset] = useState(0);

  // Month/Year picker
  const now = useMemo(() => new Date(), []);
  const [pickMonth, setPickMonth] = useState(now.getMonth() + 1); // 1..12
  const [pickYear, setPickYear] = useState(now.getFullYear());

  // ===== Attendance modal state =====
  const [attOpen, setAttOpen] = useState(false);
  const [attLoading, setAttLoading] = useState(false);
  const [attError, setAttError] = useState("");
  const [attBooking, setAttBooking] = useState(null);

  // cache attendance rows theo ngày (YYYY-MM-DD)
  const [attCache, setAttCache] = useState({}); // { [ymd]: rows[] }

  // calendar config
  const START_HOUR = 6;
  const END_HOUR = 22;
  const SLOT_MINUTES = 30;

  // Resolve trainer id
  useEffect(() => {
    if (id && id !== "undefined") {
      setPtId(String(id));
      return;
    }

    const run = async () => {
      try {
        setResolveError("");
        const me = await getMyPTProfile();
        setPtId(String(me.id));
      } catch (e) {
        const msg = e?.EM || e?.message || "Không lấy được PT profile (/api/pt/me)";
        setResolveError(msg);
      }
    };

    run();
  }, [id]);

  // Fetch schedule + details after ptId is resolved
  useEffect(() => {
    if (!ptId) return;

    const run = async () => {
      try {
        setLoading(true);
        const [sch, info] = await Promise.all([getPTScheduleSlots(ptId), getPTDetails(ptId)]);
        // sch = slotsByDay
        setSchedule(sch || {});
        setPT(info);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [ptId]);

  // Month jump => update weekOffset only
  const jumpToMonth = (month1to12, year) => {
    const firstDay = new Date(year, month1to12 - 1, 1);
    const monday = startOfWeekMonday(firstDay);

    const baseMonday = startOfWeekMonday(new Date());
    const diffMs = monday.getTime() - baseMonday.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

    setWeekOffset(diffWeeks);
    setActiveTab("week");
  };

  // Week view data (Mon..Sun)
  const weekDays = useMemo(() => {
    if (!schedule) return [];
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    const monday = startOfWeekMonday(base);

    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = dayKeyFromDate(d);
      out.push({
        date: d,
        dayKey: key,
        dayLabel: VI_DAY[key],
        slots: schedule?.[key] || [],
      });
    }
    return out;
  }, [schedule, weekOffset]);

  const weekRangeLabel = useMemo(() => {
    if (weekDays.length === 0) return "";
    return `${formatDate(weekDays[0].date)} - ${formatDate(weekDays[6].date)}`;
  }, [weekDays]);

  const todaySlots = useMemo(() => {
    if (!schedule) return [];
    const key = dayKeyFromDate(new Date());
    return schedule?.[key] || [];
  }, [schedule]);

  const next7Days = useMemo(() => {
    if (!schedule) return [];
    const out = [];
    const start = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = dayKeyFromDate(d);
      out.push({
        date: d,
        dayKey: key,
        dayLabel: VI_DAY[key],
        slots: schedule?.[key] || [],
      });
    }
    return out;
  }, [schedule]);

  const hours = useMemo(() => {
    const out = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) out.push(h);
    return out;
  }, [START_HOUR, END_HOUR]);

  const minutesRangeStart = START_HOUR * 60;
  const minutesRangeEnd = END_HOUR * 60;
  const totalMinutes = minutesRangeEnd - minutesRangeStart;

  const calcBlockStyleByMinutes = (startMin, endMin) => {
    const s = clamp(startMin, minutesRangeStart, minutesRangeEnd);
    const e = clamp(endMin, minutesRangeStart, minutesRangeEnd);
    const topPct = ((s - minutesRangeStart) / totalMinutes) * 100;
    const heightPct = Math.max(0.5, ((e - s) / totalMinutes) * 100);
    return { top: `${topPct}%`, height: `${heightPct}%` };
  };

  // ===== Attendance logic =====
  const loadAttendanceRowsByDate = async (ymd) => {
    if (attCache[ymd]) return attCache[ymd];
    const data = await getPTAttendanceSchedule({ date: ymd });
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    setAttCache((prev) => ({ ...prev, [ymd]: rows }));
    return rows;
  };

  const openAttendanceForSlot = async (dateObj, slot) => {
  const ymd = toYMD(dateObj);

  setAttError("");
  setAttLoading(true);
  setAttOpen(true);

  try {
    const rows = await loadAttendanceRowsByDate(ymd);

    const found = rows.find(
      (b) =>
        String(b?.bookingDate || "").slice(0, 10) === ymd &&
        String(b?.startTime || "").slice(0, 5) === String(slot?.start || "").slice(0, 5)
    );

    // nếu không tìm thấy => lịch rảnh
    setAttBooking(found || null);
  } catch (e) {
    // ✅ chặn 500: coi như không có booking (slot rảnh), đừng show đỏ lỗi
    setAttBooking(null);
    setAttError("");
  } finally {
    setAttLoading(false);
  }
};


  const refreshCurrentBooking = async () => {
    if (!attBooking?.bookingDate) return;
    const ymd = String(attBooking.bookingDate).slice(0, 10);

    const data = await getPTAttendanceSchedule({ date: ymd });
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    setAttCache((prev) => ({ ...prev, [ymd]: rows }));

    const found = rows.find((b) => b.id === attBooking.id);
    setAttBooking(found || attBooking);
  };

  const doCheckIn = async () => {
    if (!attBooking?.id) return;
    setAttError("");
    setAttLoading(true);
    try {
      await ptCheckIn({ bookingId: attBooking.id, method: "manual", status: "present" });
      await refreshCurrentBooking();
    } catch (e) {
      setAttError(e?.response?.data?.EM || e?.message || "Check-in failed");
    } finally {
      setAttLoading(false);
    }
  };

  const doCheckOut = async () => {
    if (!attBooking?.id) return;
    setAttError("");
    setAttLoading(true);
    try {
      await ptCheckOut({ bookingId: attBooking.id });
      await refreshCurrentBooking();
    } catch (e) {
      setAttError(e?.response?.data?.EM || e?.message || "Check-out failed");
    } finally {
      setAttLoading(false);
    }
  };

  if (resolveError) {
    return (
      <div className="ptSchedule">
        <div className="ptSchedule__header">
          <h1>Lịch làm việc PT</h1>
        </div>
        <div className="ptSchedule__card">
          <p>Không xác định được PT của bạn.</p>
          <pre style={{ whiteSpace: "pre-wrap" }}>{resolveError}</pre>
          <button className="ptBtn" onClick={() => navigate("/login")}>
            Về đăng nhập
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ptSchedule">
        <div className="ptSchedule__header">
          <h1>Lịch làm việc PT</h1>
        </div>
        <div className="ptSchedule__card">Đang tải...</div>
      </div>
    );
  }

  const displayName = pt?.User?.username ? `PT: ${pt.User.username}` : `PT #${ptId}`;

  return (
    <div className="ptSchedule">
      <div className="ptSchedule__header">
        <div className="ptSchedule__headText">
          <h1>Lịch làm việc</h1>
          <p className="ptSchedule__subtitle">{displayName}</p>
        </div>

        <div className="ptSchedule__actions">
          <Link className="ptBtn ptBtn--ghost" to={`/pt/${ptId}/details`}>
            Hồ sơ PT
          </Link>
          <Link className="ptBtn" to={`/pt/${ptId}/schedule-update`}>
            Cập nhật lịch rảnh
          </Link>
        </div>
      </div>

      {/* Tabs + Month picker */}
      <div className="ptSchedule__tabs">
        <button className={`ptTab ${activeTab === "week" ? "active" : ""}`} onClick={() => setActiveTab("week")}>
          Tuần (Calendar)
        </button>
        <button className={`ptTab ${activeTab === "today" ? "active" : ""}`} onClick={() => setActiveTab("today")}>
          Hôm nay
        </button>
        <button className={`ptTab ${activeTab === "next7" ? "active" : ""}`} onClick={() => setActiveTab("next7")}>
          7 ngày tới
        </button>

        <div className="ptMonthPick">
          <span className="ptMonthLabel">Tháng:</span>

          <select
            className="ptMonthSelect"
            value={pickMonth}
            onChange={(e) => {
              const m = Number(e.target.value);
              setPickMonth(m);
              jumpToMonth(m, pickYear);
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => {
              const m = i + 1;
              return (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              );
            })}
          </select>

          <select
            className="ptYearSelect"
            value={pickYear}
            onChange={(e) => {
              const y = Number(e.target.value);
              setPickYear(y);
              jumpToMonth(pickMonth, y);
            }}
          >
            {Array.from({ length: 7 }).map((_, i) => {
              const y = now.getFullYear() - 3 + i;
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="ptSchedule__card">
        {activeTab === "week" ? (
          <>
            <div className="ptSchedule__cardTitle">
              <span>Tuần này</span>
              <span className="ptSchedule__muted">{weekRangeLabel}</span>
            </div>

            <div className="ptWeekBar">
              <button className="ptBtn ptBtn--ghost" onClick={() => setWeekOffset((x) => x - 1)}>
                ← Tuần trước
              </button>
              <button className="ptBtn ptBtn--ghost" onClick={() => setWeekOffset(0)}>
                Hôm nay
              </button>
              <button className="ptBtn ptBtn--ghost" onClick={() => setWeekOffset((x) => x + 1)}>
                Tuần sau →
              </button>
            </div>

            <div className="ptWeek">
              <div className="ptWeek__timeCol">
                <div className="ptWeek__timeHead" />
                <div className="ptWeek__timeBody">
                  {hours.map((h) => (
                    <div className="ptWeek__timeRow" key={h}>
                      <span className="ptWeek__timeLabel">{String(h).padStart(2, "0")}:00</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ptWeek__days">
                <div className="ptWeek__daysHead">
                  {weekDays.map((d, idx) => (
                    <div className="ptWeek__dayHead" key={idx}>
                      <div className="ptWeek__dayName">{d.dayLabel}</div>
                      <div className="ptWeek__dayDate">{formatDate(d.date)}</div>
                    </div>
                  ))}
                </div>

                <div className="ptWeek__daysBody">
                  {weekDays.map((d, idx) => (
                    <div className="ptWeek__dayCol" key={idx}>
                      {Array.from({ length: (END_HOUR - START_HOUR) * (60 / SLOT_MINUTES) + 1 }).map((_, i) => (
                        <div className="ptWeek__gridLine" key={i} />
                      ))}

                      {/* ✅ slot đã được BE sinh sẵn (60' + nghỉ 15') => render trực tiếp */}
                      {(d.slots || []).map((s, i) => {
                        const startMin = parseTimeToMinutes(s.start);
                        const endMin = parseTimeToMinutes(s.end);

                        return (
                          <div
                            className="ptWeek__block"
                            key={i}
                            style={calcBlockStyleByMinutes(startMin, endMin)}
                            onClick={() => openAttendanceForSlot(d.date, s)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="ptWeek__blockTime">
                              {s.start} - {s.end}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : activeTab === "today" ? (
          <>
            <div className="ptSchedule__cardTitle">
              <span>Hôm nay</span>
              <span className="ptSchedule__muted">{formatDate(new Date())}</span>
            </div>

            <table className="ptTable">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Khung giờ rảnh</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {todaySlots.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="ptTable__empty">
                      Không có khung giờ rảnh hôm nay.
                    </td>
                  </tr>
                ) : (
                  todaySlots.map((s, idx) => (
                    <tr key={idx}>
                      <td>{formatDate(new Date())}</td>
                      <td>
                        <span className="ptPill">
                          {s.start} - {s.end}
                        </span>
                      </td>
                      <td className="ptSchedule__muted">—</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        ) : (
          <>
            <div className="ptSchedule__cardTitle">
              <span>7 ngày tới</span>
              <span className="ptSchedule__muted">Tự sinh từ lịch rảnh theo tuần</span>
            </div>

            <table className="ptTable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ngày</th>
                  <th>Thứ</th>
                  <th>Khung giờ rảnh</th>
                </tr>
              </thead>
              <tbody>
                {next7Days.map((row, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{formatDate(row.date)}</td>
                    <td>{row.dayLabel}</td>
                    <td>
                      {row.slots.length === 0 ? (
                        <span className="ptSchedule__muted">Không có</span>
                      ) : (
                        <div className="ptPillWrap">
                          {row.slots.map((s, i) => (
                            <span className="ptPill" key={i}>
                              {s.start} - {s.end}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* ✅ Attendance Modal */}
      <PTAttendanceModal
        open={attOpen}
        booking={attBooking}
        loading={attLoading}
        error={attError}
        onClose={() => {
          setAttOpen(false);
          setAttError("");
          setAttBooking(null);
        }}
        onCheckIn={doCheckIn}
        onCheckOut={doCheckOut}
      />
    </div>
  );
};

export default PTSchedule;
