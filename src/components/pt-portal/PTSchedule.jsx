import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getPTScheduleSlots, getPTDetails, getMyPTProfile } from "../../services/ptService";
import {
  getPTAttendanceSchedule,
  ptCheckIn,
  ptCheckOut,
  ptResetAttendance,
  ptRequestBusySlot,
  ptSendSharePaymentInstruction,
  ptSubmitSharePaymentDispute,
  ptAcknowledgeSharePaymentResponse,
} from "../../services/ptAttendanceService";
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
  const parts = cleanTime.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) || 0;
  if (Number.isNaN(h)) return 0;
  if (h === 24 && m === 0) return 24 * 60;
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
  const [noticeModal, setNoticeModal] = useState(null);
  const [busyReasonModalOpen, setBusyReasonModalOpen] = useState(false);
  const [busyReason, setBusyReason] = useState("");
  const [busyReasonError, setBusyReasonError] = useState("");

  const START_HOUR = 5;
  const END_HOUR = 23;
  const ROW_HEIGHT = 60;
  const gridStartMin = START_HOUR * 60;
  const gridEndMin = 24 * 60;
  const hourRowCount = END_HOUR - START_HOUR + 1;

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

  const todayYmd = toYMD(new Date());
  const todayAttendanceRows = attCache[todayYmd] || [];

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

  useEffect(() => {
    if (!ptId) return;
    const ymd = toYMD(new Date());
    getPTAttendanceSchedule({ date: ymd })
      .then((res) => setAttCache((prev) => ({ ...prev, [ymd]: res?.rows || [] })))
      .catch(() => {});
  }, [ptId]);

  const openAttendance = async (dateObj, slot) => {
    const ymd = toYMD(dateObj);
    const slotKey = String(slot.start || "").slice(0, 5);
    const rows = attCache[ymd] || [];
    const cached = rows.find((b) => String(b.startTime || "").slice(0, 5) === slotKey);

    setAttOpen(true);
    if (cached) {
      setAttBooking(cached);
      setAttLoading(false);
    } else {
      setAttBooking(null);
      setAttLoading(true);
    }

    try {
      const res = await getPTAttendanceSchedule({ date: ymd });
      setAttCache((prev) => ({ ...prev, [ymd]: res?.rows || [] }));
      const found = (res?.rows || []).find(
        (b) => String(b.startTime || "").slice(0, 5) === slotKey,
      );
      setAttBooking(found || null);
    } catch {
      if (!cached) {
        const found = rows.find((b) => String(b.startTime || "").slice(0, 5) === slotKey);
        setAttBooking(found || null);
      }
    } finally {
      setAttLoading(false);
    }
  };

  const refreshAttBooking = async () => {
    if (!attBooking?.id) return;
    const ymd = toYMD(new Date(attBooking.bookingDate));
    try {
      const res = await getPTAttendanceSchedule({ date: ymd });
      setAttCache((prev) => ({ ...prev, [ymd]: res?.rows || [] }));
      const next = res?.rows?.find((b) => b.id === attBooking.id);
      if (next) setAttBooking(next);
    } catch (_e) {
      /* ignore */
    }
  };

  const updateStatus = async (status) => {
    if (!attBooking?.id) return;
    const s = String(status || "").toLowerCase();
    if (s !== "present" && s !== "absent") {
      setAttendanceBlockModal("Chỉ có thể điểm danh: có mặt hoặc vắng mặt.");
      return;
    }
    const bst = String(attBooking.status || "").toLowerCase();
    if (bst === "cancelled") {
      setAttendanceBlockModal("Buổi đã hủy, không thể điểm danh.");
      return;
    }
    setAttLoading(true);
    try {
      await ptCheckIn({ bookingId: attBooking.id, method: "manual", status: s });
      const ymd = toYMD(new Date(attBooking.bookingDate));
      const res = await getPTAttendanceSchedule({ date: ymd });
      setAttCache((prev) => ({ ...prev, [ymd]: res?.rows || [] }));
      setAttBooking(res?.rows.find((b) => b.id === attBooking.id));
    } catch (e) {
      const data = e?.response?.data;
      const msg = data?.DT || data?.message || data?.EM || e?.message || "";
      const locked = /chốt kỳ|chi trả|đã chi trả|payroll/i.test(String(msg));
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
      setNoticeModal({ title: "Không thể hoàn tác", message: msg, tone: "danger" });
    } finally {
      setAttLoading(false);
    }
  };

  const sendSharePaymentFromModal = async ({ bankName, bankAccountNumber, accountHolderName }) => {
    if (!attBooking?.id) return false;
    setAttLoading(true);
    try {
      await ptSendSharePaymentInstruction(attBooking.id, {
        bankName,
        bankAccountNumber,
        accountHolderName,
      });
      setNoticeModal({
        title: "Đã gửi",
        message:
          "Đã gửi tên ngân hàng và STK cho chủ phòng mượn. Họ sẽ chuyển khoản theo giá buổi đã thỏa thuận.",
        tone: "success",
      });
      await refreshAttBooking();
      return true;
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.DT ||
        e?.response?.data?.EM ||
        e?.message ||
        "Không gửi được.";
      setNoticeModal({ title: "Không gửi được", message: msg, tone: "danger" });
      return false;
    } finally {
      setAttLoading(false);
    }
  };

  const ackSharePaymentFromModal = async () => {
    if (!attBooking?.id) return false;
    setAttLoading(true);
    try {
      await ptAcknowledgeSharePaymentResponse(attBooking.id);
      setNoticeModal({
        title: "Đã xác nhận",
        message: "Bạn đã xác nhận nhận tiền / đồng ý phản hồi chủ phòng.",
        tone: "success",
      });
      await refreshAttBooking();
      return true;
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.DT ||
        e?.response?.data?.EM ||
        e?.message ||
        "Không xác nhận được.";
      setNoticeModal({ title: "Không xác nhận được", message: msg, tone: "danger" });
      return false;
    } finally {
      setAttLoading(false);
    }
  };

  const submitShareDisputeFromModal = async ({ note }) => {
    if (!attBooking?.id) return false;
    const t = String(note || "").trim();
    if (t.length < 8) {
      setNoticeModal({
        title: "Thiếu nội dung",
        message: "Vui lòng nhập nội dung khiếu nại ít nhất 8 ký tự.",
        tone: "danger",
      });
      return false;
    }
    setAttLoading(true);
    try {
      await ptSubmitSharePaymentDispute(attBooking.id, { note: t });
      setNoticeModal({
        title: "Đã gửi",
        message: "Chủ phòng mượn đã nhận khiếu nại.",
        tone: "success",
      });
      await refreshAttBooking();
      return true;
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.DT ||
        e?.response?.data?.EM ||
        e?.message ||
        "Không gửi được khiếu nại.";
      setNoticeModal({ title: "Không gửi được", message: msg, tone: "danger" });
      return false;
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
    setBusyReason("");
    setBusyReasonError("");
    setBusyReasonModalOpen(true);
  };

  const submitBusySlotRequest = async () => {
    if (!attBooking?.id) return;
    if (!String(busyReason || "").trim()) {
      setBusyReasonError("Vui lòng nhập lý do trước khi gửi yêu cầu.");
      return;
    }
    setAttLoading(true);
    try {
      await ptRequestBusySlot({ bookingId: attBooking.id, reason: String(busyReason || "").trim() });
      setBusyReasonModalOpen(false);
      setBusyReasonError("");
      setNoticeModal({ title: "Thành công", message: "Đã gửi yêu cầu báo bận cho chủ phòng tập.", tone: "success" });
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.DT ||
        e?.response?.data?.EM ||
        e?.message ||
        "Không thể gửi yêu cầu báo bận.";
      setNoticeModal({ title: "Không thể gửi yêu cầu", message: msg, tone: "danger" });
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
              <div className="ptWeek__timeSpacer" />
              <div className="ptWeek__timeBody ptWeek__timeBody--dayRange">
                {Array.from({ length: hourRowCount }).map((_, i) => (
                  <div key={i} className="ptWeek__timeRow" style={{ height: `${ROW_HEIGHT}px` }}>
                    <span className="ptWeek__timeLabel">{`${String(START_HOUR + i).padStart(2, "0")}:00`}</span>
                  </div>
                ))}
                <span className="ptWeek__timeEndCap" aria-hidden>
                  24:00
                </span>
              </div>
            </div>
            <div className="ptWeek__days">
              <div className="ptWeek__daysHead">
                {weekDays.map((d,idx)=>(<div key={idx} className="ptWeek__dayHead"><div className="ptWeek__dayName">{d.dayLabel}</div><div className="ptWeek__dayDate">{formatDate(d.date).slice(0,5)}</div></div>))}
              </div>
              <div className="ptWeek__daysBody">
                {weekDays.map((d,idx)=>(
                  <div key={idx} className="ptWeek__dayCol" style={{ height: `${hourRowCount * ROW_HEIGHT}px` }}>
                    {(d.slots||[]).map((s,i)=>{
                      const startMin = parseTimeToMinutes(s.start);
                      const endMin = parseTimeToMinutes(s.end);
                      if (startMin >= endMin || endMin <= gridStartMin || startMin >= gridEndMin) return null;
                      const drawStart = Math.max(startMin, gridStartMin);
                      const drawEnd = Math.min(endMin, gridEndMin);
                      if (drawStart >= drawEnd) return null;

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

                      const topPx = ((drawStart - gridStartMin) / 60) * ROW_HEIGHT;
                      const heightPx = ((drawEnd - drawStart) / 60) * ROW_HEIGHT;
                      
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
                              <div
                                className="mini-status"
                                title={
                                  isSharedSession &&
                                  booking?.sharePayment?.sharePaymentPtAcknowledgedAt
                                    ? "PT đã xác nhận — hết tranh chấp thanh toán"
                                    : undefined
                                }
                              >
                                {isSharedSession ? (
                                  booking?.sharePayment?.sharePaymentPtAcknowledgedAt ? (
                                    <span className="mini-status--paidAck">Đã thanh toán</span>
                                  ) : (
                                    "↔ Lịch chia sẻ"
                                  )
                                ) : isBusyRequested ? (
                                  "⚠ PT báo bận"
                                ) : attendanceStatus === "present" ? (
                                  "✓ Có mặt"
                                ) : attendanceStatus === "absent" ? (
                                  "✗ Vắng mặt"
                                ) : (
                                  ""
                                )}
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
        ) : (
          <table className="ptTable">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Khung giờ rảnh</th>
                <th>Tên học viên</th>
              </tr>
            </thead>
            <tbody>
              {todaySlots.length === 0 ? (
                <tr><td colSpan="3" className="ptTable__empty">Không có khung giờ rảnh hôm nay.</td></tr>
              ) : (
                todaySlots.map((s, i) => {
                  const booking = todayAttendanceRows.find(
                    (b) => String(b.startTime || "").slice(0, 5) === String(s.start || "").slice(0, 5)
                  );
                  const studentCell = booking
                    ? booking.Member?.User?.username || "Học viên"
                    : "Lịch rảnh";
                  return (
                    <tr key={i}>
                      <td>{formatDate(new Date())}</td>
                      <td><span className="ptPill">{s.start}-{s.end}</span></td>
                      <td className={booking ? "" : "ptSchedule__muted"}>{studentCell}</td>
                    </tr>
                  );
                })
              )}
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
        onSendSharePayment={sendSharePaymentFromModal}
        onSubmitShareDispute={submitShareDisputeFromModal}
        onAckSharePayment={ackSharePaymentFromModal}
        refresh={refreshAttBooking}
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

      <NiceModal
        open={Boolean(noticeModal)}
        onClose={() => setNoticeModal(null)}
        zIndex={1300}
        tone={noticeModal?.tone || "info"}
        title={noticeModal?.title || "Thông báo"}
        footer={
          <button
            type="button"
            className="nice-modal__btn nice-modal__btn--primary"
            onClick={() => setNoticeModal(null)}
          >
            Đã hiểu
          </button>
        }
      >
        <p>{noticeModal?.message}</p>
      </NiceModal>

      <NiceModal
        open={busyReasonModalOpen}
        onClose={() => {
          if (attLoading) return;
          setBusyReasonModalOpen(false);
          setBusyReasonError("");
        }}
        zIndex={1300}
        tone="info"
        title="Nhập lý do báo bận"
        footer={
          <>
            <button
              type="button"
              className="nice-modal__btn nice-modal__btn--ghost"
              onClick={() => setBusyReasonModalOpen(false)}
              disabled={attLoading}
            >
              Hủy
            </button>
            <button
              type="button"
              className="nice-modal__btn nice-modal__btn--primary"
              onClick={submitBusySlotRequest}
              disabled={attLoading}
            >
              {attLoading ? "Đang gửi..." : "Gửi yêu cầu"}
            </button>
          </>
        }
      >
        <label htmlFor="pt-busy-reason-input" className="nice-modal__label">
          Lý do bận
        </label>
        <textarea
          id="pt-busy-reason-input"
          value={busyReason}
          onChange={(e) => {
            setBusyReason(e.target.value);
            if (busyReasonError) setBusyReasonError("");
          }}
          rows={3}
          placeholder="Nhập lý do nếu có..."
          className="nice-modal__textarea"
        />
        {busyReasonError ? <p className="ptSchedule__busyReasonError">{busyReasonError}</p> : null}
      </NiceModal>
    </div>
  );
};

export default PTSchedule;