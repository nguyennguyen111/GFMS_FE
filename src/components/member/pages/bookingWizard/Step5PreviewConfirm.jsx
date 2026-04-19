import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Dumbbell,
  MapPin,
  UserRound,
  Lock,
} from "lucide-react";
import {
  memberConfirmFixedPlan,
  memberGetFixedPlanOptions,
} from "../../../../services/memberBookingService";
import "./bookingWizard.css";

const fmtVND = (n) => Number(n || 0).toLocaleString("vi-VN");

const DOW_LABEL = {
  0: "CN",
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
};

const DEFAULT_TIME_SLOTS = [
  { start: "08:00", end: "09:00" },
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" },
  { start: "12:00", end: "13:00" },
  { start: "13:00", end: "14:00" },
  { start: "14:00", end: "15:00" },
  { start: "15:00", end: "16:00" },
  { start: "16:00", end: "17:00" },
  { start: "17:00", end: "18:00" },
  { start: "18:00", end: "19:00" },
  { start: "19:00", end: "20:00" },
  { start: "20:00", end: "21:00" },
  { start: "21:00", end: "22:00" },
  { start: "22:00", end: "23:00" },
];

function Chip({ active, disabled, note, onClick, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={disabled ? note || "Khung giờ này hiện không khả dụng" : ""}
      className={[
        "bw-chip",
        active ? "isActive" : "",
        disabled ? "isDisabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {disabled ? <Lock size={13} /> : <Clock3 size={14} />}
      <span>{children}</span>
      {disabled && note ? <small className="bw-chipNote">{note}</small> : null}
    </button>
  );
}

function patternTextHuman(pattern = []) {
  return (pattern || []).map((d) => DOW_LABEL[d]).join(", ");
}

function toLocalISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatPreviewDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return `${DOW_LABEL[d.getDay()]}, ${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}`;
}

function buildPreviewSessions({ startDate, pattern = [], totalSessions = 0, slot }) {
  if (!startDate || !slot?.start || !slot?.end || totalSessions <= 0) return [];
  if (!Array.isArray(pattern) || !pattern.length) return [];

  const out = [];
  const d = new Date(`${startDate}T00:00:00`);
  let safe = 0;

  while (out.length < totalSessions && safe < 500) {
    safe += 1;

    if (pattern.includes(d.getDay())) {
      out.push({
        idx: out.length + 1,
        dateISO: toLocalISODate(d),
        label: `${slot.start}–${slot.end}`,
      });
    }

    d.setDate(d.getDate() + 1);
  }

  return out;
}

function normalizeSlotAvailability(rawSlot = {}) {
  const unavailable =
    rawSlot?.isAvailable === false ||
    rawSlot?.available === false ||
    rawSlot?.disabled === true ||
    rawSlot?.status === "busy" ||
    rawSlot?.status === "unavailable" ||
    rawSlot?.status === "occupied";

  return {
    ...rawSlot,
    start: rawSlot?.start || "",
    end: rawSlot?.end || "",
    disabled: unavailable,
    note:
      rawSlot?.note ||
      rawSlot?.reason ||
      rawSlot?.message ||
      (unavailable ? "PT bận / không thể nhận lịch này" : ""),
  };
}

function mergeSlots(slotCatalog = [], apiSlots = []) {
  const catalog =
    Array.isArray(slotCatalog) && slotCatalog.length ? slotCatalog : DEFAULT_TIME_SLOTS;

  const byKey = new Map(
    (apiSlots || []).map((s) => {
      const normalized = normalizeSlotAvailability(s);
      return [`${normalized.start}-${normalized.end}`, normalized];
    })
  );

  return catalog.map((base) => {
    const key = `${base.start}-${base.end}`;
    const matched = byKey.get(key);

    if (matched) return matched;

    return {
      ...base,
      disabled: true,
    };
  });
}

export default function Step5PreviewConfirm({
  gym,
  pkg,
  trainer,
  pattern,
  startDate,
  onBack,
  onDone,
}) {
  const [payMethod, setPayMethod] = useState("payos");
  const [submitting, setSubmitting] = useState(false);

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsErr, setOptionsErr] = useState("");
  const [options, setOptions] = useState(null);

  const [slot, setSlot] = useState(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  const totalSessions = Number(pkg?.sessions || pkg?.totalSessions || 0) || 0;
  const patternKey = useMemo(
    () => (Array.isArray(pattern) ? pattern.join(",") : ""),
    [pattern]
  );

  useEffect(() => {
    let active = true;

    if (!pkg?.id || !trainer?.id || !startDate || !patternKey) {
      setOptions(null);
      setSlot(null);
      return () => {
        active = false;
      };
    }

    (async () => {
      try {
        setLoadingOptions(true);
        setOptionsErr("");
        setOptions(null);
        setSlot(null);
        setConfirmDuplicate(false);

        const res = await memberGetFixedPlanOptions({
          packageId: pkg.id,
          trainerId: trainer.id,
          pattern,
          startDate,
        });

        if (!active) return;

        const data = res?.data?.data || null;
        setOptions(data);

        const mergedSlots = mergeSlots(data?.slotCatalog, data?.slots);
        const firstAvailableSlot = mergedSlots.find((s) => !s.disabled) || null;

        setSlot(firstAvailableSlot);
      } catch (e) {
        if (!active) return;

        setOptionsErr(
          e?.response?.data?.message ||
            e?.response?.data?.EM ||
            e?.message ||
            "Không thể kiểm tra lịch hợp lệ"
        );
      } finally {
        if (active) setLoadingOptions(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [pkg?.id, trainer?.id, startDate, patternKey, pattern]);

  const preview = useMemo(() => {
    return buildPreviewSessions({
      startDate,
      pattern,
      totalSessions,
      slot,
    });
  }, [startDate, pattern, totalSessions, slot]);

  const duplicateWarning = options?.warning || null;

  const slots = useMemo(() => {
    return mergeSlots(options?.slotCatalog, options?.slots);
  }, [options]);

  const canSubmit = !!(
    pkg?.id &&
    trainer?.id &&
    startDate &&
    patternKey &&
    slot?.start &&
    slot?.end &&
    !slot?.disabled &&
    preview.length > 0 &&
    (!duplicateWarning?.hasActiveSamePackage || confirmDuplicate)
  );

  const handleConfirm = async () => {
    if (!canSubmit || submitting) return;

    try {
      setSubmitting(true);
      setOptionsErr("");

      const res = await memberConfirmFixedPlan({
        packageId: pkg.id,
        trainerId: trainer.id,
        pattern,
        startDate,
        startTime: slot.start,
        paymentMethod: payMethod,
        confirmDuplicate: !!confirmDuplicate,
      });

      const data = res?.data?.data || null;
      if (data?.paymentProvider === "payos" && data?.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

      onDone?.(data);
    } catch (e) {
      setOptionsErr(
        e?.response?.data?.message ||
          e?.response?.data?.EM ||
          e?.message ||
          "Xác nhận thất bại"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bw-section">
      <header className="bw-sectionHeader">
        <span className="bw-sectionTag">Bước 5</span>
        <h2 className="bw-sectionTitle">Xác nhận đặt lịch</h2>
        <p className="bw-hint">
          Kiểm tra lại thông tin gói tập, PT, lịch học và thanh toán trước khi hoàn tất.
        </p>
      </header>

      <div className="bw-summaryHero">
        <div className="bw-summaryHeroLeft">
          <div className="bw-summaryHeroKicker">Gói đã chọn</div>
          <h3 className="bw-summaryHeroTitle">{pkg?.name || "—"}</h3>
        </div>

        <div className="bw-summaryHeroRight">
          <div className="bw-summaryBadge">
            <UserRound size={15} />
            {trainer?.User?.username || trainer?.username || "—"}
          </div>
          <div className="bw-summaryBadge">
            <MapPin size={15} />
            {gym?.name || pkg?.Gym?.name || "—"}
          </div>
        </div>
      </div>

      <div className="bw-summaryCard">
        <div className="bw-summaryGrid">
          <div className="bw-summaryBlock">
            <div className="bw-label">Thông tin lịch tập</div>

            <div className="bw-detailList">
              <div className="bw-detailRow">
                <CalendarDays size={15} />
                <span>Pattern:</span>
                <b>{patternTextHuman(pattern) || "—"}</b>
              </div>

              <div className="bw-detailRow">
                <CheckCircle2 size={15} />
                <span>Ngày bắt đầu:</span>
                <b>{startDate || "—"}</b>
              </div>

              <div className="bw-detailRow">
                <Dumbbell size={15} />
                <span>Số buổi:</span>
                <b>{totalSessions}</b>
              </div>

              <div className="bw-detailRow">
                <UserRound size={15} />
                <span>PT:</span>
                <b>{trainer?.User?.username || trainer?.username || "—"}</b>
              </div>
            </div>
          </div>

          <div className="bw-summaryBlock">
            <div className="bw-label">Chi phí dự kiến</div>

            <div className="bw-miniGrid">
              <div className="bw-miniBox">
                <div className="bw-miniLabel">Giá gói</div>
                <div className="bw-miniValue">{fmtVND(pkg?.price)} VND</div>
              </div>

              <div className="bw-miniBox">
                <div className="bw-miniLabel">Tổng tạm tính</div>
                <div className="bw-miniValue bw-miniValueAccent">
                  {fmtVND(pkg?.price)} VND
                </div>
              </div>
            </div>

            <div className="bw-footnote">
              Hệ thống sẽ kiểm tra toàn bộ chuỗi lịch trước khi cho phép bạn hoàn tất đặt lịch.
            </div>
          </div>
        </div>
      </div>

      {duplicateWarning?.hasActiveSamePackage && (
        <div className="bw-alert bw-alertWarn">
          Bạn đang có cùng gói này còn <b>{duplicateWarning.remainingSessions}</b> buổi chưa dùng.
          Nếu vẫn muốn mua thêm, hãy xác nhận bên dưới.
        </div>
      )}

      {loadingOptions ? (
        <div className="bw-loadingBox">Đang kiểm tra toàn bộ lịch hợp lệ…</div>
      ) : optionsErr ? (
        <div className="bw-alert bw-alertError">{optionsErr}</div>
      ) : (
        <>
          <div className="bw-blockTitle" style={{ marginTop: 8 }}>
            Chọn khung giờ hợp lệ
          </div>

          <div className="bw-chipRow bw-chipRowSlots" style={{ marginTop: 10 }}>
            {slots.map((s) => {
              const active = slot?.start === s.start && slot?.end === s.end;
              const disabled = !!s.disabled;

              return (
                <Chip
                  key={`${s.start}-${s.end}`}
                  active={active}
                  disabled={disabled}
                  note={s.note}
                  onClick={() => {
                    if (!disabled) setSlot(s);
                  }}
                >
                  {s.start}–{s.end}
                </Chip>
              );
            })}

            {!slots.length && (
              <div className="bw-alert bw-alertWarn">
                Không có dữ liệu khung giờ để hiển thị. Hãy quay lại chọn ngày bắt đầu hoặc pattern khác.
              </div>
            )}
          </div>

          {!!slots.length && (
            <div className="bw-slotLegend">
              <span className="bw-slotLegendItem">
                <span className="bw-slotLegendDot bw-slotLegendDot--available" />
                Có thể chọn
              </span>
              <span className="bw-slotLegendItem">
                <span className="bw-slotLegendDot bw-slotLegendDot--busy" />
                PT bận / không khả dụng
              </span>
            </div>
          )}
        </>
      )}

      {duplicateWarning?.hasActiveSamePackage && (
        <label className="bw-checkRow" style={{ marginTop: 16 }}>
          <input
            type="checkbox"
            checked={confirmDuplicate}
            onChange={(e) => setConfirmDuplicate(e.target.checked)}
          />
          <span>
            Tôi hiểu rằng mình đang còn gói này chưa dùng hết và vẫn muốn mua thêm.
          </span>
        </label>
      )}

      <div className="bw-confirmBar">
        <div className="bw-paymentSelectWrap">
          <div className="bw-paymentLabel">
            <CreditCard size={16} />
            <span>Phương thức thanh toán</span>
          </div>

          <select
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            className="bw-input bw-inputCompact"
            disabled={submitting}
          >
            <option value="payos">PayOS</option>
          </select>
        </div>

        <div className="bw-actionsRightGroup">
          <button type="button" onClick={onBack} className="bw-btn bw-btnGhost">
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit || submitting || loadingOptions}
            className="bw-btn bw-btnPrimary"
          >
            {submitting ? "Đang xử lý..." : "Hoàn tất đặt lịch"}
          </button>
        </div>
      </div>

      {!!slot && !slot.disabled && !!preview.length && (
        <>
          <div className="bw-blockTitle">Lịch dự kiến</div>

          <div className="bw-previewGrid">
            {preview.map((it) => (
              <div key={it.idx} className="bw-previewItem">
                <div className="bw-previewMeta">
                  <span>#{it.idx}</span>
                  <span>{formatPreviewDate(it.dateISO)}</span>
                </div>
                <div className="bw-previewTitle">{it.label}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}