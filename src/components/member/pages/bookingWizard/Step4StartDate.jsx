import React, { useMemo } from "react";
import "./bookingWizard.css";

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bw-chip ${active ? "isActive" : ""}`}
    >
      {children}
    </button>
  );
}

const next3 = (pattern, from = new Date()) => {
  const out = [];
  const base = new Date(from);
  base.setHours(0, 0, 0, 0);
  let d = new Date(base);

  while (out.length < 3) {
    d.setDate(d.getDate() + 1);
    if (pattern.includes(d.getDay())) out.push(d.toLocaleDateString("en-CA"));
  }
  return out;
};

export default function Step4StartDate({ pattern = [], value, onPick, onBack, onNext }) {
  const options = useMemo(() => next3(pattern || []), [pattern]);
  const canNext = !!value;

  return (
    <div className="bw-section">
      <div className="bw-hint">Chọn ngày bắt đầu.</div>

      <div className="bw-chipRow" style={{ marginTop: 8 }}>
        {options.map((d) => (
          <Chip key={d} active={value === d} onClick={() => onPick?.(d)}>
            {new Date(d).toLocaleDateString("vi-VN", {
              weekday: "short",
              day: "2-digit",
              month: "2-digit",
            })}
          </Chip>
        ))}
      </div>

      <div className="bw-actions bw-actionsBetween" style={{ marginTop: 12 }}>
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