import React, { useMemo } from "react";
import { ArrowLeft, ArrowRight, CalendarCheck2 } from "lucide-react";
import "./bookingWizard.css";

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bw-dateCard ${active ? "isActive" : ""}`}
    >
      <div className="bw-dateCardIcon">
        <CalendarCheck2 size={18} />
      </div>
      <div className="bw-dateCardContent">{children}</div>
    </button>
  );
}

const toISO = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const next3DatesByPattern = (pattern, from = new Date()) => {
  const out = [];
  const base = new Date(from);
  base.setHours(0, 0, 0, 0);

  const d = new Date(base);
  let safe = 0;

  while (out.length < 3 && safe < 60) {
    safe += 1;
    if (pattern.includes(d.getDay())) {
      out.push(toISO(d));
    }
    d.setDate(d.getDate() + 1);
  }

  return out;
};

const formatVN = (iso) => {
  const dt = new Date(`${iso}T00:00:00`);
  return dt.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
};

export default function Step4StartDate({
  pattern = [],
  value,
  onPick,
  onBack,
  onNext,
}) {
  const options = useMemo(() => next3DatesByPattern(pattern || []), [pattern]);
  const canNext = !!value;

  return (
    <div className="bw-section">
      <header className="bw-sectionHeader">
        <span className="bw-sectionTag">Bước 4</span>
        <h2 className="bw-sectionTitle">Chọn ngày bắt đầu</h2>
        <p className="bw-hint">
          Chỉ hiển thị 3 ngày phù hợp gần nhất để bạn chọn nhanh hơn.
        </p>
      </header>

      <div className="bw-dateGrid">
        {options.map((d) => (
          <Chip key={d} active={value === d} onClick={() => onPick?.(d)}>
            {formatVN(d)}
          </Chip>
        ))}
      </div>

      <div className="bw-infoPanel">
        Ngày bắt đầu phải khớp với pattern bạn đã chọn để hệ thống xây được lịch cố định chuẩn.
      </div>

      <div className="bw-actions bw-actionsBetween">
        <button type="button" onClick={onBack} className="bw-btn bw-btnGhost">
          <ArrowLeft size={16} />
          <span>Quay lại</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="bw-btn bw-btnPrimary"
        >
          <span>Tiếp tục</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}