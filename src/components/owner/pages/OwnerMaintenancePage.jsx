import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./OwnerMaintenancePage.css";
import {
  ownerGetMaintenances,
  ownerGetMaintenanceDetail,
  ownerCreateMaintenance,
  ownerCancelMaintenance,
} from "../../../services/ownerMaintenanceService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import { ownerGetEquipments, ownerGetEquipmentDetail } from "../../../services/ownerEquipmentService";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import useSelectedGym from "../../../hooks/useSelectedGym";
import { showAppConfirm } from "../../../utils/appDialog";

const statusOptions = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Chờ duyệt" },
  { value: "approve", label: "Đã duyệt" },
  { value: "assigned", label: "Đã phân công" },
  { value: "in_progress", label: "Đang xử lý" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

const formatMaintenanceStatus = (status) => {
  const statusMap = {
    pending: "Chờ duyệt",
    assigned: "Đã phân công",
    in_progress: "Đang xử lý",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
    approve: "Đã duyệt",
  };
  return statusMap[String(status || "").toLowerCase()] || status || "-";
};

const money = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString("vi-VN");
};

const formatDateTime = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "—");

const getMaintenanceCode = (value) => {
  const id = Number(value || 0);
  return id ? `MT-${String(id).padStart(6, "0")}` : "—";
};

const getEtaText = (row) => {
  if (!row?.targetCompletionDate) return "Chưa có ETA";

  const dateText = formatDateTime(row.targetCompletionDate);
  const end = new Date(row.targetCompletionDate).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

  if (row?.status === "completed") return `${dateText} · Đã hoàn tất`;
  if (row?.status === "cancelled") return `${dateText} · Đã đóng`;
  if (diffDays > 0) return `${dateText} · Còn ${diffDays} ngày`;
  if (diffDays === 0) return `${dateText} · Đến hạn hôm nay`;
  return `${dateText} · Quá hạn ${Math.abs(diffDays)} ngày`;
};

