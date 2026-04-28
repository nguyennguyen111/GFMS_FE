import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dumbbell,
  MapPin,
  MessageSquare,
  UserRound,
  X,
  Lock,
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

const DEFAULT_TIME_SLOTS = [
  { startTime: "06:00", endTime: "07:00", label: "06:00 - 07:00" },
  { startTime: "07:00", endTime: "08:00", label: "07:00 - 08:00" },
  { startTime: "08:00", endTime: "09:00", label: "08:00 - 09:00" },
  { startTime: "09:00", endTime: "10:00", label: "09:00 - 10:00" },
  { startTime: "10:00", endTime: "11:00", label: "10:00 - 11:00" },
  { startTime: "11:00", endTime: "12:00", label: "11:00 - 12:00" },
  { startTime: "12:00", endTime: "13:00", label: "12:00 - 13:00" },
  { startTime: "13:00", endTime: "14:00", label: "13:00 - 14:00" },
  { startTime: "14:00", endTime: "15:00", label: "14:00 - 15:00" },
  { startTime: "15:00", endTime: "16:00", label: "15:00 - 16:00" },
  { startTime: "16:00", endTime: "17:00", label: "16:00 - 17:00" },
  { startTime: "17:00", endTime: "18:00", label: "17:00 - 18:00" },
  { startTime: "18:00", endTime: "19:00", label: "18:00 - 19:00" },
  { startTime: "19:00", endTime: "20:00", label: "19:00 - 20:00" },
  { startTime: "20:00", endTime: "21:00", label: "20:00 - 21:00" },
  { startTime: "21:00", endTime: "22:00", label: "21:00 - 22:00" },
  { startTime: "22:00", endTime: "23:00", label: "22:00 - 23:00" },
];

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

const normalizeApiSlot = (slot) => ({
  ...slot,
  startTime: String(slot?.startTime || "").slice(0, 5),
  endTime: String(slot?.endTime || "").slice(0, 5),
  label:
    slot?.label ||
    `${String(slot?.startTime || "").slice(0, 5)} - ${String(slot?.endTime || "").slice(0, 5)}`,
});

const buildDisplaySlots = (options) => {
  const availableSlots = Array.isArray(options?.availableSlots)
    ? options.availableSlots.map(normalizeApiSlot)
    : [];

  const slotCatalog =
    Array.isArray(options?.slotCatalog) && options.slotCatalog.length
      ? options.slotCatalog.map((slot) => ({
          ...slot,
          startTime: String(slot?.startTime || slot?.start || "").slice(0, 5),
          endTime: String(slot?.endTime || slot?.end || "").slice(0, 5),
          label:
            slot?.label ||
            `${String(slot?.startTime || slot?.start || "").slice(0, 5)} - ${String(
              slot?.endTime || slot?.end || ""
            ).slice(0, 5)}`,
        }))
      : DEFAULT_TIME_SLOTS;

  const availableMap = new Map(
    availableSlots.map((slot) => [slot.startTime, slot])
  );

  return slotCatalog.map((base) => {
    const matched = availableMap.get(base.startTime);

    if (matched) {
      return {
        ...base,
        ...matched,
        disabled: false,
        reason: "",
      };
    }

    return {
      ...base,
      disabled: true,
      reason: "PT bận / đã có lịch",
    };
  });
};

