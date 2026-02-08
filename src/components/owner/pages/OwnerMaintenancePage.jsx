import React, { useEffect, useMemo, useState } from "react";
import "./OwnerMaintenancePage.css";
import {
  ownerGetMaintenances,
  ownerGetMaintenanceDetail,
  ownerCreateMaintenance,
  ownerCancelMaintenance,
} from "../../../services/ownerMaintenanceService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import { ownerGetEquipments } from "../../../services/ownerEquipmentService";

const statusOptions = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const money = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString("vi-VN");
};

export default function OwnerMaintenancePage() {
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

  const [modal, setModal] = useState({ open: false, type: "", payload: {} });

  // Fetch gyms for owner
  const fetchMyGyms = async () => {
    try {
      const res = await ownerGetMyGyms();
      setMyGyms(res.data.data || []);
    } catch (e) {
      console.error("Failed to fetch gyms:", e.message);
    }
  };

  const fetchList = async () => {
    try {
      const res = await ownerGetMaintenances({ ...filters, page, limit });
      const data = res?.data?.data ?? res?.data?.rows ?? [];
      const metaFrom = res?.data?.meta;

      setRows(data);
      setMeta(
        metaFrom || {
          page,
          limit,
          totalItems: res?.data?.count || data.length,
          totalPages: metaFrom?.totalPages || 1,
        }
      );
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const fetchDetail = async (id) => {
    try {
      const res = await ownerGetMaintenanceDetail(id);
      setDetail(res.data.data || res.data);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  useEffect(() => {
    fetchMyGyms();
  }, []);

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line
  }, [page]);

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
    // eslint-disable-next-line
  }, [selectedId]);

  const fetchEquipmentByGym = async (gymId) => {
    if (!gymId) {
      setEquipmentList([]);
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

  const openCreateModal = () => {
    setModal({ 
      open: true, 
      type: "create", 
      payload: { gymId: "", equipmentId: "", issueDescription: "" } 
    });
    setEquipmentList([]);
  };

  const closeModal = () => setModal({ open: false, type: "", payload: {} });

  const canCancel = useMemo(() => detail?.status === "pending", [detail]);

  const doCreate = async () => {
    try {
      // Convert string values to numbers
      const payload = {
        gymId: Number(modal.payload.gymId),
        equipmentId: Number(modal.payload.equipmentId),
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
    if (!window.confirm("Hủy yêu cầu bảo trì này?")) return;
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
          <div className="oma-sub">Tạo yêu cầu bảo trì thiết bị của gym</div>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          + Tạo mới
        </button>
      </div>

      <div className="oma-filters">
        <div className="oma-field">
          <label>Status</label>
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
          <label>GymId</label>
          <input
            value={filters.gymId}
            onChange={(e) => setFilters((s) => ({ ...s, gymId: e.target.value }))}
            placeholder="VD: 1"
          />
        </div>

        <div className="oma-field oma-field--grow">
          <label>Search</label>
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
          Tìm Kiếm 
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
                  <th>ID</th>
                  <th>Status</th>
                  <th>Gym</th>
                  <th>Equipment</th>
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
                    <td>#{r.id}</td>
                    <td>
                      <span className={`oma-pill oma-pill--${r.status}`}>{r.status}</span>
                    </td>
                    <td>{r.gymId ?? "-"}</td>
                    <td>{r.equipmentId ?? "-"}</td>
                    <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="oma-empty">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="oma-paging">
            <button className="oma-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ←
            </button>
            <div className="oma-paging__text">
              Page <b>{meta.page}</b> / {meta.totalPages}
            </div>
            <button
              className="oma-btn"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && detail && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Chi tiết yêu cầu bảo trì #{detail.id}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Trạng thái:</span>
                  <span className="detail-value">
                    <span className={`oma-pill oma-pill--${detail.status}`}>{detail.status}</span>
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Gym:</span>
                  <span className="detail-value">{detail.Gym?.name || detail.gym?.name || "—"}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Thiết bị:</span>
                  <span className="detail-value">{detail.Equipment?.name || detail.equipment?.name || "—"}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Ngày tạo:</span>
                  <span className="detail-value">
                    {detail.createdAt ? new Date(detail.createdAt).toLocaleString("vi-VN") : "—"}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Ngày duyệt:</span>
                  <span className="detail-value">
                    {detail.scheduledDate ? new Date(detail.scheduledDate).toLocaleString("vi-VN") : "—"}
                  </span>
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

            <div className="modal-footer">
              {canCancel && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    doCancel();
                  }}
                  className="btn-danger"
                >
                  ✗ Hủy yêu cầu
                </button>
              )}
              <button onClick={() => setShowDetailModal(false)} className="btn-cancel">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {modal.open && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-create" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Tạo yêu cầu bảo trì</h2>
              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); doCreate(); }} className="modal-form">
                <div className="form-group">
                  <label>Gym *</label>
                  <select
                    value={modal.payload.gymId}
                    onChange={(e) => {
                      const newGymId = e.target.value;
                      setModal((m) => ({ ...m, payload: { ...m.payload, gymId: newGymId, equipmentId: "" } }));
                      fetchEquipmentByGym(newGymId);
                    }}
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
                  <label>Thiết bị *</label>
                  <select
                    value={modal.payload.equipmentId}
                    onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, equipmentId: e.target.value } }))}
                    required
                    className="form-select"
                  >
                    <option value="">-- Chọn thiết bị --</option>
                    {equipmentList.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name} (Mã: {eq.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Mô tả vấn đề *</label>
                  <textarea
                    value={modal.payload.issueDescription}
                    onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, issueDescription: e.target.value } }))}
                    placeholder="Mô tả chi tiết vấn đề cần bảo trì..."
                    required
                    className="form-textarea"
                    rows={4}
                  />
                </div>

                <div className="form-actions">
                  <button type="button" onClick={closeModal} className="btn-cancel">
                    Hủy
                  </button>
                  <button type="submit" className="btn-submit">
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
