import React, { useCallback, useEffect, useState } from "react";
import "./OwnerInventoryPage.css";
import { ownerGetInventory } from "../../../services/ownerInventoryService";
import { ownerGetEquipmentDetail, ownerMarkEquipmentUnitsInStock, ownerMarkEquipmentUnitsInUse } from "../../../services/ownerEquipmentService";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import useSelectedGym from "../../../hooks/useSelectedGym";

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN");
};

export default function OwnerInventoryPage() {
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ q: "" });
  const [page, setPage] = useState(1);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageDetail, setManageDetail] = useState(null);
  const [manageGymId, setManageGymId] = useState(null);
  const [unitSearch, setUnitSearch] = useState("");
  const [unitUsageFilter, setUnitUsageFilter] = useState("all");
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);
  const [bulkChanging, setBulkChanging] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ownerGetInventory({ ...filters, gymId: selectedGymId || undefined, page, limit: 10 });
      const data = res?.data?.data ?? [];
      const metaFrom = res?.data?.meta;
      setItems(data);
      setMeta(metaFrom || { page, limit: 10, totalItems: data.length, totalPages: 1 });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, selectedGymId]);

  useEffect(() => {
    fetchList();
  }, [fetchList, page]);

  useOwnerRealtimeRefresh({
    onRefresh: async () => {
      await fetchList();
      if (manageOpen && manageDetail?.id) {
        await openManageModal({ equipment: { id: manageDetail.id }, gym: { id: manageGymId } });
      }
    },
    events: ["notification:new", "transfer:changed", "maintenance:changed", "equipment:changed"],
    notificationTypes: ["maintenance", "receipt"],
  });

  const openManageModal = useCallback(async (row) => {
    const equipmentId = row?.equipment?.id;
    const gymId = row?.gym?.id;
    if (!equipmentId || !gymId) return;
    setManageLoading(true);
    setUnitSearch("");
    setUnitUsageFilter("all");
    setSelectedUnitIds([]);
    setManageGymId(gymId);
    try {
      const res = await ownerGetEquipmentDetail(equipmentId);
      setManageDetail(res?.data?.data || null);
      setManageOpen(true);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setManageLoading(false);
    }
  }, []);

  const closeManageModal = useCallback(() => {
    setManageOpen(false);
    setManageDetail(null);
    setManageGymId(null);
    setUnitSearch("");
    setUnitUsageFilter("all");
    setSelectedUnitIds([]);
  }, []);

  const visibleUnits = (manageDetail?.units || []).filter((unit) => {
    const matchesGym = !manageGymId || Number(unit.gymId) === Number(manageGymId);
    const keyword = String(unitSearch || "").trim().toLowerCase();
    const matchesKeyword = !keyword || String(unit.assetCode || "").toLowerCase().includes(keyword);
    const matchesUsage = unitUsageFilter === "all" || String(unit.usageStatus || "").toLowerCase() === unitUsageFilter;
    return matchesGym && matchesKeyword && matchesUsage && String(unit.status || "").toLowerCase() === "active";
  });

  const toggleUnitSelection = useCallback((unitId) => {
    setSelectedUnitIds((current) => (
      current.includes(unitId)
        ? current.filter((id) => id !== unitId)
        : [...current, unitId]
    ));
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedUnitIds(visibleUnits.map((unit) => unit.id));
  }, [visibleUnits]);

  const clearSelection = useCallback(() => {
    setSelectedUnitIds([]);
  }, []);

  const handleBulkChange = useCallback(async (nextUsageStatus) => {
    if (!manageDetail?.id || !selectedUnitIds.length) {
      alert("Chưa chọn thiết bị nào");
      return;
    }
    setBulkChanging(true);
    try {
      if (nextUsageStatus === "in_use") {
        await ownerMarkEquipmentUnitsInUse(manageDetail.id, selectedUnitIds);
      } else {
        await ownerMarkEquipmentUnitsInStock(manageDetail.id, selectedUnitIds);
      }
      await fetchList();
      await openManageModal({ equipment: { id: manageDetail.id }, gym: { id: manageGymId } });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setBulkChanging(false);
    }
  }, [fetchList, manageDetail?.id, manageGymId, openManageModal, selectedUnitIds]);

  return (
    <div className="oinv-page">
      <div className="oinv-head">
        <h2>Tồn kho</h2>
        <p>{selectedGymName ? `Đang quản lý tồn kho của chi nhánh ${selectedGymName}` : "Quản lý hàng tồn kho theo từng gym"}</p>
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
              <th>Phòng tập</th>
              <th>Thiết bị</th>
              <th>Mã</th>
              <th>Tổng cộng</th>
              <th>Đang sử dụng</th>
              <th>Trong kho</th>
              <th>Bảo trì</th>
              <th>Chờ chuyển</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td>{r.gym?.name || "-"}</td>
                <td><strong>{r.equipment?.name || "-"}</strong></td>
                <td>{r.equipment?.code || "-"}</td>
                <td>{r.quantity ?? 0}</td>
                <td>{r.unitSummary?.inUseQuantity ?? 0}</td>
                <td className="oinv-available">{r.unitSummary?.inStockQuantity ?? r.availableQuantity ?? 0}</td>
                <td className="oinv-maintenance">{r.unitSummary?.maintenanceQuantity ?? 0}</td>
                <td>{r.unitSummary?.transferPendingQuantity ?? 0}</td>
                <td>
                  <button type="button" className="oinv-action-btn" onClick={() => openManageModal(r)}>
                    Quản lý thiết bị
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="oinv-empty">
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          disabled={meta.page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="pagination-btn"
        >
          Trước
        </button>
        <span className="pagination-info">
          Trang {meta.page || 1} / {meta.totalPages || 1}
        </span>
        <button
          disabled={(meta.page || 1) >= (meta.totalPages || 1)}
          onClick={() => setPage((p) => Math.min(meta.totalPages || 1, p + 1))}
          className="pagination-btn"
        >
          Sau
        </button>
      </div>

      {manageOpen && (
        <div className="modal-overlay" onClick={closeManageModal}>
          <div className="modal-content oinv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Quản lý thiết bị {manageDetail?.name ? `- ${manageDetail.name}` : ""}</h2>
              <button className="modal-close" onClick={closeManageModal}>×</button>
            </div>

            <div className="modal-body oinv-modal-body">
              {manageLoading || !manageDetail ? (
                <div className="oinv-loading">Đang tải unit...</div>
              ) : (
                <>
                  <div className="oinv-manage-filters">
                    <input
                      value={unitSearch}
                      onChange={(e) => setUnitSearch(e.target.value)}
                      placeholder="Tìm mã thiết bị..."
                    />
                    <select value={unitUsageFilter} onChange={(e) => setUnitUsageFilter(e.target.value)}>
                      <option value="all">Tất cả</option>
                      <option value="in_stock">Đang ở kho</option>
                      <option value="in_use">Đang sử dụng</option>
                    </select>
                  </div>

                  <div className="oinv-bulk-toolbar">
                    <div className="oinv-bulk-toolbar__info">Đã chọn {selectedUnitIds.length} / {visibleUnits.length} thiết bị</div>
                    <div className="oinv-bulk-toolbar__actions">
                      <button type="button" className="oinv-action-btn" onClick={selectAllVisible} disabled={!visibleUnits.length}>Chọn tất cả thiết bị</button>
                      <button type="button" className="oinv-action-btn" onClick={clearSelection} disabled={!selectedUnitIds.length}>Bỏ chọn</button>
                      <button type="button" className="oinv-action-btn" onClick={() => handleBulkChange("in_use")} disabled={bulkChanging || !selectedUnitIds.length}>Đưa ra sử dụng</button>
                      <button type="button" className="oinv-action-btn" onClick={() => handleBulkChange("in_stock")} disabled={bulkChanging || !selectedUnitIds.length}>Cất vào kho</button>
                    </div>
                  </div>

                  <div className="oinv-unit-list">
                    {visibleUnits.map((unit) => (
                      <label key={unit.id} className={`oinv-unit-card ${selectedUnitIds.includes(unit.id) ? "is-selected" : ""}`}>
                        <div className="oinv-unit-card__top">
                          <input
                            type="checkbox"
                            checked={selectedUnitIds.includes(unit.id)}
                            onChange={() => toggleUnitSelection(unit.id)}
                          />
                          <span className={`oinv-unit-badge ${unit.usageStatus}`}>{unit.usageStatus === "in_use" ? "Đang sử dụng" : "Đang ở kho"}</span>
                        </div>
                        <div className="oinv-unit-code">{unit.assetCode}</div>
                        <div className="oinv-unit-meta">{unit.gymName || `Gym #${unit.gymId}`} • {formatDateTime(unit.createdAt)}</div>
                      </label>
                    ))}
                    {visibleUnits.length === 0 && <div className="oinv-empty">Không có thiết bị phù hợp</div>}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
