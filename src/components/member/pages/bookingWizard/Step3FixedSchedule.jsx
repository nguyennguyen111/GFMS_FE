import React, { useMemo } from "react";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import "./bookingWizard.css";

const DOW = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bw-patternCard ${active ? "isActive" : ""}`}
    >
      <div className="bw-patternCardIcon">
        <CalendarDays size={18} />
      </div>
      <div className="bw-patternCardContent">
        <div className="bw-patternCardLabel">Lịch cố định</div>
        <div className="bw-patternCardValue">{children}</div>
      </div>
    </button>
  );
}

export default function Step3FixedSchedule({
  pattern,
  setPattern,
  onBack,
  onNext,
}) {
  const patterns = useMemo(
    () => [
      [1, 3, 5],
      [2, 4, 6],
    ],
    []
  );

  const patternKey = useMemo(() => (pattern || []).join(","), [pattern]);
  const canNext = !!patternKey;

  return (
    <div className="bw-section">
      <header className="bw-sectionHeader">
        <span className="bw-sectionTag">Bước 3</span>
        <h2 className="bw-sectionTitle">Chọn lịch tập cố định</h2>
        <p className="bw-hint">
          Chọn pattern ngày trong tuần. Khung giờ hợp lệ sẽ được kiểm tra ở bước xác nhận.
        </p>
      </header>

      <div className="bw-patternGrid">
        {patterns.map((arr, i) => {
          const active = patternKey === arr.join(",");
          return (
            <Chip key={i} active={active} onClick={() => setPattern(arr)}>
              {arr.map((d) => DOW[d]).join(" • ")}
            </Chip>
          );
        })}
      </div>

      <div className="bw-infoPanel">
        Sau khi chọn ngày bắt đầu, hệ thống sẽ tự lọc ra các khung giờ thật sự hợp lệ
        cho toàn bộ chuỗi buổi tập của bạn.
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