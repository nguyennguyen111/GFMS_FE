import React, { useEffect, useState } from "react";
import "./InventoryLogsPage.css";

import { getInventoryLogs } from "../../../services/equipmentSupplierInventoryService";

export default function InventoryLogsPage() {
  const [q, setQ] = useState("");
  const [action, setAction] = useState("all");
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const fetcher = async (page = 1) => {
    setErr("");
    setLoading(true);
    try {
      const res = await getInventoryLogs({
        q: q || undefined,
        action: action !== "all" ? action : undefined,
        page,
        limit: 20,
      });

      const payload = res?.data;
      setData(payload?.data ?? payload ?? []);
      setMeta(payload?.meta ?? null);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Load nhật ký kho thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetcher(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = () => fetcher(1);

  return (
    <div className="ilog-page">
      <div className="ilog-head">
        <h2 className="ilog-title">Nhật ký kho</h2>
        <div className="ilog-sub">Lịch sử nhập/xuất/điều chỉnh tồn kho (Inventory)</div>
      </div>

      <div className="ilog-card">
        <div className="ilog-filters">
          <input
            className="ilog-input"
            placeholder="Tìm theo thiết bị / mã / gym / reason..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select className="ilog-select" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="all">Tất cả action</option>
            <option value="import">import</option>
            <option value="export">export</option>
            <option value="adjustment">adjustment</option>
            <option value="transfer">transfer</option>
          </select>

          <button className="ilog-btn" onClick={onSearch} disabled={loading}>
            {loading ? "Đang tải..." : "Tìm"}
          </button>
        </div>

        {err ? <div className="ilog-alert">{err}</div> : null}

        <div className="ilog-tableWrap">
          <table className="ilog-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Thời gian</th>
                <th>Gym</th>
                <th>Thiết bị</th>
                <th>Action</th>
                <th>Qty</th>
                <th>Before</th>
                <th>After</th>
                <th>Reason</th>
                <th>Ref</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</td>
                  <td>{r.gymName || r.gymId}</td>
                  <td>{r.equipmentName ? `${r.equipmentName} (${r.equipmentCode || ""})` : r.equipmentId}</td>
                  <td>{r.action}</td>
                  <td>{r.quantity}</td>
                  <td>{r.stockBefore ?? ""}</td>
                  <td>{r.stockAfter ?? ""}</td>
                  <td>{r.reason || ""}</td>
                  <td>
                    {r.referenceType || ""} {r.referenceId ? `#${r.referenceId}` : ""}
                  </td>
                </tr>
              ))}
              {!data.length ? (
                <tr>
                  <td colSpan={10} className="ilog-empty">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {meta ? (
          <div className="ilog-pagi">
            <button
              className="ilog-btn ilog-btn--ghost"
              disabled={meta.page <= 1 || loading}
              onClick={() => fetcher(meta.page - 1)}
            >
              ← Trước
            </button>
            <div className="ilog-meta">
              Trang {meta.page} / {meta.totalPages} • Total {meta.totalItems}
            </div>
            <button
              className="ilog-btn ilog-btn--ghost"
              disabled={meta.page >= meta.totalPages || loading}
              onClick={() => fetcher(meta.page + 1)}
            >
              Sau →
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
