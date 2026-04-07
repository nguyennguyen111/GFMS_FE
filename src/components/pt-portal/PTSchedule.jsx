import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getPTScheduleSlots, getPTDetails, getMyPTProfile } from "../../services/ptService";
import { getPTAttendanceSchedule, ptCheckIn, ptCheckOut, ptResetAttendance, ptRequestBusySlot } from "../../services/ptAttendanceService";
import "./PTSchedule.css";
import PTAttendanceModal, { PT_ATTENDANCE_LOCK_MSG } from "./PTAttendanceModal";
import NiceModal from "../common/NiceModal";

const VI_DAY = {
  monday: "Thứ 2",
  tuesday: "Thứ 3",
  wednesday: "Thứ 4",
  thursday: "Thứ 5",
  friday: "Thứ 6",
  saturday: "Thứ 7",
  sunday: "Chủ nhật",
};

const formatDate = (d) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const startOfWeekMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
};

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const cleanTime = String(timeStr).split(" ")[0];
  const [h, m] = cleanTime.split(":").map((num) => parseInt(num, 10) || 0);
  return h * 60 + m;
};

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
  const [schedule, setSchedule] = useState({});
  const [pt, setPT] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const [attOpen, setAttOpen] = useState(false);
  const [attLoading, setAttLoading] = useState(false);
  const [attBooking, setAttBooking] = useState(null);
  const [attCache, setAttCache] = useState({});
  const [attendanceBlockModal, setAttendanceBlockModal] = useState(null);

  const START_HOUR = 6;
  const END_HOUR = 22;
  const ROW_HEIGHT = 60; // Đồng bộ với CSS

  const [activeTab, setActiveTab] = useState("week"); 
  const now = new Date();
  const [pickMonth, setPickMonth] = useState(now.getMonth() + 1);
  const [pickYear, setPickYear] = useState(now.getFullYear());

  const jumpToMonth = (month, year) => {
    const firstDay = new Date(year, month - 1, 1);
    const monday = startOfWeekMonday(firstDay);
    const diffWeeks = Math.floor((monday - startOfWeekMonday(new Date())) / (7 * 24 * 60 * 60 * 1000));
    setWeekOffset(diffWeeks);
  };

  useEffect(() => {
    if (id && id !== "undefined") {
      setPtId(String(id));
      return;
    }
    getMyPTProfile()
      .then((me) => setPtId(String(me.id)))
      .catch(() => navigate("/login"));
  }, [id, navigate]);

  useEffect(() => {
    if (!ptId) return;
    setLoading(true);
    Promise.all([getPTScheduleSlots(ptId), getPTDetails(ptId)]).then(([sch, info]) => {
      setSchedule(sch || {});
      setPT(info);
    }).finally(() => setLoading(false));
  }, [ptId]);

  const weekDays = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    const monday = startOfWeekMonday(base);
    const keys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    return keys.map((key, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        date: d,
        dayKey: key,
        dayLabel: VI_DAY[key],
        slots: schedule[key] || [],
      };
    });
  }, [schedule, weekOffset]);

  const todaySlots = useMemo(() => {
    const key = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];
    return schedule[key] || [];
  }, [schedule]);

  const next7Days = useMemo(() => {
    const out = [];
    const start = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][d.getDay()];
      out.push({ date: d, dayKey: key, dayLabel: VI_DAY[key], slots: schedule[key] || [] });
    }
    return out;
  }, [schedule]);

  useEffect(() => {
    weekDays.forEach((d) => {
      const ymd = toYMD(d.date);
      if (!attCache[ymd]) {
        getPTAttendanceSchedule({ date: ymd })
          .then((res) => setAttCache((prev) => ({ ...prev, [ymd]: res?.rows || [] })))
          .catch(() => {});
      }
    });
  }, [weekDays, attCache]);

  const openAttendance = async (dateObj, slot) => {
    const ymd = toYMD(dateObj);
    setAttOpen(true);
    setAttLoading(true);
    const rows = attCache[ymd] || [];
    const found = rows.find((b) => String(b.startTime || "").slice(0, 5) === String(slot.start || "").slice(0, 5));
    setAttBooking(found || null);
    setAttLoading(false);
  };

  const updateStatus = async (status) => {
    if (!attBooking) return;
    setAttLoading(true);
    try {
      await ptCheckIn({ bookingId: attBooking.id, method: "manual", status });
      const ymd = toYMD(new Date(attBooking.bookingDate));
      const res = await getPTAttendanceSchedule({ date: ymd });
      setAttCache((prev) => ({ ...prev, [ymd]: res?.rows || [] }));
      setAttBooking(res?.rows.find((b) => b.id === attBooking.id));
    } catch (e) {
      const data = e?.response?.data;
      const msg = data?.DT || data?.message || data?.EM || e?.message || "";
      const locked = /chốt kỳ|chi trả|điểm danh|không thể thay đổi/i.test(String(msg));
      setAttendanceBlockModal(
        locked ? PT_ATTENDANCE_LOCK_MSG : msg || "Không thể cập nhật điểm danh. Vui lòng thử lại."
      );
    } finally {
      setAttLoading(false);
    }
  };

  const resetStatus = async () => {
    if (!attBooking) return;
    setAttLoading(true);
    try {
      await ptResetAttendance({ bookingId: attBooking.id });
      const ymd = toYMD(new Date(attBooking.bookingDate));
      const res = await getPTAttendanceSchedule({ date: ymd });
      setAttCache((prev) => ({ ...prev, [ymd]: res?.rows || [] }));
      setAttBooking(res?.rows.find((b) => b.id === attBooking.id));
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.DT ||
        e?.response?.data?.EM ||
        e?.message ||
        "Không thể hoàn tác điểm danh.";
      window.alert(msg);
    } finally {
      setAttLoading(false);
    }
  };

  const completeStatus = async () => {
    if (!attBooking) return;
    setAttLoading(true);
    try {
      await ptCheckOut({ bookingId: attBooking.id, status: "present" });
      const ymd = toYMD(new Date(attBooking.bookingDate));
      const res = await getPTAttendanceSchedule({ date: ymd });
      setAttCache((prev) => ({ ...prev, [ymd]: res?.rows || [] }));
      setAttBooking(res?.rows.find((b) => b.id === attBooking.id));
    } catch (e) {
      const data = e?.response?.data;
      const msg = data?.DT || data?.message || data?.EM || e?.message || "";
      const locked = /chốt kỳ|chi trả|điểm danh|không thể thay đổi/i.test(String(msg));
      setAttendanceBlockModal(
        locked ? PT_ATTENDANCE_LOCK_MSG : msg || "Không thể hoàn thành buổi tập. Vui lòng thử lại."
      );
    } finally {
      setAttLoading(false);
    }
  };

  const requestBusySlot = async () => {
    if (!attBooking?.id) return;
    const reason = window.prompt("Nhập lý do bận (không bắt buộc):", "");
    if (reason === null) return;
    setAttLoading(true);
    try {
      await ptRequestBusySlot({ bookingId: attBooking.id, reason: String(reason || "").trim() });
      window.alert("Đã gửi yêu cầu báo bận cho chủ phòng tập.");
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.DT ||
        e?.response?.data?.EM ||
        e?.message ||
        "Không thể gửi yêu cầu báo bận.";
      window.alert(msg);
    } finally {
      setAttLoading(false);
    }
  };

  if (loading) return <div className="ptSchedule"><div className="ptSchedule__card">Đang tải lịch...</div></div>;

  const getStudentNameColor = (attendanceStatus, busyRequested, sharedSession) => {
    if (sharedSession) return '#a78bfa';
    if (busyRequested) return '#f59e0b';
    if (attendanceStatus === 'present') return '#2ecc71';
    if (attendanceStatus === 'absent') return '#e74c3c';
    return '#3498db';
  };

  return (
    <div className="ptSchedule">
      <div className="ptSchedule__header">
        <div className="ptSchedule__headText">
          <h1>Lịch làm việc</h1>
          <p className="ptSchedule__subtitle">PT: {pt?.User?.username || ptId}</p>
        </div>
        <div className="ptSchedule__actions">
          <Link className="ptBtn" to={`/pt/${ptId}/schedule-update`}>Cập nhật lịch rảnh</Link>
        </div>
      </div>

      <div className="ptSchedule__controlWrapper">
        <div className="ptSchedule__tabs">
          <button className={`ptTab ${activeTab==="week"?"active":""}`} onClick={()=>setActiveTab("week")}>Tuần (lịch)</button>
          <button className={`ptTab ${activeTab==="today"?"active":""}`} onClick={()=>setActiveTab("today")}>Hôm nay</button>
          <button className={`ptTab ${activeTab==="next7"?"active":""}`} onClick={()=>setActiveTab("next7")}>7 ngày tới</button>

          <div className="ptMonthPick">
            <span className="ptMonthLabel">Tháng:</span>
            <select value={pickMonth} onChange={(e)=>{const m=+e.target.value; setPickMonth(m); jumpToMonth(m,pickYear);}} className="ptMonthSelect">
              {Array.from({length:12}).map((_,i)=><option key={i} value={i+1}>{`Tháng ${i+1}`}</option>)}
            </select>
            <select value={pickYear} onChange={(e)=>{const y=+e.target.value; setPickYear(y); jumpToMonth(pickMonth,y);}} className="ptYearSelect">
              {Array.from({length:7}).map((_,i)=><option key={i} value={now.getFullYear()-3+i}>{now.getFullYear()-3+i}</option>)}
            </select>
          </div>
        </div>

        {activeTab==="week" && <div className="ptWeekBar">
          <button className="ptBtn ptBtn--ghost" onClick={()=>setWeekOffset(v=>v-1)}>← Tuần trước</button>
          <button className="ptBtn ptBtn--ghost" onClick={()=>setWeekOffset(0)}>Hôm nay</button>
          <button className="ptBtn ptBtn--ghost" onClick={()=>setWeekOffset(v=>v+1)}>Tuần sau →</button>
          <span className="week-range">{formatDate(weekDays[0].date)} - {formatDate(weekDays[6].date)}</span>
        </div>}
      </div>

      <div className="ptSchedule__card">
        {activeTab==="week" ? (
          <div className="ptWeek">
            <div className="ptWeek__timeCol">
              {/* FIXED: Spacer đẩy hàng 06:00 xuống đúng vị trí */}
              <div className="ptWeek__timeSpacer" />
              <div className="ptWeek__timeBody">
                {Array.from({length:END_HOUR-START_HOUR + 1}).map((_,i)=>(
                  <div key={i} className="ptWeek__timeRow" style={{height: `${ROW_HEIGHT}px`}}>
                    <span className="ptWeek__timeLabel">{(START_HOUR+i).toString().padStart(2,'0')}:00</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="ptWeek__days">
              <div className="ptWeek__daysHead">
                {weekDays.map((d,idx)=>(<div key={idx} className="ptWeek__dayHead"><div className="ptWeek__dayName">{d.dayLabel}</div><div className="ptWeek__dayDate">{formatDate(d.date).slice(0,5)}</div></div>))}
              </div>
              <div className="ptWeek__daysBody">
                {weekDays.map((d,idx)=>(
                  <div key={idx} className="ptWeek__dayCol" style={{height: `${(END_HOUR-START_HOUR + 1) * ROW_HEIGHT}px`}}>
                    {(d.slots||[]).map((s,i)=>{
                      const startMin=parseTimeToMinutes(s.start);
                      const endMin=parseTimeToMinutes(s.end);
                      if(startMin>=endMin || startMin<START_HOUR*60) return null;

                      const booking=(attCache[toYMD(d.date)]||[]).find(b=>String(b.startTime||"").slice(0,5)===String(s.start||"").slice(0,5));

                      let statusClass = "";
                      const attendanceStatus = String(booking?.trainerAttendance?.status || "").toLowerCase();
                      const isBusyRequested = Boolean(booking?.busyRequested);
                      const isSharedSession = String(booking?.sessionType || "").toLowerCase() === "trainer_share" || String(booking?.type || "").toLowerCase() === "trainer_share";
                      if (booking) {
                        if (isSharedSession) statusClass = "is-shared";
                        else if (isBusyRequested) statusClass = "is-busy-requested";
                        else if (attendanceStatus === "present") statusClass = "is-present";
                        else if (attendanceStatus === "absent") statusClass = "is-absent";
                        else statusClass = "is-pending";
                      }

                      const topPx = ((startMin - START_HOUR * 60) / 60) * ROW_HEIGHT;
                      const heightPx = ((endMin - startMin) / 60) * ROW_HEIGHT;
                      
                      return (
                        <div 
                          key={i} 
                          className={`ptWeek__block ${statusClass}`} 
                          style={{
                            top: `${topPx}px`, 
                            height: `${heightPx - 2}px`,
                          }} 
                          onClick={()=>openAttendance(d.date,s)}
                        >
                          <div className="ptWeek__blockTime">{s.start}</div>
                          {booking && <div className="ptWeek__studentName" style={{ color: getStudentNameColor(attendanceStatus, isBusyRequested, isSharedSession) }}>
                            👤 {booking.Member?.User?.username || "Học viên"}
                            {(attendanceStatus || isBusyRequested || isSharedSession) && (
                              <div className="mini-status">
                                  {isSharedSession ? '↔ Lịch chia sẻ' : isBusyRequested ? '⚠ PT báo bận' : attendanceStatus === 'present' ? '✓ Có mặt' : attendanceStatus === 'absent' ? '✗ Vắng mặt' : ''}
                              </div>
                            )}
                          </div>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === "today" ? (
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
                <tr><td colSpan="3" className="ptTable__empty">Không có khung giờ rảnh hôm nay.</td></tr>
              ) : (
                todaySlots.map((s, i) => (
                  <tr key={i}>
                    <td>{formatDate(new Date())}</td>
                    <td><span className="ptPill">{s.start}-{s.end}</span></td>
                    <td className="ptSchedule__muted">—</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
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
              {next7Days.map((row, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{formatDate(row.date)}</td>
                  <td>{row.dayLabel}</td>
                  <td>
                    {row.slots.length === 0 ? (
                      <span className="ptSchedule__muted">Không có</span>
                    ) : (
                      <div className="ptPillWrap">
                        {row.slots.map((s, j) => (
                          <span key={j} className="ptPill">{s.start}-{s.end}</span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PTAttendanceModal
        open={attOpen}
        booking={attBooking}
        loading={attLoading}
        onClose={() => setAttOpen(false)}
        onCheckIn={() => updateStatus("present")}
        onCheckOut={() => updateStatus("absent")}
        onComplete={completeStatus}
        onReset={resetStatus}
        onRequestBusySlot={requestBusySlot}
      />

      <NiceModal
        open={Boolean(attendanceBlockModal)}
        onClose={() => setAttendanceBlockModal(null)}
        zIndex={1300}
        tone="info"
        title="Không thể điểm danh"
        footer={
          <button
            type="button"
            className="nice-modal__btn nice-modal__btn--primary"
            onClick={() => setAttendanceBlockModal(null)}
          >
            Đã hiểu
          </button>
        }
      >
        <p>{attendanceBlockModal}</p>
      </NiceModal>
    </div>
  );
};

export default PTSchedule;