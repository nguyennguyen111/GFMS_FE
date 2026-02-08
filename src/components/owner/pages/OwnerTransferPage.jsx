import React, { useEffect, useState } from "react";
import "./OwnerTransferPage.css";
import {
  ownerGetTransfers,
  ownerGetTransferDetail,
  ownerCreateTransfer,
  ownerApproveTransfer,
  ownerRejectTransfer,
  ownerCompleteTransfer,
} from "../../../services/ownerTransferService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import { ownerGetEquipments } from "../../../services/ownerEquipmentService";

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
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [myGyms, setMyGyms] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);

  // Create form state
  const [createForm, setCreateForm] = useState({
    fromGymId: "",
    toGymId: "",
    items: [{ equipmentId: "", quantity: "" }],
    notes: "",
  });

  const [actionLoading, setActionLoading] = useState(false);

  // Fetch transfers list
  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await ownerGetTransfers({ page, limit: 10 });
      setTransfers(res?.data?.data ?? []);
      setMeta(res?.data?.meta ?? { page, limit: 10, totalItems: 0, totalPages: 1 });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch my gyms for dropdown
  const fetchMyGyms = async () => {
    try {
      const res = await ownerGetMyGyms();
      setMyGyms(res?.data?.data ?? []);
    } catch (e) {
      console.error("Failed to fetch gyms:", e.message);
    }
  };

  // Fetch equipment list when fromGym changes
  const fetchEquipmentByGym = async (gymId) => {
    if (!gymId) {
      setEquipmentList([]);
      return;
    }
    try {
      const res = await ownerGetEquipments({ gymId, limit: 1000 });
      setEquipmentList(res?.data?.data ?? []);
    } catch (e) {
      console.error("Failed to fetch equipment:", e.message);
      setEquipmentList([]);
    }
  };

  // Fetch detail when selected
  const fetchDetail = async (id) => {
    try {
      const res = await ownerGetTransferDetail(id);
      setDetail(res?.data?.data);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  // Handle create transfer
  const handleCreate = async () => {
    if (!createForm.fromGymId || !createForm.toGymId) {
      alert("Vui lòng chọn gym đi và gym đến");
      return;
    }
    if (createForm.items.some((i) => !i.equipmentId || !i.quantity)) {
      alert("Vui lòng điền đầy đủ thông tin thiết bị");
      return;
    }

    setActionLoading(true);
    try {
      await ownerCreateTransfer({
        fromGymId: createForm.fromGymId,
        toGymId: createForm.toGymId,
        items: createForm.items,
        notes: createForm.notes,
      });
      alert("Tạo phiếu chuyển kho thành công");
      setShowCreate(false);
      setCreateForm({ fromGymId: "", toGymId: "", items: [{ equipmentId: "", quantity: "" }], notes: "" });
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
    if (!window.confirm("Bạn có chắc muốn từ chối phiếu này?")) return;
    setActionLoading(true);
    try {
      await ownerRejectTransfer(id);
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
    if (!window.confirm("Bạn có chắc muốn hoàn tất phiếu này?")) return;
    setActionLoading(true);
    try {
      await ownerCompleteTransfer(id);
      alert("Hoàn tất thành công");
      fetchTransfers();
      if (detail?.id === id) fetchDetail(id);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
    fetchMyGyms();
    // eslint-disable-next-line
  }, [page]);

  return (
    <div className="otrf-page">
      <div className="otrf-head">
        <div>
          <h2>Chuyển kho</h2>
          <p>Quản lý chuyển thiết bị giữa các cơ sở</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + Tạo phiếu chuyển kho
        </button>
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
                      setShowDetailModal(true);
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

          <div className="otrf-paging">
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
      </div>

      {/* Detail Modal */}
      {showDetailModal && detail && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Chi tiết phiếu chuyển kho #{detail.id}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Từ Gym:</span>
                  <span className="detail-value">{detail.fromGym?.name || "—"}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Đến Gym:</span>
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
                            <td>{item.quantity}</td>
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
                      setShowDetailModal(false);
                    }}
                    className="btn-success"
                    disabled={actionLoading}
                  >
                    ✓ Duyệt
                  </button>
                  <button
                    onClick={() => {
                      handleReject(detail.id);
                      setShowDetailModal(false);
                    }}
                    className="btn-danger"
                    disabled={actionLoading}
                  >
                    ✗ Từ chối
                  </button>
                </>
              )}
              {detail.status === "approved" && (
                <button
                  onClick={() => {
                    handleComplete(detail.id);
                    setShowDetailModal(false);
                  }}
                  className="btn-success"
                  disabled={actionLoading}
                >
                  ✓ Hoàn tất
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
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content modal-create" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Tạo phiếu chuyển kho</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>
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
                      setCreateForm({ ...createForm, fromGymId: newGymId });
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
                          setCreateForm({ ...createForm, items: newItems });
                        }}
                        required
                        className="form-select"
                      >
                        <option value="">-- Chọn thiết bị --</option>
                        {equipmentList.map((eq) => (
                          <option key={eq.id} value={eq.id}>
                            {eq.name} (Mã: {eq.code}) - Còn: {eq.stock?.availableQuantity || 0}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        placeholder="Số lượng"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...createForm.items];
                          newItems[idx].quantity = e.target.value;
                          setCreateForm({ ...createForm, items: newItems });
                        }}
                        required
                        className="form-input"
                      />
                      {createForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = createForm.items.filter((_, i) => i !== idx);
                            setCreateForm({ ...createForm, items: newItems });
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
                        items: [...createForm.items, { equipmentId: "", quantity: "" }],
                      });
                    }}
                    className="btn-add-item"
                  >
                    + Thêm thiết bị
                  </button>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-cancel">
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
