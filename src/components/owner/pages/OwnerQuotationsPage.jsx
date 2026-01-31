import React, { useEffect, useState } from "react";
import "./OwnerQuotationsPage.css";
import { ownerGetQuotations, ownerGetQuotationDetail, ownerCreateQuotation, ownerGetSuppliers } from "../../../services/ownerPurchaseService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import { ownerGetEquipments } from "../../../services/ownerEquipmentService";

const statusBadge = (status) => {
  const map = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Bị từ chối",
  };
  return map[status] || status;
};

export default function OwnerQuotationsPage() {
  const [loading, setLoading] = useState(false);
  const [quotations, setQuotations] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [gyms, setGyms] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [equipments, setEquipments] = useState([]);

  const [formData, setFormData] = useState({
    gymId: "",
    supplierId: "",
    notes: "",
    items: [{ equipmentId: "", quantity: 1, unitPrice: 0 }]
  });

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await ownerGetQuotations({ page, limit: 10 });
      setQuotations(res?.data?.data ?? []);
      setMeta(res?.data?.meta ?? { page, limit: 10, totalItems: 0, totalPages: 1 });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (quotationId) => {
    try {
      const res = await ownerGetQuotationDetail(quotationId);
      setDetail(res?.data?.data);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const fetchLookups = async () => {
    try {
      const [gymsRes, suppliersRes, equipmentsRes] = await Promise.all([
        ownerGetMyGyms(),
        ownerGetSuppliers({ page: 1, limit: 100 }),
        ownerGetEquipments({ page: 1, limit: 100 })
      ]);
      setGyms(gymsRes?.data?.data ?? []);
      setSuppliers(suppliersRes?.data?.data ?? []);
      setEquipments(equipmentsRes?.data?.data ?? []);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      gymId: "",
      supplierId: "",
      notes: "",
      items: [{ equipmentId: "", quantity: 1, unitPrice: 0 }]
    });
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { equipmentId: "", quantity: 1, unitPrice: 0 }]
    });
  };

  const handleRemoveItem = (idx) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== idx)
    });
  };

  const handleItemChange = (idx, field, value) => {
    const updated = [...formData.items];
    updated[idx][field] = value;
    
    // If equipment changed, auto-fill the unit price
    if (field === 'equipmentId' && value) {
      const equipment = equipments.find(eq => eq.id === Number(value));
      if (equipment && equipment.price) {
        updated[idx].unitPrice = Number(equipment.price);
      }
    }
    
    setFormData({ ...formData, items: updated });
  };

  const handleSubmit = async () => {
    if (!formData.gymId || !formData.supplierId || formData.items.length === 0) {
      alert("Vui lòng chọn gym, nhà cung cấp và thêm ít nhất 1 thiết bị");
      return;
    }
    const hasInvalidItem = formData.items.some(it => !it.equipmentId || it.quantity < 1);
    if (hasInvalidItem) {
      alert("Vui lòng điền đầy đủ thông tin thiết bị và số lượng > 0");
      return;
    }
    try {
      await ownerCreateQuotation(formData);
      alert("Tạo báo giá thành công!");
      setShowModal(false);
      if (page === 1) {
        fetchQuotations();
      } else {
        setPage(1);
      }
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  useEffect(() => {
    fetchQuotations();
    // eslint-disable-next-line
  }, [page]);

  useEffect(() => {
    fetchLookups();
  }, []);

  return (
    <div className="oq-page">
      <div className="oq-head">
        <div>
          <h2>Báo giá</h2>
          <p>Quản lý báo giá từ nhà cung cấp</p>
        </div>
        <button className="oq-btn-create" onClick={handleOpenModal}>
          + Tạo báo giá mới
        </button>
      </div>

      <div className="oq-container">
        {/* List */}
        <div className="oq-list">
          {loading && <div className="oq-loading">Đang tải...</div>}
          
          <div className="oq-table-wrap">
            <table className="oq-table">
              <thead>
                <tr>
                  <th>Mã báo giá</th>
                  <th>Nhà cung cấp</th>
                  <th>Gym</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => (
                  <tr
                    key={q.id}
                    onClick={() => fetchDetail(q.id)}
                    className={detail?.id === q.id ? "active" : ""}
                  >
                    <td>#{q.id}</td>
                    <td>{q.supplier?.name || "-"}</td>
                    <td>{q.gym?.name || "-"}</td>
                    <td>
                      <span className={`oq-badge oq-badge-${q.status}`}>
                        {statusBadge(q.status)}
                      </span>
                    </td>
                    <td>{new Date(q.createdAt).toLocaleDateString("vi-VN")}</td>
                  </tr>
                ))}
                {quotations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="oq-empty">
                      Không có báo giá
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="oq-pagination">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                ← Trước
              </button>
              <span>Trang {meta.page} / {meta.totalPages}</span>
              <button
                onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
                disabled={page === meta.totalPages}
              >
                Sau →
              </button>
            </div>
          )}
        </div>

        {/* Detail */}
        {detail && (
          <div className="oq-detail">
            <h3>Chi tiết báo giá</h3>
            <div className="oq-detail-field">
              <label>ID</label>
              <div>#{detail.id}</div>
            </div>
            <div className="oq-detail-field">
              <label>Nhà cung cấp</label>
              <div>{detail.supplier?.name || "-"}</div>
            </div>
            <div className="oq-detail-field">
              <label>Gym</label>
              <div>{detail.gym?.name || "-"}</div>
            </div>
            <div className="oq-detail-field">
              <label>Trạng thái</label>
              <div>
                <span className={`oq-badge oq-badge-${detail.status}`}>
                  {statusBadge(detail.status)}
                </span>
              </div>
            </div>
            <div className="oq-detail-field">
              <label>Ghi chú</label>
              <div>{detail.notes || "-"}</div>
            </div>

            <h4 style={{ marginTop: "15px", marginBottom: "10px", color: "#f1f5f9" }}>Danh sách thiết bị</h4>
            <div className="oq-items-table">
              <table>
                <thead>
                  <tr>
                    <th>Thiết bị</th>
                    <th>Số lượng</th>
                    <th>Đơn giá</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.equipment?.name || "-"}</td>
                      <td>{item.quantity}</td>
                      <td>{Number(item.unitPrice || 0).toLocaleString("vi-VN")} đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="oq-modal-overlay" onClick={handleCloseModal}>
          <div className="oq-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Tạo báo giá mới</h3>

            <div className="oq-form-group">
              <label>Chọn gym</label>
              <select value={formData.gymId} onChange={(e) => setFormData({ ...formData, gymId: e.target.value })}>
                <option value="">-- Chọn gym --</option>
                {gyms.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="oq-form-group">
              <label>Nhà cung cấp</label>
              <select value={formData.supplierId} onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}>
                <option value="">-- Chọn nhà cung cấp --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="oq-form-group">
              <label>Ghi chú</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ghi chú thêm..."
              />
            </div>

            <h4>Danh sách thiết bị</h4>
            {formData.items.map((item, idx) => (
              <div key={`item-${idx}`} className="oq-item-row">
                <select
                  value={item.equipmentId}
                  onChange={(e) => handleItemChange(idx, "equipmentId", e.target.value)}
                >
                  <option value="">-- Chọn thiết bị --</option>
                  {equipments.map((eq) => (
                    <option key={`eq-${eq.id}-${idx}`} value={eq.id}>{eq.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                  placeholder="SL"
                />
                <input
                  type="number"
                  min={0}
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(idx, "unitPrice", Number(e.target.value))}
                  placeholder="Đơn giá"
                />
                <button
                  className="oq-btn-remove"
                  onClick={() => handleRemoveItem(idx)}
                  disabled={formData.items.length === 1}
                >
                  ✕
                </button>
              </div>
            ))}

            <button className="oq-btn-add-item" onClick={handleAddItem}>
              + Thêm thiết bị
            </button>

            <div className="oq-modal-actions">
              <button onClick={handleCloseModal} className="oq-btn-cancel">Hủy</button>
              <button onClick={handleSubmit} className="oq-btn-submit">Tạo báo giá</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
