import React from "react";
import { X, AlertCircle, CheckCircle2, HelpCircle, Info } from "lucide-react";
import "./OwnerConfirmDialog.css";

function panelClass(tone) {
  if (tone === "success") return "ocd-panel ocd-panel--success";
  if (tone === "error") return "ocd-panel ocd-panel--error";
  if (tone === "warning") return "ocd-panel ocd-panel--warning";
  return "ocd-panel";
}

function IconFor({ tone, kind }) {
  if (tone === "success") return <CheckCircle2 size={26} strokeWidth={2.2} />;
  if (tone === "error") return <AlertCircle size={26} strokeWidth={2.2} />;
  if (tone === "warning") return <AlertCircle size={26} strokeWidth={2.2} />;
  if (kind === "confirm") return <HelpCircle size={26} strokeWidth={2.2} />;
  return <Info size={26} strokeWidth={2.2} />;
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {{ kind: 'alert'|'confirm', tone?: string, title: string, message: string, stats?: {label:string, value:string}[] } | null} props.state
 * @param {boolean} props.busy
 * @param {() => void} props.onClose
 * @param {() => void} props.onConfirm — chỉ khi kind === 'confirm'
 */
export default function OwnerConfirmDialog({ open, state, busy, onClose, onConfirm }) {
  if (!open || !state) return null;

  const isConfirm = state.kind === "confirm";
  const tone = state.tone || "neutral";
  const isCompactConfirm = isConfirm && ["payTrainer", "closePeriod", "payPeriod"].includes(String(state.action || ""));

  return (
    <div className="ocd-overlay" role="presentation" onClick={busy ? undefined : onClose}>
      <div
        className={`${panelClass(tone)}${isCompactConfirm ? " ocd-panel--compact" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ocd-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ocd-head">
          <div className="ocd-iconWrap" aria-hidden>
            <IconFor tone={tone} kind={state.kind} />
          </div>
          <div className="ocd-headText">
            <h2 id="ocd-title" className="ocd-title">
              {state.title}
            </h2>
          </div>
          <button
            type="button"
            className="ocd-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <div className="ocd-divider" />

        <div className="ocd-body">
          <p className="ocd-message">{state.message}</p>

          {state.meta && (state.meta.gymName || state.meta.periodLabel) && (
            <div className="ocd-meta">
              {state.meta.gymName ? (
                <div className="ocd-meta-row">
                  <span className="ocd-meta-k">Phòng gym</span>
                  <span className="ocd-meta-v">{state.meta.gymName}</span>
                </div>
              ) : null}
              {state.meta.periodLabel ? (
                <div className="ocd-meta-row">
                  <span className="ocd-meta-k">{state.meta.periodCaption || "Khoảng chốt"}</span>
                  <span className="ocd-meta-v">{state.meta.periodLabel}</span>
                </div>
              ) : null}
            </div>
          )}

          {Array.isArray(state.trainerBreakdown) && state.trainerBreakdown.length > 0 && (
            <div className="ocd-trainer-block">
              <div className="ocd-trainer-block-title">
                {state.trainerListTitle || "Huấn luyện viên trong kỳ"} ({state.trainerBreakdown.length})
              </div>
              <ul className="ocd-trainer-list">
                {state.trainerBreakdown.map((t) => (
                  <li key={t.trainerId} className="ocd-trainer-item">
                    <div className="ocd-trainer-main">
                      <span className="ocd-trainer-name">{t.username}</span>
                      {t.idLabel ? <span className="ocd-trainer-id">{t.idLabel}</span> : null}
                      {t.email ? <span className="ocd-trainer-email">{t.email}</span> : null}
                    </div>
                    <div className="ocd-trainer-nums">
                      <span>{t.sessions} buổi</span>
                      <span className="ocd-trainer-amt">{t.amountLabel}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(state.stats) && state.stats.length > 0 && (
            <div className="ocd-stats">
              {state.stats.map((s) => (
                <div key={s.label} className="ocd-stat">
                  <span className="ocd-stat-label">{s.label}</span>
                  <span className="ocd-stat-value">{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ocd-foot">
          {isConfirm ? (
            <>
              <button
                type="button"
                className="ocd-btn ocd-btn--ghost"
                onClick={onClose}
                disabled={busy}
              >
                Hủy
              </button>
              <button
                type="button"
                className="ocd-btn ocd-btn--primary"
                onClick={onConfirm}
                disabled={busy}
              >
                {busy ? "Đang xử lý…" : "Xác nhận"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`ocd-btn ${tone === "success" ? "ocd-btn--success" : "ocd-btn--primary"}`}
              onClick={onClose}
            >
              Đã hiểu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
