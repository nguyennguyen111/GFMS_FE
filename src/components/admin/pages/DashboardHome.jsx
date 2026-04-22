import React, { useEffect, useMemo, useState } from "react";
import "./DashboardHome.css";
import { admGetDashboardOverview } from "../../../services/adminAdminCoreService";

const API_HOST = process.env.REACT_APP_API_URL || "http://localhost:8080";
const absUrl = (value) => (value ? (String(value).startsWith("http") || String(value).startsWith("data:") ? String(value) : `${API_HOST}${value}`) : "");

const fmtMoney = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString("vi-VN") + "đ";
};

const shortText = (value, max = 120) => {
  const text = String(value || "").trim();
  if (!text) return "Combo đang mở bán và sẵn sàng cho owner gửi yêu cầu mua.";
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
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
      setErr(e?.response?.data?.message || e.message || "Không tải được dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cards = useMemo(() => {
    const c = data?.cards || {};
    return [
      {
        label: "Nhượng quyền chờ duyệt",
        value: c.franchisePending ?? 0,
        note: "Cần admin xử lý",
      },
      {
        label: "Yêu cầu mua combo chờ duyệt",
        value: c.comboPending ?? 0,
        note: "Chờ xác nhận workflow",
      },
      {
        label: "Yêu cầu bảo trì chờ xử lý",
        value: c.maintenancePending ?? 0,
        note: "Request kỹ thuật đang mở",
      },
      {
        label: "Phòng gym đang hoạt động",
        value: c.activeGyms ?? 0,
        note: "Số chi nhánh đang hoạt động",
      },
    ];
  }, [data]);

  const revenueSeries = useMemo(() => data?.revenue30dSeries || [], [data]);
  const sellingCombos = useMemo(() => data?.sellingCombos || [], [data]);
  const comboSalesTransactions = useMemo(() => data?.comboSalesTransactions || [], [data]);
  const maxRevenue = useMemo(() => Math.max(1, ...revenueSeries.map((x) => Number(x.total || 0))), [revenueSeries]);

  return (
    <div className="dh-wrap dh-wrap--combo">
      <div className="dh-head">
        <div>
          <div className="dh-eyebrow">ADMIN DASHBOARD</div>
          <h2 className="dh-title">Tổng quan admin</h2>
          <div className="dh-sub">Theo dõi nhanh vận hành nhượng quyền, bảo trì, combo đang bán và dòng tiền combo theo chuẩn dashboard doanh nghiệp.</div>
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
        <section className="dh-panel dh-panel--combos">
          <div className="dh-panel__head dh-panel__head--stack">
            <div className="dh-panel__title">Combo đang bán</div>
            <div className="dh-panel__hint">Hiển thị ảnh thumbnail và mô tả ngắn để admin nhìn nhanh danh mục combo đang mở bán</div>
          </div>

          <div className="dh-combo-grid">
            {!sellingCombos.length ? (
              <div className="dh-empty">Chưa có combo đang bán.</div>
            ) : (
              sellingCombos.map((item) => {
                const imageUrl = absUrl(item.thumbnail);
                return (
                  <article className="dh-combo-card" key={item.id}>
                    <div className="dh-combo-card__media">
                      {imageUrl ? <img src={imageUrl} alt={item.name} /> : <span>{(item.name || "C").slice(0, 1).toUpperCase()}</span>}
                    </div>
                    <div className="dh-combo-card__body">
                      <div className="dh-combo-card__code">{item.code || `COMBO-${item.id}`}</div>
                      <div className="dh-combo-card__title">{item.name}</div>
                      <div className="dh-combo-card__desc">{shortText(item.description)}</div>
                      <div className="dh-combo-card__foot">
                        <span className="dh-combo-card__price">{fmtMoney(item.price)}</span>
                        <span className="dh-combo-card__time">{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("vi-VN") : "-"}</span>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="dh-panel dh-panel--chart">
          <div className="dh-panel__head dh-panel__head--stack">
            <div className="dh-panel__title">Doanh thu combo 30 ngày</div>
            <div className="dh-panel__hint">Xu hướng thanh toán hoàn tất theo giao dịch combo</div>
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
          <div className="dh-panel__hint">Kiểm tra nhanh dòng tiền theo từng giao dịch combo</div>
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
