import React from "react";
import { ArrowRight, CalendarRange, Layers3, WalletCards } from "lucide-react";
import "./bookingWizard.css";

export default function Step1SelectPackage({ packages = [], value, onPick, onNext }) {
  const formatVND = (n) => (n || 0).toLocaleString("vi-VN");

  return (
    <section className="bw-section">
      <header className="bw-sectionHeader">
        <span className="bw-sectionTag">Bước 1</span>
        <h2 className="bw-sectionTitle">Chọn gói tập phù hợp</h2>
        <p className="bw-hint">
          Chọn một gói để bắt đầu. Hệ thống sẽ lọc PT và lịch phù hợp ở các bước tiếp theo.
        </p>
      </header>

      {packages.length ? (
        <div className="bw-grid2">
          {packages.map((p) => {
            const active = value === p.id;
            const perSession =
              p?.price && p?.sessions ? Math.round(p.price / p.sessions) : null;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick?.(p)}
                className={`bw-pkgCard ${active ? "isActive" : ""}`}
              >
                <div className="bw-cardGlow" />
                <div className="bw-cardTop">
                  <div className="bw-cardLeft">
                    <div className="bw-cardBadge">
                      {p.type || "Gói tập"}
                    </div>
                    <h3 className="bw-cardTitle">{p.name}</h3>
                    <p className="bw-cardDesc">{p.description || "Chưa có mô tả cho gói này."}</p>
                  </div>

                  <div className="bw-cardRight">
                    <div className="bw-priceWrap">
                      <div className="bw-price">
                        {formatVND(Number(p.price || 0))}
                      </div>
                      <div className="bw-priceUnit">VND</div>
                    </div>

                    {perSession && (
                      <div className="bw-perSession">
                        ≈ {formatVND(perSession)} / buổi
                      </div>
                    )}
                  </div>
                </div>

                <div className="bw-featureRow">
                  <span className="bw-featurePill">
                    <WalletCards size={14} />
                    {formatVND(Number(p.price || 0))} đ
                  </span>
                  <span className="bw-featurePill">
                    <Layers3 size={14} />
                    {p.sessions} buổi
                  </span>
                  <span className="bw-featurePill">
                    <CalendarRange size={14} />
                    {p.durationDays} ngày
                  </span>
                </div>

                {active && <div className="bw-activeBar" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bw-emptyBox">Chưa có gói nào cho gym này.</div>
      )}

      <div className="bw-actions bw-actionsRight">
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