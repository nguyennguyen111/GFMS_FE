import React from "react";
import "./bookingWizard.css";

export default function Step2PickTrainer({ trainers = [], value, onPick, onBack, onNext }) {
  const hasData = Array.isArray(trainers) && trainers.length > 0;

  return (
    <section className="bw-section">
      <header className="bw-sectionHeader">
        <p className="bw-hint">Chọn PT phù hợp nhất với gói của bạn.</p>
        <p className="bw-note">Gợi ý: ưu tiên PT đúng chuyên môn và rating cao.</p>
      </header>

      {hasData ? (
        <div className="bw-grid2">
          {trainers.map((t) => {
            const active = value === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onPick?.(t)}
                className={`bw-trainerCard ${active ? "isActive" : ""}`}
              >
                <div className="bw-cardTop">
                  <div className="bw-cardLeft">
                    <div className="bw-cardTitle">{t.User?.username || "PT"}</div>
                    <div className="bw-cardDesc">{t.specialization || "Personal Trainer"}</div>
                  </div>

                  <div className="bw-cardRight">
                    <div className="bw-rating">⭐ {Number(t.rating || 0).toFixed(1)}</div>
                    <div className="bw-smallMuted">{t.totalSessions || 0} buổi</div>
                  </div>
                </div>

                {active && <div className="bw-activeBar" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bw-emptyBox">Không có PT phù hợp trong gym này.</div>
      )}

      <div className="bw-actions bw-actionsBetween">
        <button type="button" onClick={onBack} className="bw-btn bw-btnGhost">
          Quay lại
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!value}
          className="bw-btn bw-btnPrimary"
        >
          Tiếp tục
        </button>
      </div>
    </section>
  );
}