export default function OwnerMaintenancePage() {
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });

  const [filters, setFilters] = useState({ status: "", gymId: "", q: "" });
  const [page, setPage] = useState(1);
  const limit = 10;

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [myGyms, setMyGyms] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [equipmentUnits, setEquipmentUnits] = useState([]);
  const [unitSearchTerm, setUnitSearchTerm] = useState("");

  const [modal, setModal] = useState({ open: false, type: "", payload: {} });

  // Fetch gyms for owner
  const fetchMyGyms = useCallback(async () => {
    try {
      const res = await ownerGetMyGyms();
      setMyGyms(res.data.data || []);
    } catch (e) {
      console.error("Failed to fetch gyms:", e.message);
    }
  }, []);

  const fetchList = useCallback(async () => {
    try {
      const activeGymId = selectedGymId ? String(selectedGymId) : String(filters.gymId || "");
      const res = await ownerGetMaintenances({ ...filters, gymId: activeGymId || undefined, page, limit });
      const rawData = res?.data?.data ?? res?.data?.rows ?? [];
      const data = activeGymId
        ? rawData.filter((row) => String(row?.gymId || row?.Gym?.id || row?.gym?.id || "") === activeGymId)
        : rawData;
      const metaFrom = res?.data?.meta;

      setRows(data);
      setMeta(
        metaFrom || {
          page,
          limit,
          totalItems: data.length,
          totalPages: metaFrom?.totalPages || 1,
        }
      );
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  }, [filters, limit, page, selectedGymId]);

  const fetchDetail = useCallback(async (id) => {
    try {
      const res = await ownerGetMaintenanceDetail(id);
      setDetail(res.data.data || res.data);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  }, []);

  useEffect(() => {
    fetchMyGyms();
  }, [fetchMyGyms]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, gymId: selectedGymId ? String(selectedGymId) : "" }));
    setPage(1);
  }, [selectedGymId]);

  useEffect(() => {
    fetchList();
  }, [fetchList, page]);

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
  }, [fetchDetail, selectedId]);

  useOwnerRealtimeRefresh({
    onRefresh: async () => {
      await fetchList();
      if (selectedId) {
        await fetchDetail(selectedId);
      }
    },
    events: ["notification:new", "maintenance:changed"],
    notificationTypes: ["maintenance"],
  });

  const fetchEquipmentByGym = async (gymId) => {
    if (!gymId) {
      setEquipmentList([]);
      setEquipmentUnits([]);
      return;
    }
    try {
      const res = await ownerGetEquipments({ page: 1, limit: 1000, gymId: gymId });
      const data = res?.data?.data ?? [];
      setEquipmentList(data);
    } catch (e) {
      console.error("Failed to fetch equipment:", e.message);
    }
  };

  const fetchEquipmentUnits = async (equipmentId, gymId) => {
    if (!equipmentId || !gymId) {
      setEquipmentUnits([]);
      return;
    }
    try {
      const res = await ownerGetEquipmentDetail(equipmentId, { gymId });
      const units = Array.isArray(res?.data?.data?.units) ? res.data.data.units : [];
      setEquipmentUnits(
        units.filter(
          (unit) => Number(unit.gymId) === Number(gymId) && unit.status === "active" && !unit.transferId
        )
      );
    } catch (e) {
      console.error("Failed to fetch equipment units:", e.message);
      setEquipmentUnits([]);
    }
  };

  const openCreateModal = () => {
    setModal({ 
      open: true, 
      type: "create", 
      payload: { gymId: selectedGymId ? String(selectedGymId) : "", equipmentId: "", equipmentUnitId: "", issueDescription: "" } 
    });
    setEquipmentList([]);
    setEquipmentUnits([]);
    setUnitSearchTerm("");
    if (selectedGymId) {
      fetchEquipmentByGym(selectedGymId);
    }
  };

  const closeModal = () => {
    setModal({ open: false, type: "", payload: {} });
    setEquipmentUnits([]);
    setUnitSearchTerm("");
  };

  const canCancel = useMemo(() => detail?.status === "pending", [detail]);

  const doCreate = async () => {
    try {
      // Convert string values to numbers
      const payload = {
        gymId: Number(modal.payload.gymId),
        equipmentId: Number(modal.payload.equipmentId),
        equipmentUnitId: modal.payload.equipmentUnitId ? Number(modal.payload.equipmentUnitId) : null,
        issueDescription: modal.payload.issueDescription || "",
      };
      await ownerCreateMaintenance(payload);
      closeModal();
      setSelectedId(null);
      setDetail(null);
      setPage(1);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const doCancel = async () => {
    const confirmResult = await showAppConfirm({
      title: "Xác nhận hủy",
      message: "Hủy yêu cầu bảo trì này?",
      confirmText: "Xác nhận",
      cancelText: "Quay lại",
    });
    if (!confirmResult.confirmed) return;
    try {
      await ownerCancelMaintenance(selectedId);
      setSelectedId(null);
      setDetail(null);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  return (
    <div className="oma-page">
      <div className="oma-head">
        <div>
          <div className="oma-title">Bảo trì / Sửa chữa</div>
          <div className="oma-sub">{selectedGymName ? `Đang quản lý bảo trì của chi nhánh ${selectedGymName}` : "Tạo yêu cầu bảo trì thiết bị của gym"}</div>
        </div>
        <button className="oma-btn oma-btn--primary" onClick={openCreateModal}>
          + Tạo mới
        </button>
      </div>

      <div className="oma-filters">
        <div className="oma-field">
          <label>Trạng thái</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="oma-field">
          <label>Phòng tập</label>
          <select
            value={filters.gymId}
            onChange={(e) => setFilters((s) => ({ ...s, gymId: e.target.value }))}
            disabled={Boolean(selectedGymId)}
          >
            {!selectedGymId && <option value="">Tất cả phòng tập</option>}
            {myGyms.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="oma-field oma-field--grow">
          <label>Tìm kiếm</label>
          <input
            value={filters.q}
            onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
            placeholder="mô tả / ghi chú..."
          />
        </div>

        <button
          className="oma-btn oma-btn--primary"
          onClick={() => {
            setPage(1);
            fetchList();
          }}
        >
          Tìm kiếm
        </button>
      </div>

      <div className="oma-grid">
        <div className="oma-card">
          <div className="oma-card__head">
            <div className="oma-card__title">Danh sách yêu cầu</div>
            <div className="oma-card__meta">
              Tổng: <b>{meta.totalItems}</b>
            </div>
          </div>

          <div className="oma-table-wrap">
            <table className="oma-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Trạng thái</th>
                  <th>Phòng tập</th>
                  <th>Thiết bị</th>
                  <th>Trạng thái thời hạn</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => {
                      setSelectedId(r.id);
                      fetchDetail(r.id).then(() => setShowDetailModal(true));
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{getMaintenanceCode(r.id)}</td>
                    <td>
                      <span className={`oma-pill oma-pill--${r.status}`}>{formatMaintenanceStatus(r.status)}</span>
                    </td>
                    <td>{r.Gym?.name || r.gym?.name || r.gymId || "-"}</td>
                    <td>{r.Equipment?.name || r.equipment?.name || r.equipmentId || "-"}</td>
                    <td>{getEtaText(r)}</td>
                    <td>{formatDateTime(r.createdAt)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="oma-empty">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="oma-paging">
            <button
              disabled={meta.page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="oma-btn"
            >
              Trước
            </button>
            <span className="oma-paging__text">
              Trang {meta.page || 1} / {meta.totalPages || 1}
            </span>
            <button
              disabled={(meta.page || 1) >= (meta.totalPages || 1)}
              onClick={() => setPage((p) => Math.min(meta.totalPages || 1, p + 1))}
              className="oma-btn"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && detail && (
        <div className="oma-modal__backdrop" onClick={() => setShowDetailModal(false)}>
          <div className="oma-modal oma-modal--detail" onClick={(e) => e.stopPropagation()}>
            <div className="oma-modal__head">
              <h2 className="oma-modal__title">Chi tiết yêu cầu bảo trì #{detail.id}</h2>
              <button className="oma-btn oma-btn--ghost" onClick={() => setShowDetailModal(false)}>
                ×
              </button>
            </div>
            
            <div className="oma-modal__body">
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Mã yêu cầu:</span>
                  <span className="detail-value">{getMaintenanceCode(detail.id)}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Trạng thái:</span>
                  <span className="detail-value">
                    <span className={`oma-pill oma-pill--${detail.status}`}>{formatMaintenanceStatus(detail.status)}</span>
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Phòng tập:</span>
                  <span className="detail-value">{detail.Gym?.name || detail.gym?.name || "—"}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Thiết bị:</span>
                  <span className="detail-value">{detail.Equipment?.name || detail.equipment?.name || "—"}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Mã đơn vị:</span>
                  <span className="detail-value">{detail.equipmentUnit?.assetCode || "—"}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Ngày tạo:</span>
                  <span className="detail-value">
                    {formatDateTime(detail.createdAt)}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Lịch dự kiến kiểm tra:</span>
                  <span className="detail-value">
                    {formatDateTime(detail.scheduledDate)}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Hạn hoàn tất dự kiến:</span>
                  <span className="detail-value">{formatDateTime(detail.targetCompletionDate)}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Trạng thái thời hạn:</span>
                  <span className="detail-value">{getEtaText(detail)}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Ước tính:</span>
                  <span className="detail-value">{money(detail.estimatedCost)} đ</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Thực tế:</span>
                  <span className="detail-value">{money(detail.actualCost)} đ</span>
                </div>

                <div className="detail-row detail-row--full">
                  <span className="detail-label">Vấn đề:</span>
                  <span className="detail-value">{detail.issueDescription || "—"}</span>
                </div>

                {detail.notes && (
                  <div className="detail-row detail-row--full">
                    <span className="detail-label">Ghi chú:</span>
                    <span className="detail-value">{detail.notes}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="oma-modal__actions">
              {canCancel && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    doCancel();
                  }}
                  className="oma-btn oma-btn--danger"
                >
                  ✗ Hủy yêu cầu
                </button>
              )}
              <button onClick={() => setShowDetailModal(false)} className="oma-btn">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {modal.open && (
        <div className="oma-modal__backdrop" onClick={closeModal}>
          <div className="oma-modal oma-modal--create" onClick={(e) => e.stopPropagation()}>
            <div className="oma-modal__head">
              <h2 className="oma-modal__title">Tạo yêu cầu bảo trì</h2>
              <button className="oma-btn oma-btn--ghost" onClick={closeModal}>
                ×
              </button>
            </div>

            <div className="oma-modal__body">
              <div className="oma-info-banner">Sau khi tạo yêu cầu, hệ thống sẽ tự động gửi thông báo cho admin và hiển thị ETA dự kiến hoàn tất cho owner.</div>
              <form onSubmit={(e) => { e.preventDefault(); doCreate(); }} className="oma-form">
                <div className="oma-field">
                  <label>Gym *</label>
                  <select
                    value={modal.payload.gymId}
                    onChange={(e) => {
                      const newGymId = e.target.value;
                      setModal((m) => ({ ...m, payload: { ...m.payload, gymId: newGymId, equipmentId: "", equipmentUnitId: "" } }));
                      setUnitSearchTerm("");
                      fetchEquipmentByGym(newGymId);
                    }}
                    required
                    className="oma-select"
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

                <div className="oma-field">
                  <label>Thiết bị *</label>
                  <select
                    value={modal.payload.equipmentId}
                    onChange={(e) => {
                      const nextEquipmentId = e.target.value;
                      setModal((m) => ({ ...m, payload: { ...m.payload, equipmentId: nextEquipmentId, equipmentUnitId: "" } }));
                      setUnitSearchTerm("");
                      fetchEquipmentUnits(nextEquipmentId, modal.payload.gymId);
                    }}
                    required
                    className="oma-select"
                  >
                    <option value="">-- Chọn thiết bị --</option>
                    {equipmentList.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name} (Mã: {eq.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="oma-field">
                  <label>Đơn vị thiết bị cụ thể *</label>
                  <input
                    type="text"
                    value={unitSearchTerm}
                    onChange={(e) => setUnitSearchTerm(e.target.value)}
                    placeholder="Tìm theo asset code..."
                    className="oma-input"
                    disabled={!modal.payload.equipmentId}
                  />
                  <div className={`oma-unit-list ${!modal.payload.equipmentId ? "is-disabled" : ""}`}>
                    {equipmentUnits
                      .filter((unit) => {
                        const keyword = String(unitSearchTerm || "").trim().toLowerCase();
                        return !keyword || String(unit.assetCode || "").toLowerCase().includes(keyword);
                      })
                      .map((unit) => {
                        const selected = Number(modal.payload.equipmentUnitId) === Number(unit.id);
                        return (
                          <button
                            key={unit.id}
                            type="button"
                            className={`oma-unit-option ${selected ? "is-selected" : ""}`}
                            onClick={() => setModal((m) => ({ ...m, payload: { ...m.payload, equipmentUnitId: String(unit.id) } }))}
                          >
                            <span className="oma-unit-option__radio">{selected ? "◉" : "○"}</span>
                            <span>{unit.assetCode}</span>
                            <span className="oma-unit-option__meta">
                              {unit.usageStatus === "in_use" ? "Đang sử dụng" : "Trong kho"}
                            </span>
                          </button>
                        );
                      })}
                    {modal.payload.equipmentId && equipmentUnits.filter((unit) => {
                      const keyword = String(unitSearchTerm || "").trim().toLowerCase();
                      return !keyword || String(unit.assetCode || "").toLowerCase().includes(keyword);
                    }).length === 0 ? (
                      <div className="oma-unit-empty">Không có thiết bị phù hợp</div>
                    ) : null}
                  </div>
                  <div className="oma-unit-meta">
                    <span className="oma-unit-meta__count">Có thể chọn: {equipmentUnits.length} thiết bị</span>
                    <span className="oma-unit-meta__hint">Có thể chọn thiết bị trong kho hoặc đang sử dụng</span>
                  </div>
                  {modal.payload.equipmentUnitId && (
                    <div className="oma-unit-selected">
                      <span className="oma-unit-chip">
                        {equipmentUnits.find((unit) => Number(unit.id) === Number(modal.payload.equipmentUnitId))?.assetCode || modal.payload.equipmentUnitId}
                      </span>
                    </div>
                  )}
                </div>

                <div className="oma-field">
                  <label>Mô tả vấn đề *</label>
                  <textarea
                    value={modal.payload.issueDescription}
                    onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, issueDescription: e.target.value } }))}
                    placeholder="Mô tả chi tiết vấn đề cần bảo trì..."
                    required
                    className="oma-textarea"
                    rows={4}
                  />
                </div>

                <div className="oma-modal__actions">
                  <button type="button" onClick={closeModal} className="oma-btn">
                    Hủy
                  </button>
                  <button type="submit" className="oma-btn oma-btn--primary">
                    ✓ Tạo yêu cầu
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