export default function BookingDetailModal({ booking, onClose, onUpdated, initialShowFeedback = false }) {
  const [mode, setMode] = useState("detail");
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
    if (!booking?.id || !initialShowFeedback) return;
    if (String(booking?.ptMemberFeedback || "").trim()) {
      setMode("feedback");
    }
  }, [booking?.id, initialShowFeedback, booking?.ptMemberFeedback]);

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

        const availableDates = Array.isArray(data?.availableDates) ? data.availableDates : [];

        const nextDate =
          selectedDate && availableDates.some((it) => it.date === selectedDate)
            ? selectedDate
            : data?.selectedDate && availableDates.some((it) => it.date === data.selectedDate)
            ? data.selectedDate
            : availableDates?.[0]?.date || "";

        setSelectedDate(nextDate);

        const nextDisplaySlots = buildDisplaySlots(data);
        const firstAvailableSlot =
          nextDisplaySlots.find((it) => !it.disabled)?.startTime || "";

        setSelectedStartTime((prev) => {
          if (prev && nextDisplaySlots.some((it) => it.startTime === prev && !it.disabled)) {
            return prev;
          }
          return firstAvailableSlot;
        });
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
  }, [mode, booking, booking?.id, weekday, selectedDate]);

  const disp = useMemo(() => getMemberSessionDisplay(booking), [booking]);
  const rescheduleMeta = useMemo(() => getRescheduleMeta(booking), [booking]);
  const ptFeedbackText = useMemo(
    () => String(booking?.ptMemberFeedback || "").trim(),
    [booking?.ptMemberFeedback]
  );

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
    return Array.isArray(options?.availableDates) ? options.availableDates : [];
  }, [options]);

  const selectedDateMeta = useMemo(
    () => filteredAvailableDates.find((it) => it.date === selectedDate) || null,
    [filteredAvailableDates, selectedDate]
  );

  const displaySlots = useMemo(() => {
    if (!selectedDate) return [];
    return buildDisplaySlots(options);
  }, [options, selectedDate]);

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
    const selectedSlot = displaySlots.find((it) => it.startTime === selectedStartTime);

    if (!selectedDate || !selectedStartTime) {
      setError("Vui lòng chọn ngày và khung giờ mong muốn.");
      return;
    }

    if (!selectedSlot || selectedSlot.disabled) {
      setError("Khung giờ này hiện không thể chọn. Vui lòng chọn khung giờ khác.");
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
        className={`bd-modal ${
          mode === "request" ? "is-request-mode" : mode === "feedback" ? "is-feedback-mode" : "is-detail-mode"
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="bd-head">
          <div>
            <div className="bd-kicker">
              {mode === "request"
                ? "Reschedule request"
                : mode === "feedback"
                ? "PT feedback"
                : "Booking detail"}
            </div>
            <h3 className="bd-title">
              {mode === "request" ? "Yêu cầu đổi lịch" : mode === "feedback" ? "Nhận xét từ PT" : "Chi tiết buổi tập"}
            </h3>
            <p className="bd-sub">
              {mode === "request"
                ? "Chọn ngày và khung giờ phù hợp để gửi yêu cầu đổi lịch."
                : mode === "feedback"
                ? "Huấn luyện viên đã gửi nhận xét sau buổi tập này."
                : "Xem nhanh thông tin lịch tập và gửi yêu cầu đổi lịch ngay trong ứng dụng."}
            </p>
          </div>

          <button className="bd-x" onClick={onClose} type="button" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="bd-body">
          {mode === "feedback" ? (
            <div className="bd-feedbackPanel">
              <div className="bd-feedbackMeta">
                <span className="bd-feedbackMetaLabel">Buổi tập</span>
                <span className="bd-feedbackMetaValue">
                  {fmtDate(booking.bookingDate)} · {fmtTime(booking.startTime)} – {fmtTime(booking.endTime)}
                </span>
              </div>
              <div className="bd-feedbackMeta">
                <span className="bd-feedbackMetaLabel">PT</span>
                <span className="bd-feedbackMetaValue">{booking?.Trainer?.User?.username || "PT"}</span>
              </div>
              <div className="bd-feedbackBox">
                <div className="bd-feedbackBoxLabel">
                  <MessageSquare size={16} />
                  Nội dung nhận xét
                </div>
                <p className="bd-feedbackBoxText">{ptFeedbackText || "—"}</p>
              </div>
            </div>
          ) : mode === "detail" ? (
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

                {ptFeedbackText ? (
                  <button
                    type="button"
                    className="bd-feedbackCta"
                    onClick={() => setMode("feedback")}
                  >
                    <span className="bd-feedbackCtaLeft">
                      <MessageSquare size={18} />
                      <span>
                        <span className="bd-feedbackCtaTitle">Nhận xét từ PT</span>
                        <span className="bd-feedbackCtaSub">Nhấn để xem chi tiết</span>
                      </span>
                    </span>
                    <span className="bd-feedbackCtaChev" aria-hidden>
                      ›
                    </span>
                  </button>
                ) : null}
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

                <div className="bd-slotLegend">
                  <span className="bd-slotLegendItem">
                    <span className="bd-slotLegendDot bd-slotLegendDot--available" />
                    Có thể chọn
                  </span>
                  <span className="bd-slotLegendItem">
                    <span className="bd-slotLegendDot bd-slotLegendDot--busy" />
                    PT bận
                  </span>
                </div>

                <div className="bd-slotGrid">
                  {displaySlots.map((it) => (
                    <button
                      key={it.startTime}
                      type="button"
                      className={`bd-slotBtn ${selectedStartTime === it.startTime ? "active" : ""} ${
                        it.disabled ? "is-disabled" : ""
                      }`}
                      onClick={() => {
                        if (!it.disabled) setSelectedStartTime(it.startTime);
                      }}
                      disabled={loadingOptions || it.disabled}
                      title={it.disabled ? it.reason || "Không khả dụng" : ""}
                    >
                      <span className="bd-slotBtnMain">
                        {it.disabled ? <Lock size={12} /> : <Clock3 size={12} />}
                        <span>{it.label}</span>
                      </span>
                      {it.disabled && it.reason ? (
                        <span className="bd-slotBtnSub">{it.reason}</span>
                      ) : null}
                    </button>
                  ))}

                  {!loadingOptions && selectedDate && !displaySlots.length ? (
                    <div className="bd-emptyState">
                      Ngày này hiện chưa có dữ liệu khung giờ.
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

        <div
          className={`bd-actions ${
            mode === "feedback" ? "bd-actions--feedback" : "bd-actions--spread"
          }`}
        >
          {mode === "feedback" ? (
            <button className="bd-btn bd-btn--ghost" onClick={() => setMode("detail")} type="button">
              Quay lại chi tiết buổi tập
            </button>
          ) : mode === "detail" ? (
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