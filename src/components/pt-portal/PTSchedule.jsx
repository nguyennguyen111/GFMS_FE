import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getPTScheduleSlots, getPTDetails, getMyPTProfile } from "../../services/ptService";
import { connectSocket } from "../../services/socketClient";
import { getAccessToken, getCurrentUser } from "../../utils/auth";
import { normalizeSingleImageSrc } from "../../utils/image";
import {
  getPTAttendanceSchedule,
  invalidatePTAttendanceScheduleCache,
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

const getRequestErrorMessage = (error, fallback) => {
  const status = error?.response?.status;
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.DT ||
    error?.response?.data?.EM ||
    error?.message ||
    "";

  const isTimeout =
    error?.code === "ECONNABORTED" ||
    /timeout/i.test(String(message));

  if (isTimeout) {
    return "Hệ thống đang xử lý lâu hơn bình thường. Vui lòng thử lại sau ít giây.";
  }

  if (status === 504) {
    return "Máy chủ phản hồi chậm. Vui lòng thử lại.";
  }

  return message || fallback;
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
  const [attActionPending, setAttActionPending] = useState(false);
  const [attBooking, setAttBooking] = useState(null);
  const [attCache, setAttCache] = useState({});
  const [attendanceBlockModal, setAttendanceBlockModal] = useState(null);
  const [noticeModal, setNoticeModal] = useState(null);
  const [busyReasonModalOpen, setBusyReasonModalOpen] = useState(false);
  const [busyReason, setBusyReason] = useState("");
  const [busyReasonError, setBusyReasonError] = useState("");
  const [busySubmitting, setBusySubmitting] = useState(false);
  const busySubmittingRef = useRef(false);
  const fetchedDateRef = useRef(new Set());

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
    let mounted = true;
    (async () => {
      const [scheduleResult, detailsResult] = await Promise.allSettled([
        getPTScheduleSlots(ptId),
        getPTDetails(ptId),
      ]);

      if (!mounted) return;

      if (scheduleResult.status === "fulfilled") {
        setSchedule(scheduleResult.value || {});
      } else {
        setSchedule({});
        setNoticeModal({
          title: "Không tải được lịch",
          message: getRequestErrorMessage(
            scheduleResult.reason,
            "Máy chủ phản hồi chậm, vui lòng thử lại sau."
          ),
          tone: "danger",
        });
      }

      if (detailsResult.status === "fulfilled") {
        setPT(detailsResult.value || null);
      } else {
        setPT(null);
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [ptId]);

  const applyBookingPatchToCache = (ymd, bookingId, patch = {}) => {
    if (!ymd || !bookingId) return;
    setAttCache((prev) => {
      const rows = Array.isArray(prev?.[ymd]) ? prev[ymd] : [];
      if (!rows.length) return prev;
      let changed = false;
      const nextRows = rows.map((row) => {
        if (row.id !== bookingId) return row;
        changed = true;
        return { ...row, ...patch };
      });
      return changed ? { ...prev, [ymd]: nextRows } : prev;
    });
  };

  const refreshAttBookingInBackground = (bookingId, ymd, options = {}) => {
    if (!bookingId || !ymd) return;
    getPTAttendanceSchedule({ date: ymd }, options)
      .then((res) => {
        const rows = res?.rows || [];
        setAttCache((prev) => ({ ...prev, [ymd]: rows }));
        const next = rows.find((b) => b.id === bookingId);
        if (next) setAttBooking(next);
      })
      .catch(() => {});
  };

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
  const weekMetrics = useMemo(() => {
    let totalSlots = 0;
    let bookedSlots = 0;
    let busySlots = 0;
    const clients = new Set();

    weekDays.forEach((d) => {
      const ymd = toYMD(d.date);
      const rows = attCache[ymd] || [];
      const slots = d.slots || [];
      totalSlots += slots.length;

      slots.forEach((slot) => {
        const booking = rows.find(
          (b) => String(b.startTime || "").slice(0, 5) === String(slot.start || "").slice(0, 5)
        );
        if (!booking) return;
        bookedSlots += 1;
        if (booking.busyRequested) busySlots += 1;
        if (booking.memberId) clients.add(booking.memberId);
      });
    });

    const freeSlots = Math.max(totalSlots - bookedSlots, 0);
    const occupancyRate = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;
    return { totalSlots, bookedSlots, busySlots, freeSlots, occupancyRate, clients: clients.size };
  }, [weekDays, attCache]);

  useEffect(() => {
    weekDays.forEach((d) => {
      const ymd = toYMD(d.date);
      if (fetchedDateRef.current.has(ymd)) return;
      fetchedDateRef.current.add(ymd);
      getPTAttendanceSchedule({ date: ymd })
        .then((res) => setAttCache((prev) => ({ ...prev, [ymd]: res?.rows || [] })))
        .catch(() => {});
    });
  }, [weekDays]);

  useEffect(() => {
    if (!ptId) return;
    fetchedDateRef.current.clear();
    setAttCache({});
    const ymd = toYMD(new Date());
    getPTAttendanceSchedule({ date: ymd })
      .then((res) => setAttCache((prev) => ({ ...prev, [ymd]: res?.rows || [] })))
      .catch(() => {});
  }, [ptId]);

  const refreshVisibleAttendance = async ({ force = false } = {}) => {
    const days =
      activeTab === "today"
        ? [{ date: new Date() }]
        : weekDays.map((d) => ({ date: d.date }));
    const ymDs = days.map((d) => toYMD(new Date(d.date)));

    await Promise.all(
      ymDs.map(async (ymd) => {
        try {
          invalidatePTAttendanceScheduleCache(ymd);
          const res = await getPTAttendanceSchedule({ date: ymd }, { force });
          setAttCache((prev) => ({ ...prev, [ymd]: res?.rows || [] }));
        } catch {
          // ignore
        }
      })
    );
  };

  useEffect(() => {
    const token = getAccessToken();
    const user = getCurrentUser();
    const gid = Number(user?.groupId ?? user?.group_id ?? 0);
    if (!token || gid !== 3) return undefined;

    const socket = connectSocket();
    const debounceRef = { t: null };

    const onNoti = (payload) => {
      const type = String(payload?.notificationType || "").toLowerCase();
      if (type !== "booking_update" && type !== "booking") return;
      if (debounceRef.t) clearTimeout(debounceRef.t);
      debounceRef.t = setTimeout(() => {
        refreshVisibleAttendance({ force: true });
      }, 250);
    };

    socket.on("notification:new", onNoti);
    return () => {
      if (debounceRef.t) clearTimeout(debounceRef.t);
      socket.off("notification:new", onNoti);
    };
  }, [weekDays, activeTab]);

  const openAttendance = async (dateObj, slot) => {
    const ymd = toYMD(dateObj);
    const slotKey = String(slot.start || "").slice(0, 5);
    const rows = attCache[ymd] || [];
    const cached = rows.find((b) => String(b.startTime || "").slice(0, 5) === slotKey);

    setAttOpen(true);
    if (cached) {
      setAttBooking(cached);
      setAttLoading(false);
      refreshAttBookingInBackground(cached.id, ymd, { force: false });
      return;
    } else {
      setAttBooking(null);
      setAttLoading(true);
    }

    try {
      const res = await getPTAttendanceSchedule({ date: ymd }, { force: false });
      setAttCache((prev) => ({ ...prev, [ymd]: res?.rows || [] }));
      const found = (res?.rows || []).find(
        (b) => String(b.startTime || "").slice(0, 5) === slotKey,
      );
      setAttBooking(found || null);
    } catch {
      const found = rows.find((b) => String(b.startTime || "").slice(0, 5) === slotKey);
      setAttBooking(found || null);
    } finally {
      setAttLoading(false);
    }
  };

  const refreshAttBooking = () => {
    if (!attBooking?.id) return;
    const ymd = toYMD(new Date(attBooking.bookingDate));
    refreshAttBookingInBackground(attBooking.id, ymd, { force: false });
  };

  const updateStatus = async (status) => {
    if (!attBooking?.id || attActionPending) return;
    const targetBooking = attBooking;
    const ymd = toYMD(new Date(targetBooking.bookingDate));
    const previousBookingStatus = targetBooking.status;
    const previousAttendance = targetBooking.trainerAttendance || null;
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
    setAttBooking((prev) =>
      prev && prev.id === targetBooking.id
        ? {
            ...prev,
            status: "in_progress",
            trainerAttendance: {
              ...(prev?.trainerAttendance || {}),
              status: s,
            },
          }
        : prev
    );
    applyBookingPatchToCache(ymd, targetBooking.id, {
      status: "in_progress",
      trainerAttendance: {
        ...(targetBooking?.trainerAttendance || {}),
        status: s,
      },
    });
    setAttActionPending(true);
    try {
      const result = await ptCheckIn({ bookingId: targetBooking.id, method: "manual", status: s });
      const nextBookingStatus = result?.booking?.status || "in_progress";
      const nextAttendance = result?.attendance || {
        ...(targetBooking?.trainerAttendance || {}),
        status: s,
      };

      setAttBooking((prev) =>
        prev && prev.id === targetBooking.id
          ? { ...prev, status: nextBookingStatus, trainerAttendance: nextAttendance }
          : prev
      );
      applyBookingPatchToCache(ymd, targetBooking.id, {
        status: nextBookingStatus,
        trainerAttendance: nextAttendance,
      });
      invalidatePTAttendanceScheduleCache(ymd);
    } catch (e) {
      setAttBooking((prev) =>
        prev && prev.id === targetBooking.id
          ? { ...prev, status: previousBookingStatus, trainerAttendance: previousAttendance }
          : prev
      );
      applyBookingPatchToCache(ymd, targetBooking.id, {
        status: previousBookingStatus,
        trainerAttendance: previousAttendance,
      });
      const msg = getRequestErrorMessage(e, "Không thể cập nhật điểm danh. Vui lòng thử lại.");
      const locked = /chốt kỳ|chi trả|đã chi trả|payroll/i.test(String(msg));
      setAttendanceBlockModal(
        locked ? PT_ATTENDANCE_LOCK_MSG : msg
      );
    } finally {
      setAttActionPending(false);
    }
  };

  const resetStatus = async () => {
    if (!attBooking || attActionPending) return;
    const targetBooking = attBooking;
    const ymd = toYMD(new Date(targetBooking.bookingDate));
    const previousBookingStatus = targetBooking.status;
    const previousAttendance = targetBooking.trainerAttendance || null;
    setAttBooking((prev) =>
      prev && prev.id === targetBooking.id
        ? { ...prev, status: "confirmed", trainerAttendance: null }
        : prev
    );
    applyBookingPatchToCache(ymd, targetBooking.id, {
      status: "confirmed",
      trainerAttendance: null,
    });
    setAttActionPending(true);
    try {
      const result = await ptResetAttendance({ bookingId: targetBooking.id });
      const nextBookingStatus = result?.booking?.status || "confirmed";
      setAttBooking((prev) =>
        prev && prev.id === targetBooking.id
          ? { ...prev, status: nextBookingStatus, trainerAttendance: null }
          : prev
      );
      applyBookingPatchToCache(ymd, targetBooking.id, {
        status: nextBookingStatus,
        trainerAttendance: null,
      });
      invalidatePTAttendanceScheduleCache(ymd);
    } catch (e) {
      setAttBooking((prev) =>
        prev && prev.id === targetBooking.id
          ? { ...prev, status: previousBookingStatus, trainerAttendance: previousAttendance }
          : prev
      );
      applyBookingPatchToCache(ymd, targetBooking.id, {
        status: previousBookingStatus,
        trainerAttendance: previousAttendance,
      });
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.DT ||
        e?.response?.data?.EM ||
        e?.message ||
        "Không thể hoàn tác điểm danh.";
      setNoticeModal({ title: "Không thể hoàn tác", message: msg, tone: "danger" });
    } finally {
      setAttActionPending(false);
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
      refreshAttBooking();
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
      refreshAttBooking();
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
      refreshAttBooking();
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

  const completeStatus = async ({ ptMemberFeedback } = {}) => {
    if (!attBooking || attActionPending) return false;
    const targetBooking = attBooking;
    const ymd = toYMD(new Date(targetBooking.bookingDate));
    const previousBookingStatus = targetBooking.status;
    const previousAttendance = targetBooking.trainerAttendance || null;
    const fb = String(ptMemberFeedback || "").trim();
    setAttBooking((prev) =>
      prev && prev.id === targetBooking.id
        ? {
            ...prev,
            status: "completed",
            trainerAttendance: {
              ...(prev?.trainerAttendance || {}),
              status: "present",
            },
            ptMemberFeedback: fb,
          }
        : prev
    );
    applyBookingPatchToCache(ymd, targetBooking.id, {
      status: "completed",
      trainerAttendance: {
        ...(targetBooking?.trainerAttendance || {}),
        status: "present",
      },
      ptMemberFeedback: fb,
    });
    setAttActionPending(true);
    try {
      const result = await ptCheckOut({
        bookingId: targetBooking.id,
        status: "present",
        ptMemberFeedback,
      });
      const nextBookingStatus = result?.booking?.status || "completed";
      const nextAttendance = result?.attendance || {
        ...(targetBooking?.trainerAttendance || {}),
        status: "present",
      };
      const nextFb = result?.booking?.ptMemberFeedback ?? fb;
      setAttBooking((prev) =>
        prev && prev.id === targetBooking.id
          ? {
              ...prev,
              status: nextBookingStatus,
              trainerAttendance: nextAttendance,
              ptMemberFeedback: nextFb,
            }
          : prev
      );
      applyBookingPatchToCache(ymd, targetBooking.id, {
        status: nextBookingStatus,
        trainerAttendance: nextAttendance,
        ptMemberFeedback: nextFb,
      });
      invalidatePTAttendanceScheduleCache(ymd);
      return true;
    } catch (e) {
      setAttBooking((prev) =>
        prev && prev.id === targetBooking.id
          ? { ...prev, status: previousBookingStatus, trainerAttendance: previousAttendance }
          : prev
      );
      applyBookingPatchToCache(ymd, targetBooking.id, {
        status: previousBookingStatus,
        trainerAttendance: previousAttendance,
      });
      const msg = getRequestErrorMessage(e, "Không thể hoàn thành buổi tập. Vui lòng thử lại.");
      const locked = /chốt kỳ|chi trả|điểm danh|không thể thay đổi/i.test(String(msg));
      setAttendanceBlockModal(
        locked ? PT_ATTENDANCE_LOCK_MSG : msg
      );
      return false;
    } finally {
      setAttActionPending(false);
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
    if (busySubmittingRef.current) return;
    if (!String(busyReason || "").trim()) {
      setBusyReasonError("Vui lòng nhập lý do trước khi gửi yêu cầu.");
      return;
    }
    busySubmittingRef.current = true;
    setBusySubmitting(true);
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
      // Hiển thị lỗi trực tiếp trong modal nhập lý do để người dùng thấy ngay,
      // tránh tình trạng phải đóng modal mới thấy popup báo lỗi phía dưới.
      setBusyReasonError(msg);
    } finally {
      setAttLoading(false);
      setBusySubmitting(false);
      busySubmittingRef.current = false;
    }
  };

  if (loading) return (
    <div className="ptSchedule">
      <div className="ptSchedule__controlWrapper">
        <div className="ptSchedule__tabs" />
      </div>
      <div className="ptSchedule__card">
        <div style={{ padding: "40px 0", textAlign: "center", color: "#9ab3a0", fontSize: "14px" }}>
          Đang tải lịch...
        </div>
      </div>
    </div>
  );

  const getStudentNameColor = (attendanceStatus, busyRequested, sharedSession, isSubstitute) => {
    if (isSubstitute) return '#008cff';
    if (sharedSession) return '#a78bfa';
    if (busyRequested) return '#f59e0b';
    if (attendanceStatus === 'present') return '#2ecc71';
    if (attendanceStatus === 'absent') return '#e74c3c';
    return '#3498db';
  };

  // Đồng bộ logic chọn avatar với `PTClients.jsx`
  const isUsableAvatarUrl = (url) => {
    const s = String(url || "").trim();
    if (!s) return false;
    if (/default-avatar\.png$/i.test(s)) return false;
    return /^https?:\/\//i.test(s) || s.startsWith("data:image/") || s.startsWith("/");
  };

  const pickMemberAvatar = (booking) => {
    const member = booking?.Member || booking?.member || null;
    const direct = member?.avatar;
    const nested = member?.User?.avatar;
    const raw = isUsableAvatarUrl(direct) ? String(direct).trim() : isUsableAvatarUrl(nested) ? String(nested).trim() : "";
    const normalized = raw ? normalizeSingleImageSrc(raw) : "";
    return normalized || null;
  };

  const pickMemberInitial = (booking) => {
    const name =
      booking?.Member?.User?.username ||
      booking?.Member?.User?.email ||
      booking?.Member?.fullName ||
      "";
    const ch = String(name).trim().charAt(0).toUpperCase();
    return ch || "H";
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

      <div className="ptSchedule__kpiWrap">
        <div className="ptSchedule__kpiCard">
          <div className="ptSchedule__kpiLabel">Tổng lịch hẹn tuần</div>
          <div className="ptSchedule__kpiValue">{weekMetrics.bookedSlots}</div>
        </div>
        <div className="ptSchedule__kpiCard">
          <div className="ptSchedule__kpiLabel">Khách hàng</div>
          <div className="ptSchedule__kpiValue">{weekMetrics.clients}</div>
        </div>
        <div className="ptSchedule__kpiCard">
          <div className="ptSchedule__kpiLabel">Giờ rảnh</div>
          <div className="ptSchedule__kpiValue">{weekMetrics.freeSlots}</div>
        </div>
        <div className="ptSchedule__kpiCard">
          <div className="ptSchedule__kpiLabel">Tỷ lệ kín lịch</div>
          <div className="ptSchedule__kpiValue">{weekMetrics.occupancyRate}%</div>
        </div>
      </div>

      <div className="ptSchedule__controlWrapper">
        <div className="ptSchedule__tabs">
          <button className={`ptTab ${activeTab==="week"?"active":""}`} onClick={()=>setActiveTab("week")}>Tuần</button>
          <button className={`ptTab ${activeTab==="today"?"active":""}`} onClick={()=>setActiveTab("today")}>Hôm nay</button>

          <div className="ptMonthPick">
            <span className="ptMonthLabel">Tháng</span>
            <select value={pickMonth} onChange={(e)=>{const m=+e.target.value; setPickMonth(m); jumpToMonth(m,pickYear);}} className="ptMonthSelect">
              {Array.from({length:12}).map((_,i)=><option key={i} value={i+1}>{`Tháng ${i+1}`}</option>)}
            </select>
            <select value={pickYear} onChange={(e)=>{const y=+e.target.value; setPickYear(y); jumpToMonth(pickMonth,y);}} className="ptYearSelect">
              {Array.from({length:7}).map((_,i)=><option key={i} value={now.getFullYear()-3+i}>{now.getFullYear()-3+i}</option>)}
            </select>
          </div>
        </div>

        {activeTab==="week" && <div className="ptWeekBar">
          <button className="ptBtn ptBtn--ghost" onClick={()=>setWeekOffset(v=>v-1)}>←</button>
          <button className="ptBtn ptBtn--ghost" onClick={()=>setWeekOffset(0)}>Hôm nay</button>
          <button className="ptBtn ptBtn--ghost" onClick={()=>setWeekOffset(v=>v+1)}>→</button>
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
                      const hasAttendanceReminder =
                        String(booking?.notes || "").includes("[ATTENDANCE_PT_REMINDER]") ||
                        String(booking?.notes || "").includes("[ATTENDANCE_OWNER_REMINDER]");
                      const isSharedSession = Boolean(booking?.sharePayment) || String(booking?.sessionType || "").toLowerCase() === "trainer_share" || String(booking?.type || "").toLowerCase() === "trainer_share";
                      // isSubstitute: chỉ khi có marker [PT_SUBSTITUTE] rõ ràng hoặc booking.isSubstitute=true, KHÔNG phụ thuộc sessionType
                      const isSubstitute = !isBusyRequested && (booking?.isSubstitute === true || String(booking?.notes || "").includes("[PT_SUBSTITUTE]"));
                      if (booking) {
                        if (isSharedSession) statusClass = "is-shared";
                        else if (isBusyRequested) statusClass = "is-busy-requested";
                        else if (isSubstitute) statusClass = "is-substitute";
                        else if (attendanceStatus === "present") statusClass = "is-present";
                        else if (attendanceStatus === "absent") statusClass = "is-absent";
                        else if (hasAttendanceReminder) statusClass = "is-reminder";
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
                            // Tránh cắt chữ ở đáy (đặc biệt các line "đã báo bận", "có mặt"...)
                            height: `${Math.max(18, heightPx)}px`,
                          }} 
                          onClick={()=>openAttendance(d.date,s)}
                        >
                          <div className="ptWeek__topRow">
                            <div className="ptWeek__blockTime">{s.start}</div>
                            {booking && (attendanceStatus || isBusyRequested || isSharedSession || isSubstitute) ? (
                              <div
                                className="mini-status mini-status--inline"
                                title={
                                  isSharedSession &&
                                  booking?.sharePayment?.sharePaymentPtAcknowledgedAt
                                    ? "PT đã xác nhận — hết tranh chấp thanh toán"
                                    : undefined
                                }
                              >
                                {isSharedSession ? (
                                  booking?.sharePayment?.sharePaymentPtAcknowledgedAt ? (
                                    <span className="mini-status--paidAck">✓ Đã thanh toán</span>
                                  ) : (
                                    <span style={{ color: "#a855f7" }}>↔ Mượn ngoài CN</span>
                                  )
                                ) : isBusyRequested ? (
                                  "⚠ Đã báo bận"
                                ) : isSubstitute ? (
                                  <span style={{ color: "#008cff" }}>Lịch dạy thay</span>
                                ) : hasAttendanceReminder ? (
                                  "🔴 Cần điểm danh"
                                ) : attendanceStatus === "present" ? (
                                  "✓ Có mặt"
                                ) : attendanceStatus === "absent" ? (
                                  "✗ Vắng mặt"
                                ) : (
                                  ""
                                )}
                              </div>
                            ) : null}
                          </div>

                          {booking ? (
                            <div
                              className="ptWeek__studentName"
                              style={{
                                color: getStudentNameColor(attendanceStatus, isBusyRequested, isSharedSession, isSubstitute),
                              }}
                            >
                            <span className="ptWeek__studentChip">
                              {(() => {
                                const av = pickMemberAvatar(booking);
                                if (av) {
                                  return (
                                    <img
                                      className="ptWeek__studentAvatar"
                                      src={av}
                                      alt="avatar"
                                      loading="lazy"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                      }}
                                    />
                                  );
                                }
                                return (
                                  <span className="ptWeek__studentAvatarFallback" aria-hidden>
                                    {pickMemberInitial(booking)}
                                  </span>
                                );
                              })()}
                              <span className="ptWeek__studentText">
                                {booking.Member?.User?.username || "Học viên"}
                              </span>
                            </span>
                            </div>
                          ) : null}
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
                  const studentCell = booking ? (
                    <span className="ptWeek__studentChip">
                      {(() => {
                        const av = pickMemberAvatar(booking);
                        if (av) {
                          return (
                            <img
                              className="ptWeek__studentAvatar"
                              src={av}
                              alt="avatar"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          );
                        }
                        return (
                          <span className="ptWeek__studentAvatarFallback" aria-hidden>
                            {pickMemberInitial(booking)}
                          </span>
                        );
                      })()}
                      <span className="ptWeek__studentText">
                        {booking.Member?.User?.username || "Học viên"}
                      </span>
                    </span>
                  )
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

      <div className="ptSchedule__legend">
        <span className="ptLegendItem">
          <span className="ptLegendDot ptLegendDot--booked" />
          Đã đặt lịch
        </span>
        <span className="ptLegendItem">
          <span className="ptLegendDot ptLegendDot--busy" />
          PT bận
        </span>
        <span className="ptLegendItem">
          <span className="ptLegendDot ptLegendDot--free" />
          Lịch rảnh
        </span>
      </div>

      <PTAttendanceModal
        open={attOpen}
        booking={attBooking}
        loading={attLoading}
        actionPending={attActionPending}
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
              disabled={attLoading || busySubmitting}
            >
              {attLoading || busySubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
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