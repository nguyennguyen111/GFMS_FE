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
      setItems(Array.isArray(data) ? data : data.items ?? []);
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
              <th>Phòng gym</th>
              <th>Thiết bị</th>
              <th>Mã</th>
              <th>Tồn hiện tại</th>
              <th>Mức tối thiểu</th>
              <th>Thiếu cần mua</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td className="empty" colSpan={7}>Không có dữ liệu</td></tr>
            ) : (
              items.map((r) => (
                <tr key={r.id}>
                  <td>{r.gym?.name || r.gymName || r.gymId}</td>
                  <td>{r.equipment?.name || r.equipmentName || "-"}</td>
                  <td>{r.equipment?.code || r.equipmentCode || "-"}</td>
                  <td>{r.currentQuantity ?? r.availableQuantity ?? r.quantity ?? 0}</td>
                  <td>{r.minStockLevel ?? "-"}</td>
                  <td>{r.shortageQuantity ?? 0}</td>
                  <td>{r.stockStatus || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
