import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DashboardHome.css";
import { admGetDashboardOverview } from "../../../services/adminAdminCoreService";

const fmtMoney = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString("vi-VN") + "đ";
};

const STATUS_LABELS = {
  submitted: "Chờ admin duyệt",
  approved_waiting_deposit: "Chờ owner cọc 30%",
  paid_waiting_admin_confirm: "Đã cọc, chờ admin xác nhận",
  shipping: "Đang bàn giao",
  delivered_waiting_final_payment: "Chờ owner trả 70%",
  completed: "Hoàn tất",
  rejected: "Đã từ chối",
};

export default function DashboardHome() {
  const navigate = useNavigate();
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
      setErr(e?.response?.data?.message || e.message || "Không tải được dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = useMemo(() => {
    const c = data?.cards || {};
    return [
      {
        label: "Nhượng quyền chờ duyệt",
        value: c.franchisePending ?? 0,
        note: "Việc cần admin xử lý",
      },
      {
        label: "Yêu cầu mua combo chờ duyệt",
        value: c.comboPending ?? 0,
        note: "Request submitted",
      },
      {
        label: "Yêu cầu bảo trì chờ xử lý",
        value: c.maintenancePending ?? 0,
        note: "Request kỹ thuật đang mở",
      },
    ];
  }, [data]);

  const revenueSeries = useMemo(() => data?.revenue30dSeries || [], [data]);
  const latestComboRequests = useMemo(() => data?.latestComboRequests || [], [data]);
  const comboSalesTransactions = useMemo(() => data?.comboSalesTransactions || [], [data]);
  const maxRevenue = useMemo(() => Math.max(1, ...revenueSeries.map((x) => Number(x.total || 0))), [revenueSeries]);

  return (
    <div className="dh-wrap dh-wrap--combo">
      <div className="dh-head">
        <div>
          <div className="dh-eyebrow">ADMIN DASHBOARD</div>
          <h2 className="dh-title">Tổng quan admin</h2>
          <div className="dh-sub">Chỉ tập trung vào luồng chính: nhượng quyền, combo, bảo trì và dòng tiền combo.</div>
        </div>
        <div className="dh-actions">
          <button className="dh-btn" onClick={load} disabled={loading}>
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>
      </div>

      {err ? <div className="dh-alert">{err}</div> : null}

      <div className="dh-kpis">
        {cards.map((item) => (
          <div className="dh-kpi" key={item.label}>
            <div className="dh-kpi__label">{item.label}</div>
            <div className="dh-kpi__value">{item.value}</div>
            <div className="dh-kpi__note">{item.note}</div>
          </div>
        ))}
      </div>

      <div className="dh-main-grid">
        <section className="dh-panel dh-panel--requests">
          <div className="dh-panel__head">
            <div className="dh-panel__title">Request combo mới nhất</div>
            <button className="dh-link" onClick={() => navigate("/admin/purchase-workflow")}>Xem tất cả</button>
          </div>

          <div className="dh-request-list">
            {!latestComboRequests.length ? (
              <div className="dh-empty">Chưa có request combo.</div>
            ) : (
              latestComboRequests.map((item) => (
                <button
                  key={item.id}
                  className="dh-request-card"
                  onClick={() => navigate(`/admin/purchase-workflow?highlight=${item.id}`)}
                >
                  <div className="dh-request-card__left">
                    <div className="dh-request-card__code">{item.code}</div>
                    <div className="dh-request-card__meta">
                      {item.combo?.name || "Combo"} • {item.gym?.name || "-"}
                    </div>
                  </div>
                  <div className="dh-request-card__right">
                    <div className={`dh-status dh-status--${item.status || "default"}`}>
                      {STATUS_LABELS[item.status] || item.status || "-"}
                    </div>
                    <div className="dh-request-card__amount">{fmtMoney(item.totalAmount || item.combo?.price || 0)}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="dh-panel dh-panel--chart">
          <div className="dh-panel__head dh-panel__head--stack">
            <div className="dh-panel__title">Doanh thu combo 30 ngày</div>
            <div className="dh-panel__hint">Xu hướng thanh toán hoàn tất</div>
          </div>

          <div className="dh-chart">
            {revenueSeries.map((point) => {
              const value = Number(point.total || 0);
              const h = Math.max(8, Math.round((value / maxRevenue) * 170));
              return (
                <div className="dh-chart__col" key={point.date} title={`${point.date}: ${fmtMoney(value)}`}>
                  <div className="dh-chart__bar" style={{ height: h }} />
                </div>
              );
            })}
          </div>

          <div className="dh-chart-total">Tổng 30 ngày: {fmtMoney(data?.cards?.comboRevenue30d || 0)}</div>
        </section>
      </div>

      <section className="dh-panel dh-panel--table">
        <div className="dh-panel__head dh-panel__head--stack">
          <div className="dh-panel__title">Giao dịch combo gần nhất</div>
          <div className="dh-panel__hint">Giúp admin check nhanh dòng tiền theo combo</div>
        </div>

        <div className="dh-table-wrap">
          <table className="dh-table">
            <thead>
              <tr>
                <th>Mã GD</th>
                <th>Gym</th>
                <th>Số tiền</th>
                <th>Phương thức</th>
                <th>Mô tả</th>
                <th>Ngày</th>
              </tr>
            </thead>
            <tbody>
              {!comboSalesTransactions.length ? (
                <tr>
                  <td colSpan={6} className="dh-table__empty">Chưa có giao dịch combo</td>
                </tr>
              ) : (
                comboSalesTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{tx.transactionCode || `TX-${tx.id}`}</td>
                    <td>{tx.gym?.name || "-"}</td>
                    <td>{fmtMoney(tx.amount)}</td>
                    <td>{tx.paymentMethod || "-"}</td>
                    <td>{tx.description || tx.purchaseRequest?.combo?.name || "-"}</td>
                    <td>{tx.transactionDate ? new Date(tx.transactionDate).toLocaleString("vi-VN") : "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
