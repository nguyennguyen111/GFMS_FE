import React from "react";
import { MessageSquareQuote, Star } from "lucide-react";
import "./PublicFeedbackSection.css";

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
};

const getContextLine = (item) => {
  const parts = [];
  if (item?.subjectName) parts.push(item.subjectName);
  if (item?.sessionLabel) parts.push(item.sessionLabel);
  if (item?.reviewTypeLabel) parts.push(item.reviewTypeLabel);
  return parts.filter(Boolean).join(" • ");
};

export default function PublicFeedbackSection({ title = "Phản hồi", subtitle, items = [], compact = false, className = "" }) {
  return (
    <section className={`pf-section ${compact ? "compact" : ""} ${className}`.trim()}>
      <div className="pf-head">
        <div>
          <span className="pf-kicker">FEEDBACK THỰC TẾ</span>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>

      {items.length ? (
        <div className="pf-grid">
          {items.map((item) => (
            <article className="pf-card" key={`${item.reviewType || "x"}-${item.id}`}>
              <div className="pf-cardTop">
                <span className="pf-icon"><MessageSquareQuote size={18} /></span>
                <span className="pf-rating"><Star size={14} /> {Number(item.rating || 0).toFixed(1)}</span>
              </div>

              {getContextLine(item) ? <div className="pf-context">{getContextLine(item)}</div> : null}

              <p className="pf-comment">“{item.comment}”</p>

              <div className="pf-meta">
                <div className="pf-metaLeft">
                  <strong>{item.memberName || "Thành viên GFMS"}</strong>
                  {item.memberSubtitle ? <span>{item.memberSubtitle}</span> : null}
                </div>
                <span>{formatDate(item.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="pf-empty">Chưa có feedback phù hợp để hiển thị.</div>
      )}
    </section>
  );
}
