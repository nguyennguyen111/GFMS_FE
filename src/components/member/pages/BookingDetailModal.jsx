import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dumbbell,
  MapPin,
  RefreshCcw,
  UserRound,
  X,
} from "lucide-react";
import "./BookingDetailModal.css";
import {
  memberCreateRescheduleRequest,
  memberGetRescheduleOptions,
} from "../../../services/memberBookingService";

const DAY_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "monday", label: "Thứ 2" },
  { value: "tuesday", label: "Thứ 3" },
  { value: "wednesday", label: "Thứ 4" },
  { value: "thursday", label: "Thứ 5" },
  { value: "friday", label: "Thứ 6" },
  { value: "saturday", label: "Thứ 7" },
  { value: "sunday", label: "Chủ nhật" },
];

const DAY_KEY_BY_JS_DAY = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const safeParseJSON = (value, fallback = {}) => {
  try {
    if (!value) return fallback;
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
};

const timeToMinutes = (value) => {
  const raw = String(value || "").slice(0, 5);
  const [h, m] = raw.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const getTrainerWorkingRanges = (booking, isoDate) => {
  if (!isoDate) return [];
  const availableHours = safeParseJSON(booking?.Trainer?.availableHours, {});
  const jsDay = new Date(`${isoDate}T00:00:00`).getDay();
  const dayKey = DAY_KEY_BY_JS_DAY[jsDay];
  return Array.isArray(availableHours?.[dayKey]) ? availableHours[dayKey] : [];
};

const slotFitsTrainerHours = (slot, ranges = []) => {
  const slotStart = timeToMinutes(slot?.startTime);
  const slotEnd = timeToMinutes(slot?.endTime);
  if (slotStart === null || slotEnd === null) return false;

  return ranges.some((range) => {
    const rangeStart = timeToMinutes(range?.start);
    const rangeEnd = timeToMinutes(range?.end);
    if (rangeStart === null || rangeEnd === null) return false;
    return slotStart >= rangeStart && slotEnd <= rangeEnd;
  });
};

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

const fmtDate = (value) => {
  const raw = String(value || "").slice(0, 10);
  if (!raw) return "—";
  const [y, m, d] = raw.split("-");
  return `${d}/${m}/${y}`;
};

const fmtTime = (value) => String(value || "").slice(0, 5) || "—";

const getRescheduleMeta = (booking) => {
  const req = booking?.pendingRescheduleRequest || booking?.latestRescheduleRequest || null;

  if (booking?.pendingRescheduleRequest) {
    return {
      tone: "pending",
      label: "Đang chờ PT phản hồi",
      detail: `Đề xuất ${fmtDate(req.requestedDate)} · ${fmtTime(
        req.requestedStartTime
      )} - ${fmtTime(req.requestedEndTime)}`,
    };
  }

  if (req?.status === "rejected") {
    return {
      tone: "rejected",
      label: "Yêu cầu đổi lịch bị từ chối",
      detail: req.trainerResponseNote || "PT chưa thể đáp ứng khung giờ bạn đề xuất.",
    };
  }

  if (req?.status === "approved" || booking?.isRescheduled) {
    return {
      tone: "approved",
      label: "Buổi tập đã đổi lịch",
      detail: `Từ ${fmtDate(req?.oldBookingDate || booking?.originalBookingDate)} ${fmtTime(
        req?.oldStartTime || booking?.originalStartTime
      )} sang ${fmtDate(booking?.bookingDate)} ${fmtTime(booking?.startTime)}`,
    };
  }

  return null;
};

export default function BookingDetailModal({ booking, onClose, onUpdated }) {
  const [mode, setMode] = useState("detail"); // detail | request
  const [weekday, setWeekday] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [reason, setReason] = useState("");
  const [options, setOptions] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    if (mode !== "request" || !booking?.id) return;

    let mounted = true;

    const run = async () => {
      setLoadingOptions(true);
      setError("");

      try {
        const res = await memberGetRescheduleOptions(booking.id, {
          weekday: weekday || undefined,
          selectedDate: selectedDate || undefined,
        });

        if (!mounted) return;

        const data = res?.data?.data || null;
        setOptions(data);

        const filteredDates = (data?.availableDates || []).filter(
          (it) => getTrainerWorkingRanges(booking, it.date).length
        );

        const nextDate =
          selectedDate && filteredDates.some((it) => it.date === selectedDate)
            ? selectedDate
            : data?.selectedDate && filteredDates.some((it) => it.date === data.selectedDate)
            ? data.selectedDate
            : filteredDates?.[0]?.date || "";

        setSelectedDate(nextDate);

        const filteredSlots = (data?.availableSlots || []).filter((it) =>
          slotFitsTrainerHours(it, getTrainerWorkingRanges(booking, nextDate))
        );

        const nextSlot =
          selectedStartTime && filteredSlots.some((it) => it.startTime === selectedStartTime)
            ? selectedStartTime
            : filteredSlots?.[0]?.startTime || "";

        setSelectedStartTime(nextSlot);
      } catch (e) {
        if (!mounted) return;
        setOptions(null);
        setError(e?.response?.data?.message || "Không tải được khung giờ đổi lịch.");
      } finally {
        if (mounted) setLoadingOptions(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [mode, booking, booking?.id, weekday, selectedDate, selectedStartTime]);

  const disp = useMemo(() => getMemberSessionDisplay(booking), [booking]);
  const rescheduleMeta = useMemo(() => getRescheduleMeta(booking), [booking]);

  const isPastBooking = useMemo(() => {
    const bookingDate = String(booking?.bookingDate || "").slice(0, 10);
    const bookingStart = String(booking?.startTime || "").slice(0, 5);
    if (!bookingDate || !bookingStart) return false;
    const bookingStartMs = new Date(`${bookingDate}T${bookingStart}:00`).getTime();
    return Number.isFinite(bookingStartMs) && bookingStartMs <= Date.now();
  }, [booking]);

  const canRequestReschedule = useMemo(() => {
    const st = String(booking?.status || "").toLowerCase();
    return (
      booking &&
      !isPastBooking &&
      !booking?.pendingRescheduleRequest &&
      !["cancelled", "completed", "no_show"].includes(st)
    );
  }, [booking, isPastBooking]);

  const filteredAvailableDates = useMemo(() => {
    return (options?.availableDates || []).filter(
      (it) => getTrainerWorkingRanges(booking, it.date).length
    );
  }, [booking, options]);

  const selectedDateMeta = useMemo(
    () => filteredAvailableDates.find((it) => it.date === selectedDate) || null,
    [filteredAvailableDates, selectedDate]
  );

  const filteredAvailableSlots = useMemo(() => {
    const ranges = getTrainerWorkingRanges(booking, selectedDate);
    return (options?.availableSlots || []).filter((it) => slotFitsTrainerHours(it, ranges));
  }, [booking, options, selectedDate]);

  if (!booking) return null;

  const handleChooseWeekday = (nextWeekday) => {
    setWeekday(nextWeekday);
    setSelectedDate("");
    setSelectedStartTime("");
    setError("");
  };

  const handleChooseDate = (date) => {
    setSelectedDate(date);
    setSelectedStartTime("");
    setError("");
  };

  const openRequestMode = () => {
    setMode("request");
    setError("");
    setReason("");
  };

  const backToDetailMode = () => {
    setMode("detail");
    setError("");
  };

  const handleSubmitRequest = async () => {
    if (!selectedDate || !selectedStartTime) {
      setError("Vui lòng chọn ngày và khung giờ mong muốn.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      await memberCreateRescheduleRequest(booking.id, {
        weekday: weekday || undefined,
        requestedDate: selectedDate,
        requestedStartTime: selectedStartTime,
        reason,
      });

      setSuccessMessage(
        "Đã gửi yêu cầu đổi lịch đến PT. Bạn sẽ nhận được thông báo khi PT phản hồi."
      );
      setMode("detail");
      onUpdated?.();
    } catch (e) {
      setError(e?.response?.data?.message || "Không gửi được yêu cầu đổi lịch.");
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = (
    <div className="bd-backdrop" onClick={onClose}>
      <div
        className={`bd-modal ${mode === "request" ? "is-request-mode" : "is-detail-mode"}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="bd-head">
          <div>
            <div className="bd-kicker">
              {mode === "request" ? "Reschedule request" : "Booking detail"}
            </div>
            <h3 className="bd-title">
              {mode === "request" ? "Yêu cầu đổi lịch" : "Chi tiết buổi tập"}
            </h3>
            <p className="bd-sub">
              {mode === "request"
                ? "Chọn ngày và khung giờ phù hợp với lịch làm việc của PT để gửi yêu cầu đổi lịch."
                : "Xem nhanh thông tin lịch tập và gửi yêu cầu đổi lịch ngay trong ứng dụng."}
            </p>
          </div>

          <button className="bd-x" onClick={onClose} type="button" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="bd-body">
          {mode === "detail" ? (
            <>
              <div className="bd-top">
                <div className={`bd-status ${disp.key}`}>{disp.label}</div>

                <div className="bd-timeChip">
                  <Clock3 size={15} />
                  <span>
                    {fmtTime(booking.startTime)} - {fmtTime(booking.endTime)}
                  </span>
                </div>
              </div>

              {rescheduleMeta ? (
                <div className={`bd-rescheduleBanner bd-rescheduleBanner--${rescheduleMeta.tone}`}>
                  <div className="bd-rescheduleTitle">{rescheduleMeta.label}</div>
                  <div className="bd-rescheduleText">{rescheduleMeta.detail}</div>
                </div>
              ) : null}

              {successMessage ? (
                <div className="bd-successNotice">
                  <CheckCircle2 size={18} />
                  <div>
                    <div className="bd-successTitle">Đã gửi yêu cầu đổi lịch</div>
                    <div className="bd-successText">{successMessage}</div>
                  </div>
                </div>
              ) : null}

              <div className="bd-grid bd-grid--compact">
                <div className="bd-row">
                  <span className="bd-label">
                    <CalendarDays size={15} />
                    <span>Ngày tập</span>
                  </span>
                  <b className="bd-value">{fmtDate(booking.bookingDate)}</b>
                </div>

                <div className="bd-row">
                  <span className="bd-label">
                    <Clock3 size={15} />
                    <span>Khung giờ</span>
                  </span>
                  <b className="bd-value">
                    {fmtTime(booking.startTime)} - {fmtTime(booking.endTime)}
                  </b>
                </div>

                <div className="bd-row">
                  <span className="bd-label">
                    <UserRound size={15} />
                    <span>PT / Trainer</span>
                  </span>
                  <b className="bd-value">{booking?.Trainer?.User?.username || "PT"}</b>
                </div>

                <div className="bd-row">
                  <span className="bd-label">
                    <MapPin size={15} />
                    <span>Gym</span>
                  </span>
                  <b className="bd-value">{booking?.Gym?.name || "—"}</b>
                </div>

                <div className="bd-row">
                  <span className="bd-label">
                    <Dumbbell size={15} />
                    <span>Gói tập</span>
                  </span>
                  <b className="bd-value">{booking?.Package?.name || "—"}</b>
                </div>
              </div>
            </>
          ) : (
            <div className="bd-requestPanel bd-requestPanel--standalone">
              <div className="bd-requestCurrent">
                <div className="bd-requestCurrentLabel">Lịch hiện tại</div>
                <div className="bd-requestCurrentValue">
                  {fmtDate(booking.bookingDate)} · {fmtTime(booking.startTime)} - {fmtTime(booking.endTime)}
                </div>
              </div>

              <div className="bd-pickerSection">
                <div className="bd-sectionLabel">Chọn thứ trong tuần</div>
                <div className="bd-chipGrid">
                  {DAY_OPTIONS.map((it) => (
                    <button
                      key={it.value || "all"}
                      type="button"
                      className={`bd-chip ${weekday === it.value ? "active" : ""}`}
                      onClick={() => handleChooseWeekday(it.value)}
                    >
                      {it.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bd-pickerSection">
                <div className="bd-sectionLabel">Chọn ngày phù hợp</div>
                <div className="bd-optionGrid">
                  {filteredAvailableDates.map((it) => (
                    <button
                      key={it.date}
                      type="button"
                      className={`bd-optionCard ${selectedDate === it.date ? "active" : ""}`}
                      onClick={() => handleChooseDate(it.date)}
                    >
                      <span className="bd-optionTitle">{fmtDate(it.date)}</span>
                      <span className="bd-optionSub">{it.label}</span>
                    </button>
                  ))}

                  {!loadingOptions && !filteredAvailableDates.length ? (
                    <div className="bd-emptyState">
                      PT hiện chưa có ngày phù hợp trong thời gian tới.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="bd-pickerSection">
                <div className="bd-sectionLabel">Khung giờ PT đang có thể nhận</div>

                {selectedDateMeta ? (
                  <div className="bd-helperText">Ngày đã chọn: {selectedDateMeta.label}</div>
                ) : null}

                <div className="bd-slotGrid">
                  {filteredAvailableSlots.map((it) => (
                    <button
                      key={it.startTime}
                      type="button"
                      className={`bd-slotBtn ${selectedStartTime === it.startTime ? "active" : ""}`}
                      onClick={() => setSelectedStartTime(it.startTime)}
                      disabled={loadingOptions}
                    >
                      {it.label}
                    </button>
                  ))}

                  {!loadingOptions && selectedDate && !filteredAvailableSlots.length ? (
                    <div className="bd-emptyState">
                      Ngày này không còn khung giờ trống trong giờ làm việc của PT.
                    </div>
                  ) : null}
                </div>
              </div>

              <label className="bd-field bd-field--full">
                <span>Lý do đổi lịch</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Ví dụ: Em bận công việc buổi chiều, mong muốn chuyển sang sáng hôm sau."
                />
              </label>

              {loadingOptions ? (
                <div className="bd-inlineNotice">
                  Đang cập nhật danh sách ngày và khung giờ khả dụng…
                </div>
              ) : null}

              {error ? <div className="bd-inlineError">{error}</div> : null}
            </div>
          )}
        </div>

        <div className="bd-actions bd-actions--spread">
          {mode === "detail" ? (
            <>
              <button className="bd-btn bd-btn--ghost" onClick={onClose} type="button">
                Đóng
              </button>

              {canRequestReschedule ? (
                <button className="bd-btn bd-btn--secondary" onClick={openRequestMode} type="button">
                  Yêu cầu đổi lịch
                </button>
              ) : booking?.pendingRescheduleRequest ? (
                <button className="bd-btn bd-btn--disabled" type="button" disabled>
                  Đang chờ phản hồi
                </button>
              ) : (
                <button
                  className="bd-btn bd-btn--disabled"
                  type="button"
                  disabled
                  title={
                    isPastBooking
                      ? "Buổi tập đã qua nên không thể yêu cầu đổi lịch"
                      : "Buổi tập này hiện không thể đổi lịch"
                  }
                >
                  {isPastBooking ? "Buổi tập đã qua" : "Không thể đổi lịch"}
                </button>
              )}
            </>
          ) : (
            <>
              <button className="bd-btn bd-btn--ghost" onClick={backToDetailMode} type="button">
                Hủy
              </button>

              <button
                className="bd-btn"
                onClick={handleSubmitRequest}
                type="button"
                disabled={submitting || loadingOptions}
              >
                {submitting ? "Đang gửi…" : "Gửi yêu cầu"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}