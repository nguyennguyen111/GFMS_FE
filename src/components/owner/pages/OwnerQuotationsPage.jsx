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

const formatCurrency = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;

const getItemTotal = (item) => Number(item?.quantity || 0) * Number(item?.unitPrice || 0);

export default function OwnerQuotationsPage() {
  const [loading, setLoading] = useState(false);
  const [quotations, setQuotations] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [gyms, setGyms] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [recentUnitPriceMap, setRecentUnitPriceMap] = useState({});

  const [formData, setFormData] = useState({
    gymId: "",
    supplierId: "",
    notes: "",
    items: [{ equipmentId: "", quantity: 1, unitPrice: 0 }]
  });

  const totalQuotationAmount = formData.items.reduce((sum, item) => sum + getItemTotal(item), 0);

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

  const fetchRecentUnitPrices = async () => {
    try {
      const listRes = await ownerGetQuotations({ page: 1, limit: 20 });
      const recentQuotations = listRes?.data?.data ?? [];
      if (!recentQuotations.length) return;

      const detailResults = await Promise.all(
        recentQuotations.map(async (q) => {
          try {
            return await ownerGetQuotationDetail(q.id);
          } catch (_) {
            return null;
          }
        })
      );

      const map = {};
      detailResults.forEach((res) => {
        const items = res?.data?.data?.items ?? [];
        items.forEach((item) => {
          const equipmentId = Number(item?.equipmentId || item?.equipment?.id || 0);
          const unitPrice = Number(item?.unitPrice || 0);
          if (equipmentId > 0 && unitPrice > 0 && map[equipmentId] == null) {
            map[equipmentId] = unitPrice;
          }
        });
      });

      setRecentUnitPriceMap(map);
    } catch (_) {
      setRecentUnitPriceMap({});
    }
  };

  const handleOpenModal = () => {
    setFormData({
      gymId: "",
      supplierId: "",
      notes: "",
      items: [{ equipmentId: "", quantity: 1, unitPrice: 0 }]
    });
    if (Object.keys(recentUnitPriceMap).length === 0) {
      fetchRecentUnitPrices();
    }
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
      const defaultPrice = Number(equipment?.price || 0);
      const recentPrice = Number(recentUnitPriceMap[Number(value)] || 0);

      if (defaultPrice > 0) {
        updated[idx].unitPrice = defaultPrice;
      } else if (recentPrice > 0) {
        updated[idx].unitPrice = recentPrice;
      }
    }

    if (field === 'equipmentId' && !value) {
      updated[idx].unitPrice = 0;
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
      alert("Tạo đơn mua thành công!");
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
    fetchRecentUnitPrices();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="oq-page">
      <div className="oq-head">
        <div>
          <h2>Mua thiết bị </h2>
          <p>Quản lý đơn mua hàng </p>
        </div>
        <button className="btn-primary" onClick={handleOpenModal}>
          + Tạo đơn mua mới
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
                  <th>Mã đơn hàng</th>
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
                    onClick={() => {
                      fetchDetail(q.id);
                      setShowDetailModal(true);
                    }}
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
                      Không có đơn mua
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="pagination-btn"
              >
                Trước
              </button>
              <span className="pagination-info">
                Trang {meta.page} / {meta.totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
                disabled={page === meta.totalPages}
                className="pagination-btn"
              >
                Sau
              </button>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && detail && (
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Chi tiết đơn mua hàng #{detail.id}</h3>
                <button className="modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="detail-grid">
                  <div className="detail-row">
                    <span className="detail-label">ID</span>
                    <span className="detail-value">#{detail.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Nhà cung cấp</span>
                    <span className="detail-value">{detail.supplier?.name || "-"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Gym</span>
                    <span className="detail-value">{detail.gym?.name || "-"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Trạng thái</span>
                    <span className="detail-value">
                      <span className={`oq-badge oq-badge-${detail.status}`}>
                        {statusBadge(detail.status)}
                      </span>
                    </span>
                  </div>
                  <div className="detail-row detail-row--full">
                    <span className="detail-label">Ghi chú</span>
                    <span className="detail-value">{detail.notes || "-"}</span>
                  </div>
                </div>

                <h4 style={{ marginTop: "20px", marginBottom: "12px", color: "#f1f5f9" }}>Danh sách thiết bị</h4>
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
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tạo đơn mua mới</h3>
              <button className="modal-close" onClick={handleCloseModal}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-form">
                <div className="form-group">
                  <label>Chọn gym</label>
                  <select className="form-select" value={formData.gymId} onChange={(e) => setFormData({ ...formData, gymId: e.target.value })}>
                    <option value="">-- Chọn gym --</option>
                    {gyms.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Nhà cung cấp</label>
                  <select className="form-select" value={formData.supplierId} onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}>
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Ghi chú</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Ghi chú thêm..."
                  />
                </div>

                <h4 style={{ marginTop: "15px", marginBottom: "10px", color: "#f1f5f9" }}>Danh sách thiết bị</h4>
                {formData.items.map((item, idx) => (
                  <React.Fragment key={`item-${idx}`}>
                    <div className="oq-item-row">
                      <select
                        className="form-select"
                        value={item.equipmentId}
                        onChange={(e) => handleItemChange(idx, "equipmentId", e.target.value)}
                      >
                        <option value="">-- Chọn thiết bị --</option>
                        {equipments.map((eq) => (
                          <option key={`eq-${eq.id}-${idx}`} value={eq.id}>{eq.name}</option>
                        ))}
                      </select>
                      <input
                        className="form-input"
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                        placeholder="SL"
                      />
                      <input
                        className="form-input"
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, "unitPrice", Number(e.target.value))}
                        placeholder="Đơn giá"
                      />
                      <div className="oq-item-total">
                        {formatCurrency(getItemTotal(item))}
                      </div>
                      <button
                        className="btn-danger"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={formData.items.length === 1}
                      >
                        ✕
                      </button>
                    </div>
                    {item.equipmentId && Number(item.unitPrice || 0) === 0 && (
                      <div className="oq-item-price-hint">
                        Thiết bị này chưa có đơn giá mặc định, vui lòng nhập đơn giá để tính tiền.
                      </div>
                    )}
                  </React.Fragment>
                ))}

                <div className="oq-total-box">
                  <span>Tổng tiền tạm tính</span>
                  <strong>{formatCurrency(totalQuotationAmount)}</strong>
                </div>

                <button className="btn-primary" onClick={handleAddItem} style={{ marginTop: "10px" }}>
                  + Thêm thiết bị
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={handleCloseModal} className="btn-cancel">Hủy</button>
              <button onClick={handleSubmit} className="btn-submit">Tạo đơn mua</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
