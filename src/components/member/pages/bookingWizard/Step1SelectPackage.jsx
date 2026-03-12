import React from "react";
import "./bookingWizard.css";

export default function Step1SelectPackage({ packages = [], value, onPick, onNext }) {
  const formatVND = (n) => (n || 0).toLocaleString("vi-VN");

  return (
    <section className="bw-section">
      <header className="bw-sectionHeader">
        <p className="bw-hint">Chọn một gói để bắt đầu.</p>
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
                <div className="bw-cardTop">
                  <div className="bw-cardLeft">
                    <h3 className="bw-cardTitle">{p.name}</h3>
                    <p className="bw-cardDesc">{p.description || "—"}</p>
                  </div>

                  <div className="bw-cardRight">
                    <div className="bw-price">
                      {formatVND(Number(p.price || 0))} <span className="bw-priceUnit">VND</span>
                    </div>
                    {perSession && (
                      <div className="bw-perSession">
                        ≈ {formatVND(perSession)} / buổi
                      </div>
                    )}
                  </div>
                </div>

                <div className="bw-badges">
                  <span className="bw-badge">{p.sessions} buổi</span>
                  <span className="bw-badge">{p.durationDays} ngày</span>
                  {p.type && <span className="bw-badge bw-badgeSoft">{p.type}</span>}
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
          Tiếp tục
        </button>
      </div>
    </section>
  );
}