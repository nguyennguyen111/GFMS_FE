import React, { useEffect, useState } from "react";
import "./OwnerEquipmentPage.css";
import { ownerGetEquipments } from "../../../services/ownerEquipmentService";
import { ownerGetMaintenances } from "../../../services/ownerMaintenanceService";

export default function OwnerEquipmentPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ q: "", status: "all", categoryId: "all" });
  const [page, setPage] = useState(1);
  const [maintenanceMap, setMaintenanceMap] = useState({}); // Map equipmentId -> status

  // Get active maintenance requests to show maintenance status
  const fetchMaintenanceStatus = async () => {
    try {
      // Fetch both pending and in_progress maintenance
      const res = await ownerGetMaintenances({ page: 1, limit: 1000 });
      const mData = res?.data?.data ?? [];
      const map = {};
      mData.forEach(m => {
        // Only count pending and in_progress (not completed/cancelled/rejected)
        if ((m.status === "pending" || m.status === "in_progress") && !map[m.equipmentId]) {
          map[m.equipmentId] = "maintenance";
        }
      });
      setMaintenanceMap(map);
    } catch (e) {
      console.error("Failed to fetch maintenance status:", e.message);
    }
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await ownerGetEquipments({ ...filters, page, limit: 10 });
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
    fetchMaintenanceStatus();
  }, []);

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line
  }, [page]);

  return (
    <div className="oeq-page">
      <div className="oeq-head">
        <h2>Thiết bị</h2>
        <p>Danh sách tất cả thiết bị của gym</p>
      </div>

      <div className="oeq-filters">
        <input
          placeholder="Tìm theo tên/mã thiết bị..."
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="all">Tất cả</option>
          <option value="active">Active</option>
          <option value="maintenance">Maintenance</option>
          <option value="discontinued">Discontinued</option>
        </select>
        <button className="btn-primary" onClick={() => { setPage(1); fetchList(); }}>
          Tìm
        </button>
      </div>

      {loading && <div className="oeq-loading">Đang tải...</div>}

      <div className="oeq-table-wrap">
        <table className="oeq-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên</th>
              <th>Mã</th>
              <th>Gym</th>
              <th>Danh mục</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const displayStatus = maintenanceMap[r.id] || r.status;
              return (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td><strong>{r.name}</strong></td>
                  <td>{r.code}</td>
                  <td>{r.Gym?.name || "-"}</td>
                  <td>{r.EquipmentCategory?.name || "-"}</td>
                  <td>
                    <span className={`oeq-badge oeq-badge--${displayStatus}`}>
                      {displayStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="oeq-empty">
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="oeq-paging">
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
