import React, { useMemo, useRef, useState } from "react";
import { memberPurchasePackage } from "../../../../services/memberPackageService";
import { memberCreateBooking, memberAutoBookWeeks } from "../../../../services/memberBookingService";
import { createPayosPayment } from "../../../../services/paymentService";
import "./bookingWizard.css";

const fmtVND = (n) => Number(n || 0).toLocaleString("vi-VN");
const slotLabel = (s) => (s ? `${s.start}–${s.end}` : "—");

function toJsDowPattern(pattern = []) {
  const arr = (pattern || []).map((x) => Number(x)).filter(Number.isFinite);
  if (!arr.length) return [];
  const isJs = arr.every((x) => x >= 0 && x <= 6);
  if (isJs) return arr;

  return arr
    .map((x) => {
      if (x === 8) return 0;
      if (x >= 2 && x <= 7) return x - 1;
      return null;
    })
    .filter((x) => x !== null);
}

function patternTextHuman(pattern = []) {
  return (pattern || []).join(", ");
}

function toLocalISODate(d) {
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD local
}

export default function Step5PreviewConfirm({
  gym,
  pkg,
  trainer,
  pattern,
  slot,
  startDate,
  repeatWeeks,
  setRepeatWeeks,
  onBack,
  onDone,
}) {
  const [showPreview, setShowPreview] = useState(true);
  const [payMethod, setPayMethod] = useState("payos");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);

  // chống double click tạo 2 lần
  const inFlightRef = useRef(false);

  const preview = useMemo(() => {
    const total = Number(pkg?.sessions || 0);
    if (!total || !slot || !startDate) return [];

    const jsPattern = toJsDowPattern(pattern);
    if (!jsPattern.length) return [];

    const out = [];
    let d = new Date(startDate + "T00:00:00");

    while (!jsPattern.includes(d.getDay())) d.setDate(d.getDate() + 1);

    while (out.length < total) {
      if (jsPattern.includes(d.getDay())) {
        out.push({
          idx: out.length + 1,
          dateISO: toLocalISODate(d),
          label: slotLabel(slot),
        });
      }
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [pkg?.sessions, pattern, slot, startDate]);

  const canSubmit = !!(pkg?.id && trainer?.id && (pattern?.length || 0) > 0 && slot?.start && startDate);

  const handleConfirm = async () => {
    if (!canSubmit || submitting) return;
    if (inFlightRef.current) return; // ✅ chặn double submit

    try {
      inFlightRef.current = true;
      setSubmitting(true);
      setErr("");
      setResult(null);

      // 0) ngày hợp lệ đầu tiên theo pattern
      const firstDate = preview?.[0]?.dateISO;
      if (!firstDate) throw new Error("Không tạo được lịch preview từ pattern/startDate.");

      // Nếu chọn PayOS thì tạo link thanh toán PayOS và redirect sang trang PayOS (hiển thị QR)
      if (payMethod === "payos") {
        const res = await createPayosPayment(pkg.id);
        const checkoutUrl =
          res?.data?.checkoutUrl ||
          res?.data?.data?.checkoutUrl;

        if (!checkoutUrl) {
          throw new Error("Không lấy được link thanh toán PayOS.");
        }

        window.location.href = checkoutUrl;
        return;
      }

      // 1) mua gói (các phương thức khác)
      const buyRes = await memberPurchasePackage(pkg.id, {
        paymentMethod: payMethod,
        gymId: gym?.id || pkg.gymId,
      });

      const activationId = buyRes?.data?.data?.activation?.id;
      if (!activationId) throw new Error("Không lấy được activationId.");

      // 2) tạo booking buổi đầu tiên
      await memberCreateBooking({
        activationId,
        trainerId: trainer.id,
        date: firstDate,
        startTime: `${slot.start}:00`,
      });

      // ✅ 3) Redirect NGAY LẬP TỨC (không chờ auto book) -> hết kẹt UI
      onDone?.();

      // ✅ 4) auto-book chạy nền, không block UI
      const jsPattern = toJsDowPattern(pattern);
      memberAutoBookWeeks({
        activationId,
        startDate: firstDate,
        trainerId: trainer.id, // ✅ ADD
        pattern: jsPattern.map((dow) => ({ dow, startTime: slot.start })),
        repeatWeeks,
      })
        .then((autoRes) => {
          const dt = autoRes?.data?.data || { createdCount: 0, skippedCount: 0 };
          setResult(dt);
        })
        .catch((e) => {
          // không chặn user, chỉ log / có thể show toast nếu bạn có
          console.error("AutoBookWeeks failed:", e);
        });
    } catch (e) {
      setErr(e.response?.data?.EM || e.response?.data?.message || e.message || "Xác nhận thất bại");
    } finally {
      setSubmitting(false);
      inFlightRef.current = false;
    }
  };

  return (
    <div className="bw-section">
      <div className="bw-topRow">
        <div>
          <p className="bw-note">Xác nhận thông tin đặt lịch</p>
          <h2 className="bw-h2">{pkg?.name || "—"}</h2>
        </div>

        <div className="bw-rightInfo">
          <div>
            <span className="bw-muted">PT:&nbsp;</span>
            <b>{trainer?.User?.username || "—"}</b>
          </div>
          <div>
            <span className="bw-muted">Gym:&nbsp;</span>
            <b>{gym?.name || "—"}</b>
          </div>
        </div>
      </div>

      <div className="bw-summaryCard">
        <div className="bw-summaryGrid">
          <div>
            <div className="bw-label">Lịch học</div>
            <ul className="bw-list">
              <li>Pattern: <b>{patternTextHuman(pattern)}</b></li>
              <li>Khung giờ: <b>{slotLabel(slot)}</b></li>
              <li>Ngày bắt đầu: <b>{startDate}</b></li>
              <li>Số buổi: <b>{pkg?.sessions}</b></li>
            </ul>
          </div>

          <div>
            <div className="bw-label">Chi phí dự kiến</div>
            <div className="bw-miniGrid">
              <div className="bw-miniBox">
                <div className="bw-miniLabel">Giá gói</div>
                <div className="bw-miniValue">{fmtVND(pkg?.price)} VND</div>
              </div>
              <div className="bw-miniBox">
                <div className="bw-miniLabel">Tổng tạm tính</div>
                <div className="bw-miniValue bw-miniValueAccent">{fmtVND(pkg?.price)} VND</div>
              </div>
            </div>
            <div className="bw-footnote">
              * Đây là ước tính phía client. Tổng tiền sẽ được xác nhận ở bước thanh toán.
            </div>
          </div>
        </div>
      </div>

      {err && <div className="bw-inlineError">{err}</div>}

      <div className="bw-actions bw-actionsBetween">
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="bw-btn bw-btnGhost"
          disabled={submitting}
        >
          {showPreview ? "Ẩn lịch dự kiến" : `Xem lịch dự kiến (${preview.length} buổi)`}
        </button>

        <div className="bw-actionsRightGroup">
          <button type="button" onClick={onBack} disabled={submitting} className="bw-btn bw-btnGhost">
            Quay lại
          </button>

          <select
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            className="bw-input bw-inputCompact"
            disabled={submitting}
          >
            <option value="payos">PayOS</option>
          </select>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit || submitting}
            className="bw-btn bw-btnPrimary"
          >
            {submitting ? "Đang xử lý..." : "Tiếp tục thanh toán"}
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="bw-previewGrid">
          {preview.map((it) => (
            <div key={it.idx} className="bw-previewItem">
              <div className="bw-smallMuted">
                #{it.idx} •{" "}
                {new Date(it.dateISO + "T00:00:00").toLocaleDateString("vi-VN", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                })}
              </div>
              <div className="bw-previewTitle">{it.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* result có thể hiện nếu user chưa bị navigate đi (tuỳ router), vẫn để đây */}
      {result && (
        <div className="bw-resultBox">
          <div className="bw-resultTitle">✅ Hoàn tất</div>
          <div className="bw-resultDesc">
            Đã tạo: <b>{result.createdCount ?? 0}</b> • Bỏ qua: <b>{result.skippedCount ?? 0}</b>
          </div>
        </div>
      )}
    </div>
  );
}