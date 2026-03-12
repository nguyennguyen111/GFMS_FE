import React, { useEffect, useMemo, useState } from "react";
import { mpGetSlotsPublic } from "../../../../services/marketplaceService";
import "./bookingWizard.css";

const DOW = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function Chip({ active, disabled, onClick, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`bw-chip ${active ? "isActive" : ""} ${disabled ? "isDisabled" : ""}`}
    >
      {children}
    </button>
  );
}

export default function Step3FixedSchedule({
  pkg,
  trainer,
  pattern,
  setPattern,
  slot,
  setSlot,
  onBack,
  onNext,
}) {
  const [loading, setLoading] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [err, setErr] = useState("");

  // 2 pattern như bạn đang dùng
  const patterns = useMemo(
    () => [
      [1, 3, 5], // T2 T4 T6
      [2, 4, 6], // T3 T5 T7
    ],
    []
  );

  useEffect(() => {
    setBlocks([]);
    setErr("");
    setSlot(null);

    if (!trainer?.id || !pkg?.id) return;

    (async () => {
      try {
        setLoading(true);
        const res = await mpGetSlotsPublic({
          trainerId: trainer.id,
          packageId: pkg.id,
          // ✅ không gửi date nữa
        });
        setBlocks(res.data?.DT || []);
      } catch (e) {
        setErr(e.response?.data?.EM || e.response?.data?.message || "Không tải được khung giờ");
      } finally {
        setLoading(false);
      }
    })();
  }, [trainer?.id, pkg?.id, setSlot]);

  const canNext = pattern?.length && slot;

  return (
    <div className="bw-section">
      <div className="bw-hint">Chọn pattern & khung giờ cố định.</div>

      <div className="bw-label">Pattern</div>
      <div className="bw-chipRow">
        {patterns.map((arr, i) => {
          const active = (pattern || []).join(",") === arr.join(",");
          return (
            <Chip key={i} active={active} onClick={() => setPattern(arr)}>
              {arr.map((d) => DOW[d]).join(" • ")}
            </Chip>
          );
        })}
      </div>

      <div className="bw-label" style={{ marginTop: 10 }}>
        Khung giờ
      </div>

      {loading ? (
        <div className="bw-smallMuted">Đang tải…</div>
      ) : err ? (
        <div className="bw-inlineError">{err}</div>
      ) : (
        <div className="bw-chipRow" style={{ marginTop: 6 }}>
          {blocks.map((b) => {
            const active = slot?.start === b.start && slot?.end === b.end;
            return (
              <Chip
                key={`${b.start}-${b.end}`}
                active={active}
                disabled={!b.ok}
                onClick={() => b.ok && setSlot({ start: b.start, end: b.end })}
              >
                {b.start}–{b.end}
              </Chip>
            );
          })}
          {!blocks.length && (
            <div className="bw-inlineWarn">Không có khung giờ khả dụng.</div>
          )}
        </div>
      )}

      <div className="bw-actions bw-actionsBetween" style={{ marginTop: 14 }}>
        <button type="button" onClick={onBack} className="bw-btn bw-btnGhost">
          Quay lại
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="bw-btn bw-btnPrimary"
        >
          Tiếp tục
        </button>
      </div>
    </div>
  );
}