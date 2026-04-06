import React, { useCallback, useEffect, useRef, useState } from "react";
import "./OwnerTransferPage.css";
import { useSearchParams } from "react-router-dom";
import {
  ownerGetTransfers,
  ownerGetTransferDetail,
  ownerCreateTransfer,
  ownerApproveTransfer,
  ownerRejectTransfer,
  ownerCompleteTransfer,
} from "../../../services/ownerTransferService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import { ownerGetEquipments, ownerGetEquipmentDetail } from "../../../services/ownerEquipmentService";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import useSelectedGym from "../../../hooks/useSelectedGym";

const statusBadge = (status) => {
  const map = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Bị từ chối",
    completed: "Hoàn tất",
  };
  return map[status] || status;
};

export default function OwnerTransferPage() {
  const PAGE_SIZE = 10;
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const [searchParams] = useSearchParams();
  const openedTransferRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ q: "", status: "", fromGymId: "", toGymId: "" });
  const [searchInput, setSearchInput] = useState("");
  const [detail, setDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [myGyms, setMyGyms] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [equipmentUnitsByItem, setEquipmentUnitsByItem] = useState({});

  // Create form state
  const [createForm, setCreateForm] = useState({
    fromGymId: selectedGymId ? String(selectedGymId) : "",
    toGymId: "",
    items: [{ equipmentId: "", quantity: "", selectedUnitIds: [] }],
    notes: "",
  });

  const [actionLoading, setActionLoading] = useState(false);

  const resetCreateState = useCallback(() => {
    setCreateForm({
      fromGymId: selectedGymId ? String(selectedGymId) : "",
      toGymId: "",
      items: [{ equipmentId: "", quantity: "", selectedUnitIds: [] }],
      notes: "",
    });
    setEquipmentUnitsByItem({});
  }, [selectedGymId]);

  const removeCreateItem = useCallback((removeIndex) => {
    setCreateForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, index) => index !== removeIndex),
    }));
    setEquipmentUnitsByItem((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        const numericKey = Number(key);
        if (numericKey < removeIndex) next[numericKey] = value;
        if (numericKey > removeIndex) next[numericKey - 1] = value;
      });
      return next;
    });
  }, []);

  const closeDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setDetail(null);
  }, []);

  // Fetch transfers list
  const fetchTransfers = useCallback(async (targetPage = page, targetFilters = filters) => {
    setLoading(true);
    try {
      const res = await ownerGetTransfers({
        page: targetPage,
        limit: PAGE_SIZE,
        status: targetFilters.status || undefined,
        q: targetFilters.q || undefined,
      });

      let rows = res?.data?.data ?? [];

      if (selectedGymId) {
        rows = rows.filter((t) => (
          String(t.fromGymId || t.fromGym?.id || "") === String(selectedGymId)
          || String(t.toGymId || t.toGym?.id || "") === String(selectedGymId)
        ));
      }

      if (targetFilters.fromGymId) {
        rows = rows.filter((t) => String(t.fromGymId || t.fromGym?.id || "") === String(targetFilters.fromGymId));
      }

      if (targetFilters.toGymId) {
        rows = rows.filter((t) => String(t.toGymId || t.toGym?.id || "") === String(targetFilters.toGymId));
      }

      const keyword = String(targetFilters.q || "").trim().toLowerCase();
      if (keyword) {
        rows = rows.filter((t) => {
          const bag = [
            `#${t.id}`,
            t.fromGym?.name,
            t.toGym?.name,
            t.status,
            statusBadge(t.status),
            t.notes,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return bag.includes(keyword);
        });
      }

      setTransfers(rows);
      setMeta(res?.data?.meta ?? { page: targetPage, limit: PAGE_SIZE, totalItems: 0, totalPages: 1 });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, selectedGymId]);

  const applySearch = () => {
    const nextFilters = { ...filters, q: searchInput.trim() };
    setFilters(nextFilters);
    if (page !== 1) {
      setPage(1);
      return;
    }
    fetchTransfers(1, nextFilters);
  };

  const resetSearch = () => {
    const reset = { q: "", status: "", fromGymId: "", toGymId: "" };
    setSearchInput("");
    setFilters(reset);
    if (page !== 1) {
      setPage(1);
      return;
    }
    fetchTransfers(1, reset);
  };

  // Fetch my gyms for dropdown
  const fetchMyGyms = useCallback(async () => {
    try {
      const res = await ownerGetMyGyms();
      setMyGyms(res?.data?.data ?? []);
    } catch (e) {
      console.error("Failed to fetch gyms:", e.message);
    }
  }, []);

  // Fetch equipment list when fromGym changes
  const fetchEquipmentByGym = useCallback(async (gymId) => {
    if (!gymId) {
      setEquipmentList([]);
      setEquipmentUnitsByItem({});
      return;
    }
    try {
      const res = await ownerGetEquipments({ gymId, limit: 1000 });
      const data = Array.isArray(res?.data?.data) ? res.data.data : [];
      setEquipmentList(data);
    } catch (e) {
      console.error("Failed to fetch equipment:", e.message);
      setEquipmentList([]);
    }
  }, []);

  const fetchEquipmentUnits = useCallback(async (equipmentId, gymId, itemIndex) => {
    if (!equipmentId || !gymId) {
      setEquipmentUnitsByItem((prev) => ({ ...prev, [itemIndex]: [] }));
      return;
    }
    try {
      const res = await ownerGetEquipmentDetail(equipmentId, { gymId });
      const units = Array.isArray(res?.data?.data?.units) ? res.data.data.units : [];
      const inStockUnits = units.filter(
        (unit) => Number(unit.gymId) === Number(gymId)
          && (unit.status === "active" || !unit.status)
          && (!unit.usageStatus || unit.usageStatus === "in_stock")
          && !unit.transferId
      );
      const fallbackUnits = units.filter(
        (unit) => Number(unit.gymId) === Number(gymId)
          && (unit.status === "active" || !unit.status)
          && !unit.transferId
      );
      setEquipmentUnitsByItem((prev) => ({
        ...prev,
        [itemIndex]: (inStockUnits.length > 0 ? inStockUnits : fallbackUnits)
          .sort((left, right) => String(left.assetCode || "").localeCompare(String(right.assetCode || ""))),
      }));
    } catch (e) {
      console.error("Failed to fetch equipment units:", e.message);
      setEquipmentUnitsByItem((prev) => ({ ...prev, [itemIndex]: [] }));
    }
  }, []);

  const closeCreateModal = useCallback(() => {
    setShowCreate(false);
    resetCreateState();
  }, [resetCreateState]);

  const toggleUnitSelection = useCallback((itemIndex, unitId) => {
    setCreateForm((prev) => {
      const nextItems = prev.items.map((item, index) => {
        if (index !== itemIndex) return item;
        const selectedUnitIds = Array.isArray(item.selectedUnitIds) ? item.selectedUnitIds.map(Number) : [];
        const nextSelected = selectedUnitIds.includes(Number(unitId))
          ? selectedUnitIds.filter((id) => id !== Number(unitId))
          : [...selectedUnitIds, Number(unitId)];

        return {
          ...item,
          selectedUnitIds: nextSelected,
          quantity: String(nextSelected.length),
        };
      });

      return { ...prev, items: nextItems };
    });
  }, []);

  const setAllUnits = useCallback((itemIndex, mode) => {
    setCreateForm((prev) => {
      const nextItems = prev.items.map((item, index) => {
        if (index !== itemIndex) return item;
        const allUnits = equipmentUnitsByItem[itemIndex] || [];
        const filteredUnitIds = allUnits.map((unit) => Number(unit.id));

        const selectedUnitIds = mode === "all" ? filteredUnitIds : [];
        return {
          ...item,
          selectedUnitIds,
          quantity: String(selectedUnitIds.length),
        };
      });

      return { ...prev, items: nextItems };
    });
  }, [equipmentUnitsByItem]);

  // Fetch detail when selected
  const fetchDetail = useCallback(async (id, options = {}) => {
    try {
      const { openModal = true } = options;
      const res = await ownerGetTransferDetail(id);
      setDetail(res?.data?.data);
      if (openModal) {
        setShowDetailModal(true);
      }
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  }, []);

  // Handle create transfer
  const handleCreate = async () => {
    if (!createForm.fromGymId || !createForm.toGymId) {
      alert("Vui lòng chọn phòng tập đi và phòng tập đến");
      return;
    }
    if (createForm.items.some((i) => !i.equipmentId || !Array.isArray(i.selectedUnitIds) || i.selectedUnitIds.length === 0)) {
      alert("Vui lòng chọn đầy đủ thiết bị và đơn vị thiết bị cần chuyển");
      return;
    }

    setActionLoading(true);
    try {
      await ownerCreateTransfer({
        fromGymId: createForm.fromGymId,
        toGymId: createForm.toGymId,
        items: createForm.items.map((item) => ({
          equipmentId: item.equipmentId,
          quantity: item.selectedUnitIds.length,
          selectedUnitIds: item.selectedUnitIds,
        })),
        notes: createForm.notes,
      });
      alert("Tạo phiếu chuyển kho và duyệt tự động thành công");
      setShowCreate(false);
      resetCreateState();
      setPage(1);
      fetchTransfers();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle approve
  const handleApprove = async (id) => {
    if (!window.confirm("Bạn có chắc muốn duyệt phiếu này?")) return;
    setActionLoading(true);
    try {
      await ownerApproveTransfer(id);
      alert("Duyệt thành công");
      fetchTransfers();
      if (detail?.id === id) fetchDetail(id);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reject
  const handleReject = async (id) => {
    const reason = window.prompt("Nhập lý do từ chối phiếu chuyển kho:", "") || "";
    if (!window.confirm("Bạn có chắc muốn từ chối phiếu này?")) return;
    setActionLoading(true);
    try {
      await ownerRejectTransfer(id, {
        gymId: selectedGymId || undefined,
        reason: reason.trim() || undefined,
      });
      alert("Từ chối thành công");
      fetchTransfers();
      if (detail?.id === id) fetchDetail(id);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle complete
  const handleComplete = async (id) => {
    if (!selectedGymId) {
      alert("Vui lòng chọn chi nhánh nhận hàng trước khi xác nhận nhận hàng");
      return;
    }
    if (!window.confirm("Bạn có chắc muốn hoàn tất phiếu này?")) return;
    setActionLoading(true);
    try {
      await ownerCompleteTransfer(id, { gymId: selectedGymId });
      alert("Xác nhận nhận hàng thành công");
      fetchTransfers();
      if (detail?.id === id) fetchDetail(id);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchMyGyms();
  }, [fetchMyGyms]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers, page]);

  useEffect(() => {
    const transferId = searchParams.get("transferId");

    if (!transferId) {
      openedTransferRef.current = null;
      return;
    }

    if (openedTransferRef.current === transferId) {
      return;
    }

    openedTransferRef.current = transferId;
    fetchDetail(transferId);
  }, [fetchDetail, searchParams]);

  useOwnerRealtimeRefresh({
    onRefresh: async () => {
      await fetchTransfers(page, filters);
      if (showDetailModal && detail?.id) {
        await fetchDetail(detail.id, { openModal: false });
      }
    },
    events: ["transfer:changed"],
  });

  useEffect(() => {
    const nextFromGymId = selectedGymId ? String(selectedGymId) : "";
    setFilters((prev) => ({ ...prev, fromGymId: "", toGymId: "" }));
    setCreateForm((prev) => ({
      ...prev,
      fromGymId: nextFromGymId,
      items: prev.items.map((item) => ({ ...item, selectedUnitIds: [], quantity: "" })),
    }));
    setEquipmentUnitsByItem({});
    if (nextFromGymId) {
      fetchEquipmentByGym(nextFromGymId);
    } else {
      setEquipmentList([]);
    }
  }, [fetchEquipmentByGym, selectedGymId]);

  useEffect(() => {
    if (!showCreate || !createForm.fromGymId) return;
    fetchEquipmentByGym(createForm.fromGymId);
  }, [createForm.fromGymId, fetchEquipmentByGym, showCreate]);

  return (
    <div className="otrf-page">
      <div className="otrf-head">
        <div>
          <h2>Chuyển kho</h2>
          <p>{selectedGymName ? `Đang quản lý các phiếu chuyển kho liên quan đến chi nhánh ${selectedGymName}. Phiếu tạo mới sẽ xuất từ chi nhánh này, và chỉ chi nhánh nhận mới được xác nhận nhận hàng.` : "Quản lý chuyển thiết bị giữa các cơ sở. Phiếu tạo mới sẽ được duyệt tự động."}</p>
        </div>
        <button className="btn-primary" onClick={() => {
          resetCreateState();
          setShowCreate(true);
        }}>
          + Tạo phiếu chuyển kho
        </button>
      </div>

      <div className="otrf-filters">
        <input
          className="otrf-filter-input"
          placeholder="Tìm theo mã phiếu, gym hoặc trạng thái..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applySearch();
          }}
        />

        <select
          className="otrf-filter-select"
          value={filters.status}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Bị từ chối</option>
          <option value="completed">Hoàn tất</option>
        </select>

        <select
          className="otrf-filter-select"
          value={filters.fromGymId}
          onChange={(e) => setFilters((prev) => ({ ...prev, fromGymId: e.target.value }))}
        >
          <option value="">Tất cả từ phòng tập</option>
          {myGyms.map((g) => (
            <option key={`from-${g.id}`} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <select
          className="otrf-filter-select"
          value={filters.toGymId}
          onChange={(e) => setFilters((prev) => ({ ...prev, toGymId: e.target.value }))}
        >
          <option value="">Tất cả đến phòng tập</option>
          {myGyms.map((g) => (
            <option key={`to-${g.id}`} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <button className="otrf-filter-btn" onClick={applySearch}>Tìm</button>
        <button className="otrf-filter-btn otrf-filter-btn-reset" onClick={resetSearch}>Đặt lại</button>
      </div>

      <div className="otrf-container">
        {/* List */}
        <div className="otrf-list">
          {loading && <div className="otrf-loading">Đang tải...</div>}
          <div className="otrf-table-wrap">
            <table className="otrf-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Từ gym</th>
                  <th>Đến gym</th>
                  <th>Trạng thái</th>
                  <th>Ngày</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => {
                      fetchDetail(t.id);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>#{t.id}</td>
                    <td>{t.fromGym?.name || "-"}</td>
                    <td>{t.toGym?.name || "-"}</td>
                    <td>
                      <span className={`otrf-badge otrf-badge-${t.status}`}>
                        {statusBadge(t.status)}
                      </span>
                    </td>
                    <td>{new Date(t.createdAt).toLocaleDateString("vi-VN")}</td>
                  </tr>
                ))}
                {transfers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="otrf-empty">
                      Không có phiếu chuyển kho
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
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && detail && (
        <div className="modal-overlay" onClick={closeDetailModal}>
          <div className="modal-content modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Chi tiết phiếu chuyển kho #{detail.id}</h2>
              <button className="modal-close" onClick={closeDetailModal}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Từ Phòng tập:</span>
                  <span className="detail-value">{detail.fromGym?.name || "—"}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Đến Phòng tập:</span>
                  <span className="detail-value">{detail.toGym?.name || "—"}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Trạng thái:</span>
                  <span className="detail-value">
                    <span className={`otrf-badge otrf-badge-${detail.status}`}>
                      {statusBadge(detail.status)}
                    </span>
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Ngày tạo:</span>
                  <span className="detail-value">{new Date(detail.createdAt).toLocaleString("vi-VN")}</span>
                </div>

                {detail.notes && (
                  <div className="detail-row detail-row--full">
                    <span className="detail-label">Ghi chú:</span>
                    <span className="detail-value">{detail.notes}</span>
                  </div>
                )}

                {detail.status === "approved" && Number(selectedGymId || 0) !== Number(detail.toGymId) && (
                  <div className="detail-row detail-row--full">
                    <span className="detail-label">Xác nhận:</span>
                    <span className="detail-value">
                      Phiếu này chỉ được xác nhận tại chi nhánh nhận hàng: {detail.toGym?.name || `#${detail.toGymId}`}
                    </span>
                  </div>
                )}

                <div className="detail-row detail-row--full">
                  <span className="detail-label">Thiết bị chuyển:</span>
                  <div className="detail-value">
                    <table className="detail-table">
                      <thead>
                        <tr>
                          <th>Tên thiết bị</th>
                          <th>Mã</th>
                          <th>Số lượng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.items?.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.equipment?.name || "-"}</td>
                            <td>{item.equipment?.code || "-"}</td>
                            <td>
                              {item.quantity}
                              {Array.isArray(item.selectedUnits) && item.selectedUnits.length > 0 ? ` (${item.selectedUnits.map((unit) => unit.assetCode).join(", ")})` : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {detail.status === "pending" && (
                <>
                  <button
                    onClick={() => {
                      handleApprove(detail.id);
                      closeDetailModal();
                    }}
                    className="btn-success"
                    disabled={actionLoading}
                  >
                    ✓ Duyệt
                  </button>
                  <button
                    onClick={() => {
                      handleReject(detail.id);
                      closeDetailModal();
                    }}
                    className="btn-danger"
                    disabled={actionLoading}
                  >
                    ✗ Từ chối
                  </button>
                </>
              )}
              {detail.status === "approved" && Number(selectedGymId || 0) === Number(detail.toGymId) && (
                <>
                  <button
                    onClick={() => {
                      handleReject(detail.id);
                      closeDetailModal();
                    }}
                    className="btn-danger"
                    disabled={actionLoading}
                  >
                    ✗ Từ chối nhận hàng
                  </button>
                  <button
                    onClick={() => {
                      handleComplete(detail.id);
                      closeDetailModal();
                    }}
                    className="btn-success"
                    disabled={actionLoading}
                  >
                    ✓ Xác nhận nhận hàng
                  </button>
                </>
              )}
              <button onClick={closeDetailModal} className="btn-cancel">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal-content modal-create" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Tạo phiếu chuyển kho</h2>
              <button className="modal-close" onClick={closeCreateModal}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="modal-form">
                <div className="form-group">
                  <label>Gym đi *</label>
                  <select
                    value={createForm.fromGymId}
                    onChange={(e) => {
                      const newGymId = e.target.value;
                      setCreateForm({
                        ...createForm,
                        fromGymId: newGymId,
                        items: createForm.items.map((item) => ({ ...item, selectedUnitIds: [], quantity: "" })),
                      });
                      setEquipmentUnitsByItem({});
                      fetchEquipmentByGym(newGymId);
                    }}
                    required
                    className="form-select"
                    disabled={Boolean(selectedGymId)}
                  >
                    {!selectedGymId && <option value="">-- Chọn gym --</option>}
                    {myGyms.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Gym đến *</label>
                  <select
                    value={createForm.toGymId}
                    onChange={(e) => setCreateForm({ ...createForm, toGymId: e.target.value })}
                    required
                    className="form-select"
                  >
                    <option value="">-- Chọn gym --</option>
                    {myGyms.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Ghi chú</label>
                  <textarea
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    placeholder="Ghi chú (tuỳ chọn)"
                    rows={3}
                    className="form-textarea"
                  />
                </div>

                <div className="form-group">
                  <label>Thiết bị chuyển *</label>
                  {createForm.items.map((item, idx) => (
                    <div key={idx} className="equipment-item-row">
                      <select
                        value={item.equipmentId}
                        onChange={(e) => {
                          const newItems = [...createForm.items];
                          newItems[idx].equipmentId = e.target.value;
                          newItems[idx].selectedUnitIds = [];
                          newItems[idx].quantity = "";
                          setCreateForm({ ...createForm, items: newItems });
                          fetchEquipmentUnits(e.target.value, createForm.fromGymId, idx);
                        }}
                        required
                        className="form-select"
                      >
                        <option value="">-- Chọn thiết bị --</option>
                        {equipmentList
                          .filter((eq) => Number(eq?.unitSummary?.inStockQuantity ?? eq?.stock?.availableQuantity ?? 0) > 0)
                          .map((eq) => (
                          <option key={eq.id} value={eq.id}>
                            {eq.name} (Mã: {eq.code}) - Còn: {eq.unitSummary?.inStockQuantity ?? eq.stock?.availableQuantity ?? 0}
                          </option>
                        ))}
                      </select>
                      <div className="equipment-item-unit-picker">
                        <div className="equipment-item-toolbar">
                          <button
                            type="button"
                            className="equipment-item-toolbar__btn"
                            onClick={() => setAllUnits(idx, "all")}
                            disabled={!item.equipmentId || (equipmentUnitsByItem[idx] || []).length === 0}
                          >
                            Chọn tất cả
                          </button>
                          <button
                            type="button"
                            className="equipment-item-toolbar__btn equipment-item-toolbar__btn--ghost"
                            onClick={() => setAllUnits(idx, "none")}
                            disabled={(item.selectedUnitIds || []).length === 0}
                          >
                            Bỏ chọn
                          </button>
                        </div>
                        <div className={`equipment-item-list ${!item.equipmentId ? "is-disabled" : ""}`}>
                          {(equipmentUnitsByItem[idx] || [])
                            .map((unit) => {
                              const checked = Array.isArray(item.selectedUnitIds)
                                ? item.selectedUnitIds.map(Number).includes(Number(unit.id))
                                : false;

                              return (
                                <label key={unit.id} className={`equipment-item-option ${checked ? "is-selected" : ""}`}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleUnitSelection(idx, unit.id)}
                                  />
                                  <span>{unit.assetCode}</span>
                                  <span className="equipment-item-option__meta">Đang ở kho</span>
                                </label>
                              );
                            })}
                          {item.equipmentId && (equipmentUnitsByItem[idx] || []).length === 0 ? (
                            <div className="equipment-item-empty">Không có thiết bị trong kho phù hợp</div>
                          ) : null}
                        </div>
                      </div>
                      <div className="equipment-item-meta">
                        <span className="equipment-item-meta__count">
                          Có thể chuyển: {(equipmentUnitsByItem[idx] || []).length} thiết bị trong kho
                        </span>
                        <span className="equipment-item-meta__hint">
                          Chỉ hiển thị thiết bị đang ở kho để chuyển
                        </span>
                      </div>
                      {item.selectedUnitIds?.length > 0 && (
                        <div className="equipment-item-selected">
                          {(equipmentUnitsByItem[idx] || [])
                            .filter((unit) => item.selectedUnitIds.includes(Number(unit.id)))
                            .map((unit) => (
                              <span key={unit.id} className="equipment-item-chip">
                                {unit.assetCode}
                              </span>
                            ))}
                        </div>
                      )}
                      {createForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            removeCreateItem(idx);
                          }}
                          className="btn-remove"
                        >
                          ✗
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setCreateForm({
                        ...createForm,
                        items: [...createForm.items, { equipmentId: "", quantity: "", selectedUnitIds: [] }],
                      });
                    }}
                    className="btn-add-item"
                  >
                    + Thêm thiết bị
                  </button>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={closeCreateModal} className="btn-cancel">
                    Hủy
                  </button>
                  <button type="submit" className="btn-submit" disabled={actionLoading}>
                    ✓ Tạo
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
