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
      { label: "Tổng phòng gym", value: c.gyms ?? 0, hint: "Phòng đang hoạt động" },
      { label: "Tổng hội viên", value: c.members ?? 0, hint: "Hội viên" },
      { label: "Tổng PT", value: c.trainers ?? 0, hint: "Huấn luyện viên" },
      { label: "Nhượng quyền chờ duyệt", value: c.franchisePending ?? 0, hint: "Chờ xử lý" },
      { label: "Bảo trì chờ xử lý", value: c.maintenancePending ?? 0, hint: "Theo SLA" },
      { label: "Doanh thu 30 ngày", value: fmtMoney(c.revenue30d ?? 0), hint: "Giao dịch hoàn tất" },
    ];
  }, [data]);

  const quick = useMemo(() => {
    const c = data?.cards || {};
    return [
      {
        title: "Nhượng quyền",
        desc: `Duyệt yêu cầu đối tác • Chờ: ${c.franchisePending ?? 0}`,
      },
      {
        title: "Thiết bị & Mua hàng",
        desc: `PO chờ: ${c.poPending ?? 0} • Tồn kho thấp: ${c.lowStock ?? 0}`,
      },
      {
        title: "Bảo trì",
        desc: `Chờ: ${c.maintenancePending ?? 0} • Đang xử lý: ${c.maintenanceInProgress ?? 0}`,
      },
    ];
  }, [data]);

  const revenueSeries = useMemo(() => data?.revenue30dSeries || [], [data]);
  const maxRevenue = useMemo(
    () => Math.max(1, ...revenueSeries.map((x) => Number(x.total || 0))),
    [revenueSeries]
  );
  const salesHistory = useMemo(() => data?.equipmentSalesTransactions || [], [data]);

  return (
    <div className="dh-wrap">
      <div className="dh-head">
        <div>
          <h2 className="dh-title">Tổng quan hệ thống</h2>
          <div className="dh-sub">Tổng quan theo dữ liệu thật (CSDL) • 30 ngày gần nhất</div>
        </div>
        <div className="dh-actions">
          <button className="dh-btn" onClick={load} disabled={loading}>
            {loading ? "Đang tải..." : "Làm mới"}
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
        <div className="dh-panel__title">Mô-đun nhanh</div>
        <div className="dh-panel__grid">
          {quick.map((q, idx) => (
            <div className="dh-mini" key={idx}>
              <div className="dh-mini__t">{q.title}</div>
              <div className="dh-mini__d">{q.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="dh-panel">
        <div className="dh-panel__title">Biểu đồ doanh thu bán thiết bị (30 ngày)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(30, minmax(10px, 1fr))", gap: 4, alignItems: "end", minHeight: 160 }}>
          {revenueSeries.map((point) => {
            const value = Number(point.total || 0);
            const h = Math.max(2, Math.round((value / maxRevenue) * 140));
            return (
              <div key={point.date} title={`${point.date}: ${fmtMoney(value)}`} style={{ display: "flex", alignItems: "end" }}>
                <div style={{ width: "100%", height: h, borderRadius: 4, background: "linear-gradient(180deg,#facc15,#f59e0b)" }} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="dh-panel">
        <div className="dh-panel__title">Lịch sử giao dịch bán thiết bị</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Mã GD</th>
                <th style={th}>Gym</th>
                <th style={th}>Số tiền</th>
                <th style={th}>Phương thức</th>
                <th style={th}>Mô tả</th>
                <th style={th}>Ngày</th>
              </tr>
            </thead>
            <tbody>
              {!salesHistory.length ? (
                <tr><td style={tdEmpty} colSpan={6}>Chưa có giao dịch bán thiết bị</td></tr>
              ) : salesHistory.map((tx) => (
                <tr key={tx.id}>
                  <td style={td}>{tx.transactionCode || `TX-${tx.id}`}</td>
                  <td style={td}>{tx.gym?.name || "-"}</td>
                  <td style={td}>{fmtMoney(tx.amount)}</td>
                  <td style={td}>{tx.paymentMethod || "-"}</td>
                  <td style={td}>{tx.description || "-"}</td>
                  <td style={td}>{tx.transactionDate ? new Date(tx.transactionDate).toLocaleString("vi-VN") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dh-foot">
        <div className="dh-foot__muted">Cập nhật lúc: {data?.asOf ? new Date(data.asOf).toLocaleString() : "-"}</div>
      </div>
    </div>
  );
}

const th = { textAlign: "left", padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.12)", fontSize: 12, opacity: 0.85 };
const td = { padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.08)", fontSize: 13 };
const tdEmpty = { ...td, textAlign: "center", opacity: 0.75 };
