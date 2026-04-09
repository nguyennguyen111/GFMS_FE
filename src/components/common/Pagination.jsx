import React from "react";
import "./Pagination.css";

export default function Pagination({ page = 1, totalPages = 1, onChange }) {
  if (totalPages <= 1) return null;

  const current = Math.max(1, Number(page) || 1);
  const total = Math.max(1, Number(totalPages) || 1);
  const pages = [];
  for (let i = 1; i <= total; i += 1) pages.push(i);

  return (
    <div className="gf-pagination">
      <button type="button" disabled={current <= 1} onClick={() => onChange(current - 1)}>
        Trước
      </button>
      <div className="gf-pagination-pages">
        {pages.map((item) => (
          <button
            type="button"
            key={item}
            className={item === current ? "active" : ""}
            onClick={() => onChange(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <button type="button" disabled={current >= total} onClick={() => onChange(current + 1)}>
        Sau
      </button>
    </div>
  );
}
