import React, { useEffect, useMemo, useState } from "react";
import "./DashboardHome.css";
import { admGetDashboardOverview } from "../../../services/adminAdminCoreService";

const fmtMoney = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString("vi-VN") + "đ";
};

export default function DashboardHome() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await admGetDashboardOverview({ days: 30 });
      setData(res.data);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message;
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  const cards = useMemo(() => {
    const c = data?.cards || {};
    return [
      { label: "Tổng phòng gym", value: c.gyms ?? 0, hint: "Active gyms" },
      { label: "Tổng hội viên", value: c.members ?? 0, hint: "Members" },
      { label: "Tổng PT", value: c.trainers ?? 0, hint: "Trainers" },
      { label: "Nhượng quyền chờ duyệt", value: c.franchisePending ?? 0, hint: "Pending" },
      { label: "Bảo trì pending", value: c.maintenancePending ?? 0, hint: "SLA" },
      { label: "Doanh thu 30 ngày", value: fmtMoney(c.revenue30d ?? 0), hint: "Completed transactions" },
    ];
  }, [data]);

  const quick = useMemo(() => {
    const c = data?.cards || {};
    return [
      {
        title: "Nhượng quyền",
        desc: `Duyệt yêu cầu đối tác • Pending: ${c.franchisePending ?? 0}`,
      },
      {
        title: "Thiết bị & Mua hàng",
        desc: `PO pending: ${c.poPending ?? 0} • Low stock: ${c.lowStock ?? 0}`,
      },
      {
        title: "Bảo trì",
        desc: `Pending: ${c.maintenancePending ?? 0} • In-progress: ${c.maintenanceInProgress ?? 0}`,
      },
      {
        title: "Chia sẻ PT",
        desc: `Pending: ${c.trainerSharePending ?? 0} • Overrides: audit-ready`,
      },
    ];
  }, [data]);

  return (
    <div className="dh-wrap">
      <div className="dh-head">
        <div>
          <h2 className="dh-title">Tổng quan hệ thống</h2>
          <div className="dh-sub">Dashboard enterprise (live from DB) • 30 ngày gần nhất</div>
        </div>
        <div className="dh-actions">
          <button className="dh-btn" onClick={load} disabled={loading}>
            {loading ? "Đang tải..." : "Refresh"}
          </button>
        </div>
      </div>

      {err ? <div className="dh-alert">{err}</div> : null}

      <div className="dh-grid">
        {cards.map((k, idx) => (
          <div className="dh-card" key={idx}>
            <div className="dh-card__label">{k.label}</div>
            <div className="dh-card__value">{k.value}</div>
            <div className="dh-card__note">{k.hint}</div>
          </div>
        ))}
      </div>

      <div className="dh-panel">
        <div className="dh-panel__title">Quick Modules</div>
        <div className="dh-panel__grid">
          {quick.map((q, idx) => (
            <div className="dh-mini" key={idx}>
              <div className="dh-mini__t">{q.title}</div>
              <div className="dh-mini__d">{q.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="dh-foot">
        <div className="dh-foot__muted">As of: {data?.asOf ? new Date(data.asOf).toLocaleString() : "-"}</div>
      </div>
    </div>
  );
}
