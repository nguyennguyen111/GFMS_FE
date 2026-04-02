import React, { useEffect, useState } from "react";
import "./OwnerInventoryPage.css";
import { ownerGetInventory } from "../../../services/ownerInventoryService";
import { ownerGetMaintenances } from "../../../services/ownerMaintenanceService";

export default function OwnerInventoryPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ q: "" });
  const [page, setPage] = useState(1);
  const [maintenanceMap, setMaintenanceMap] = useState({}); // Map equipmentId -> count

  // Fetch maintenance to show equipment under maintenance
  const fetchMaintenanceCount = async () => {
    try {
      // Fetch both pending and in_progress maintenance
      const res = await ownerGetMaintenances({ page: 1, limit: 1000 });
      const mData = res?.data?.data ?? [];
      const map = {};
      mData.forEach(m => {
        // Only count pending and in_progress (not completed/cancelled/rejected)
        if (m.status === "pending" || m.status === "in_progress") {
          if (!map[m.equipmentId]) {
            map[m.equipmentId] = 0;
          }
          map[m.equipmentId]++;
        }
      });
      setMaintenanceMap(map);
    } catch (e) {
      console.error("Failed to fetch maintenance:", e.message);
    }
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await ownerGetInventory({ ...filters, page, limit: 10 });
      const data = res?.data?.data ?? [];
      const metaFrom = res?.data?.meta;
      setItems(data);
      setMeta(metaFrom || { page, limit: 10, totalItems: data.length, totalPages: 1 });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceCount();
  }, []);

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line
  }, [page]);

  return (
    <div className="oinv-page">
      <div className="oinv-head">
        <h2>Tồn kho</h2>
        <p>Quản lý hàng tồn kho theo từng gym</p>
      </div>

      <div className="oinv-filters">
        <input
          placeholder="Tìm theo tên/mã thiết bị..."
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <button className="btn-primary" onClick={() => { setPage(1); fetchList(); }}>
          Tìm
        </button>
      </div>

      {loading && <div className="oinv-loading">Đang tải...</div>}

      <div className="oinv-table-wrap">
        <table className="oinv-table">
          <thead>
            <tr>
              <th>Gym</th>
              <th>Thiết bị</th>
              <th>Mã</th>
              <th>Tổng cộng</th>
              <th>Có sẵn</th>
              <th>Bảo trì</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td>{r.gym?.name || "-"}</td>
                <td><strong>{r.equipment?.name || "-"}</strong></td>
                <td>{r.equipment?.code || "-"}</td>
                <td>{r.quantity ?? 0}</td>
                <td className="oinv-available">{r.availableQuantity ?? 0}</td>
                <td className="oinv-maintenance">{maintenanceMap[r.equipment?.id] ?? 0}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="oinv-empty">
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="oinv-paging">
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
          ←
        </button>
        <span>
          Trang <b>{meta.page}</b> / {meta.totalPages}
        </span>
        <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
          →
        </button>
      </div>
    </div>
  );
}
