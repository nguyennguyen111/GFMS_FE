import React, { useEffect, useState } from "react";
import "./InventoryPage.css";

import {
  getStocks,
} from "../../../services/equipmentSupplierInventoryService";


export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await getStocks({ q: search || undefined });
      const data = res?.data?.data ?? res?.data ?? [];
      const rows = Array.isArray(data) ? data : data.items ?? [];
      const grouped = Object.values(
        rows.reduce((acc, row) => {
          const equipmentId = Number(row.equipmentId || row.equipment?.id || 0);
          const key = equipmentId || `code:${row.equipmentCode || row.equipment?.code || row.id}`;
          if (!acc[key]) {
            acc[key] = {
              key,
              equipmentName: row.equipment?.name || row.equipmentName || "-",
              equipmentCode: row.equipment?.code || row.equipmentCode || "-",
              quantity: 0,
              availableQuantity: 0,
              reservedQuantity: 0,
              damagedQuantity: 0,
              maintenanceQuantity: 0,
              minStockLevel: row.minStockLevel ?? "-",
              reorderPoint: row.reorderPoint ?? "-",
            };
          }
          acc[key].quantity += Number(row.quantity || 0);
          acc[key].availableQuantity += Number(row.availableQuantity || 0);
          acc[key].reservedQuantity += Number(row.reservedQuantity || 0);
          acc[key].damagedQuantity += Number(row.damagedQuantity || 0);
          acc[key].maintenanceQuantity += Number(row.maintenanceQuantity || 0);
          return acc;
        }, {})
      );
      setItems(grouped);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Tải dữ liệu thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="inv-page">
      <div className="inv-header">
        <h2>Tồn kho</h2>
      </div>

      <div className="inv-filters">
        <input
          className="input"
          placeholder="Tìm theo tên/mã thiết bị..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchAll()}
        />
        <button className="btn" onClick={fetchAll}>
          Tìm
        </button>
      </div>

      {err ? <div className="alert">{err}</div> : null}
      {loading ? <div className="muted">Đang tải...</div> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Thiết bị</th>
              <th>Mã</th>
              <th>Số lượng</th>
              <th>Khả dụng</th>
              <th>Giữ chỗ</th>
              <th>Hỏng</th>
              <th>Bảo trì</th>
              <th>Tồn tối thiểu</th>
              <th>Điểm đặt lại</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td className="empty" colSpan={9}>Không có dữ liệu</td></tr>
            ) : (
              items.map((r) => (
                <tr key={r.key}>
                  <td>{r.equipmentName || "-"}</td>
                  <td>{r.equipmentCode || "-"}</td>
                  <td>{r.quantity ?? 0}</td>
                  <td>{r.availableQuantity ?? 0}</td>
                  <td>{r.reservedQuantity ?? 0}</td>
                  <td>{r.damagedQuantity ?? 0}</td>
                  <td>{r.maintenanceQuantity ?? 0}</td>
                  <td>{r.minStockLevel ?? "-"}</td>
                  <td>{r.reorderPoint ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
