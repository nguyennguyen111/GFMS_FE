import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getPTSchedule, getPTDetails } from "../../services/ptService";
import "./PTSchedule.css";

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
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
};

const parseTimeToMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const PTSchedule = () => {
  const { id } = useParams();
  const ptId = id;
  const navigate = useNavigate();

  // today | next7 | week
  const [activeTab, setActiveTab] = useState("week");

  const [schedule, setSchedule] = useState(null);
  const [pt, setPT] = useState(null);
  const [loading, setLoading] = useState(true);

  // week navigation
  const [weekOffset, setWeekOffset] = useState(0);

  // calendar config
  const START_HOUR = 6;   // 06:00
  const END_HOUR = 22;    // 22:00
  const SLOT_MINUTES = 30;

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const [sch, info] = await Promise.all([
          getPTSchedule(ptId),
          getPTDetails(ptId),
        ]);
        setSchedule(sch);
        setPT(info);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [ptId]);

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

  // ===== Week view data (Mon..Sun) =====
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
    const start = weekDays[0].date;
    const end = weekDays[6].date;
    return `${formatDate(start)} - ${formatDate(end)}`;
  }, [weekDays]);

  const hours = useMemo(() => {
    const out = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) out.push(h);
    return out;
  }, []);

  const minutesRangeStart = START_HOUR * 60;
  const minutesRangeEnd = END_HOUR * 60;
  const totalMinutes = minutesRangeEnd - minutesRangeStart;

  // calc block style for a slot within calendar day column
  const calcBlockStyle = (slot) => {
    const s = clamp(parseTimeToMinutes(slot.start), minutesRangeStart, minutesRangeEnd);
    const e = clamp(parseTimeToMinutes(slot.end), minutesRangeStart, minutesRangeEnd);
    const topPct = ((s - minutesRangeStart) / totalMinutes) * 100;
    const heightPct = Math.max(0.5, ((e - s) / totalMinutes) * 100);
    return { top: `${topPct}%`, height: `${heightPct}%` };
  };

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

  const displayName =
    pt?.User?.username ? `PT: ${pt.User.username}` : `PT #${ptId}`;

  return (
    <div className="ptSchedule">
      <div className="ptSchedule__header">
        <button
          className="ptBack"
          onClick={() => navigate("/pt/dashboard")}
          title="Quay lại Dashboard PT"
        >
          ← Dashboard PT
        </button>

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

      <div className="ptSchedule__tabs">
        <button
          className={`ptTab ${activeTab === "week" ? "active" : ""}`}
          onClick={() => setActiveTab("week")}
        >
          Tuần (Calendar)
        </button>
        <button
          className={`ptTab ${activeTab === "today" ? "active" : ""}`}
          onClick={() => setActiveTab("today")}
        >
          Hôm nay
        </button>
        <button
          className={`ptTab ${activeTab === "next7" ? "active" : ""}`}
          onClick={() => setActiveTab("next7")}
        >
          7 ngày tới
        </button>
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
                      {Array.from({ length: (END_HOUR - START_HOUR) * (60 / SLOT_MINUTES) + 1 }).map(
                        (_, i) => <div className="ptWeek__gridLine" key={i} />
                      )}

                      {(d.slots || []).map((s, i) => (
                        <div className="ptWeek__block" key={i} style={calcBlockStyle(s)}>
                          <div className="ptWeek__blockTitle">Rảnh</div>
                          <div className="ptWeek__blockTime">
                            {s.start} - {s.end}
                          </div>
                        </div>
                      ))}
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
                    <td colSpan="3" className="ptTable__empty">Không có khung giờ rảnh hôm nay.</td>
                  </tr>
                ) : (
                  todaySlots.map((s, idx) => (
                    <tr key={idx}>
                      <td>{formatDate(new Date())}</td>
                      <td>
                        <span className="ptPill">{s.start} - {s.end}</span>
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
    </div>
  );
};

export default PTSchedule;
