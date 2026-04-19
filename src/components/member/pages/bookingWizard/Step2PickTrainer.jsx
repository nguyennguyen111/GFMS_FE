import React from "react";
import { ArrowLeft, ArrowRight, Dumbbell, Star, UserRound } from "lucide-react";
import "./bookingWizard.css";

export default function Step2PickTrainer({ trainers = [], value, onPick, onBack, onNext }) {
  const hasData = Array.isArray(trainers) && trainers.length > 0;

  return (
    <section className="bw-section">
      <header className="bw-sectionHeader">
        <span className="bw-sectionTag">Bước 2</span>
        <h2 className="bw-sectionTitle">Chọn huấn luyện viên</h2>
        <p className="bw-hint">
          Chọn PT phù hợp nhất với gói tập và mục tiêu của bạn.
        </p>
        <p className="bw-note">
          Gợi ý: ưu tiên PT đúng chuyên môn, nhiều buổi đã dạy và rating tốt.
        </p>
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
                <div className="bw-cardGlow" />

                <div className="bw-cardTop">
                  <div className="bw-cardLeft">
                    <div className="bw-avatarCircle">
                      <UserRound size={18} />
                    </div>

                    <div>
                      <h3 className="bw-cardTitle">
                        {t.User?.username || "PT"}
                      </h3>
                      <p className="bw-cardDesc">
                        {t.specialization || "Personal Trainer"}
                      </p>
                    </div>
                  </div>

                  <div className="bw-ratingBox">
                    <Star size={14} />
                    <span>{Number(t.rating || 0).toFixed(1)}</span>
                  </div>
                </div>

                <div className="bw-featureRow">
                  <span className="bw-featurePill bw-featurePill--soft">
                    Chuyên môn: {t.specialization || "PT"}
                  </span>
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
          <ArrowLeft size={16} />
          <span>Quay lại</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!value}
          className="bw-btn bw-btnPrimary"
        >
          <span>Tiếp tục</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}