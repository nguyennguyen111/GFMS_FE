import React, { useMemo } from "react";
import "./DashboardHome.css";

export default function DashboardHome() {
  // initData (Giai đoạn 1)
  const kpis = useMemo(() => ([
    { label: "Tổng phòng gym", value: 12, note: "initData" },
    { label: "Tổng hội viên", value: 1280, note: "initData" },
    { label: "Tổng PT", value: 86, note: "initData" },
    { label: "Chia sẻ PT (tháng)", value: 142, note: "initData" },
    { label: "Doanh thu (tháng)", value: "320,000,000đ", note: "initData" }
  ]), []);

  const quick = useMemo(() => ([
    { title: "Nhượng quyền", desc: "Duyệt yêu cầu đối tác, tạo mới gym/chi nhánh (initData)" },
    { title: "Thiết bị", desc: "Quản lý danh mục, tồn kho, đơn mua, giao hàng (initData)" },
    { title: "Bảo trì", desc: "Duyệt yêu cầu, phân công kỹ thuật, theo dõi SLA (initData)" },
    { title: "Báo cáo", desc: "Lọc theo tháng/gym/PT, export CSV/PDF (initData)" }
  ]), []);

  return (
    <div className="dh-wrap">
      <div className="dh-head">
        <div>
          <h2 className="dh-title">Tổng quan hệ thống</h2>
          <div className="dh-sub">Giai đoạn 1: Dashboard + User CRUD (UC-USER-13..16)</div>
        </div>
      </div>

      <div className="dh-grid">
        {kpis.map((k, idx) => (
          <div className="dh-card" key={idx}>
            <div className="dh-card__label">{k.label}</div>
            <div className="dh-card__value">{k.value}</div>
            <div className="dh-card__note">{k.note}</div>
          </div>
        ))}
      </div>

      <div className="dh-panel">
        <div className="dh-panel__title">Quick Modules (initData)</div>
        <div className="dh-panel__grid">
          {quick.map((q, idx) => (
            <div className="dh-mini" key={idx}>
              <div className="dh-mini__t">{q.title}</div>
              <div className="dh-mini__d">{q.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
