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
        <h2>Chuyển kho</h2>
        <p>Quản lý chuyển thiết bị giữa các cơ sở</p>
      </div>

      <button className="otrf-btn-new" onClick={() => setShowCreate(true)}>
        + Tạo phiếu chuyển kho
      </button>

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
                    onClick={() => fetchDetail(t.id)}
                    className={detail?.id === t.id ? "active" : ""}
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

        {/* Detail */}
        {detail && (
          <div className="otrf-detail">
            <h3>Chi tiết</h3>
            <div className="otrf-info">
              <p>
                <strong>ID:</strong> #{detail.id}
              </p>
              <p>
                <strong>Trạng thái:</strong>{" "}
                <span className={`otrf-badge otrf-badge-${detail.status}`}>
                  {statusBadge(detail.status)}
                </span>
              </p>
              <p>
                <strong>Từ gym:</strong> {detail.fromGym?.name}
              </p>
              <p>
                <strong>Đến gym:</strong> {detail.toGym?.name}
              </p>
              <p>
                <strong>Ngày tạo:</strong> {new Date(detail.createdAt).toLocaleString("vi-VN")}
              </p>
              {detail.notes && (
                <p>
                  <strong>Ghi chú:</strong> {detail.notes}
                </p>
              )}
            </div>

            <div className="otrf-items">
              <h4>Thiết bị chuyển</h4>
              <table className="otrf-items-table">
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

            {detail.status === "pending" && (
              <div className="otrf-actions">
                <button
                  className="otrf-btn-approve"
                  onClick={() => handleApprove(detail.id)}
                  disabled={actionLoading}
                >
                  Duyệt
                </button>
                <button
                  className="otrf-btn-reject"
                  onClick={() => handleReject(detail.id)}
                  disabled={actionLoading}
                >
                  Từ chối
                </button>
              </div>
            )}

            {detail.status === "approved" && (
              <div className="otrf-actions">
                <button
                  className="otrf-btn-complete"
                  onClick={() => handleComplete(detail.id)}
                  disabled={actionLoading}
                >
                  Hoàn tất
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="otrf-modal">
          <div className="otrf-modal-content">
            <h3>Tạo phiếu chuyển kho</h3>

            <div className="otrf-form-group">
              <label>Gym đi</label>
              <select
                value={createForm.fromGymId}
                onChange={(e) => {
                  const newGymId = e.target.value;
                  setCreateForm({ ...createForm, fromGymId: newGymId });
                  fetchEquipmentByGym(newGymId);
                }}
              >
                <option value="">-- Chọn gym --</option>
                {myGyms.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="otrf-form-group">
              <label>Gym đến</label>
              <select
                value={createForm.toGymId}
                onChange={(e) => setCreateForm({ ...createForm, toGymId: e.target.value })}
              >
                <option value="">-- Chọn gym --</option>
                {myGyms.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="otrf-form-group">
              <label>Ghi chú</label>
              <textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="Ghi chú (tuỳ chọn)"
                rows={3}
              />
            </div>

            <div className="otrf-form-group">
              <label>Thiết bị chuyển</label>
              {createForm.items.map((item, idx) => (
                <div key={idx} className="otrf-item-row">
                  <select
                    value={item.equipmentId}
                    onChange={(e) => {
                      const newItems = [...createForm.items];
                      newItems[idx].equipmentId = e.target.value;
                      setCreateForm({ ...createForm, items: newItems });
                    }}
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
                  />
                  {createForm.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newItems = createForm.items.filter((_, i) => i !== idx);
                        setCreateForm({ ...createForm, items: newItems });
                      }}
                    >
                      Xóa
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
                className="otrf-btn-add-item"
              >
                + Thêm thiết bị
              </button>
            </div>

            <div className="otrf-modal-actions">
              <button onClick={() => setShowCreate(false)}>Hủy</button>
              <button onClick={handleCreate} disabled={actionLoading} className="otrf-btn-primary">
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
