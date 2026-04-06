import React, { useCallback, useEffect, useRef, useState } from "react";
import "./OwnerFranchiseRequestsPage.css";
import { useSearchParams } from "react-router-dom";
import {
  ownerGetMyFranchiseRequests,
  ownerGetFranchiseRequestDetail,
  ownerCreateFranchiseRequest,
  ownerUpdateFranchiseRequest,
  ownerDeleteFranchiseRequest,
} from "../../../services/ownerFranchiseService";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";

const STATUS_LABELS = {
  pending: { label: "Chờ duyệt", color: "warning" },
  approved: { label: "Đã duyệt", color: "success" },
  rejected: { label: "Từ chối", color: "danger" },
};

function StatusBadge({ status }) {
  const info = STATUS_LABELS[status] || { label: status, color: "secondary" };
  return <span className={`ofr-badge ofr-badge--${info.color}`}>{info.label}</span>;
}

function Field({ label, required, hint, children }) {
  return (
    <div className="ofr-field">
      <label className="ofr-field__label">
        {label}
        {required && <span className="ofr-required">*</span>}
      </label>
      {hint && <div className="ofr-field__hint">{hint}</div>}
      <div className="ofr-field__control">{children}</div>
    </div>
  );
}

const INITIAL_FORM = {
  businessName: "",
  location: "",
  contactPerson: "",
  contactPhone: "",
  contactEmail: "",
  investmentAmount: "",
  businessPlan: "",
};

export default function OwnerFranchiseRequestsPage() {
  const [searchParams] = useSearchParams();
  const openedRequestRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({});

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRequest, setDetailRequest] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });

  const [filters, setFilters] = useState({ q: "", status: "" });
  const [currentPage, setCurrentPage] = useState(1);

  // Load danh sách
  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = { ...filters, page: currentPage, limit: 10 };

      const res = await ownerGetMyFranchiseRequests(params);
      setRequests(res.data.data || []);
      setPagination(res.data.pagination || {});
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải danh sách");
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests, currentPage]);

  const loadRequestDetail = useCallback(async (requestId) => {
    if (!requestId) return;

    try {
      setDetailLoading(true);
      setError("");
      const res = await ownerGetFranchiseRequestDetail(requestId);
      setDetailRequest(res.data?.data || null);
      setShowDetailModal(true);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải chi tiết yêu cầu");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      openedRequestRef.current = null;
      return;
    }

    if (openedRequestRef.current === requestId) {
      return;
    }

    openedRequestRef.current = requestId;
    loadRequestDetail(requestId);
  }, [loadRequestDetail, searchParams]);

  useOwnerRealtimeRefresh({
    onRefresh: async () => {
      await loadRequests();
      if (detailRequest?.id) {
        await loadRequestDetail(detailRequest.id);
      }
    },
    events: ["notification:new", "franchise:changed"],
    notificationTypes: ["franchise"],
  });

  // Mở modal tạo mới
  const handleCreate = () => {
    setEditing(null);
    setForm({ ...INITIAL_FORM });
    setShowModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setDetailRequest(null);
  };

  // Mở modal sửa
  const handleEdit = (req) => {
    setEditing(req);
    setForm({
      businessName: req.businessName || "",
      location: req.location || "",
      contactPerson: req.contactPerson || "",
      contactPhone: req.contactPhone || "",
      contactEmail: req.contactEmail || "",
      investmentAmount: req.investmentAmount || "",
      businessPlan: req.businessPlan || "",
    });
    setShowModal(true);
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (editing) {
        await ownerUpdateFranchiseRequest(editing.id, form);
        setSuccess("Cập nhật yêu cầu thành công!");
      } else {
        await ownerCreateFranchiseRequest(form);
        setSuccess("Tạo yêu cầu nhượng quyền thành công!");
      }

      setShowModal(false);
      loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  // Xóa request
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa yêu cầu này?")) return;

    try {
      setError("");
      setSuccess("");
      await ownerDeleteFranchiseRequest(id);
      setSuccess("Đã xóa yêu cầu");
      loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể xóa");
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return "—";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <div className="ofr-page">
      <div className="ofr-header">
        <h1 className="ofr-title">Yêu cầu nhượng quyền</h1>
        <button className="ofr-btn ofr-btn--primary" onClick={handleCreate}>
          + Tạo yêu cầu mới
        </button>
      </div>

      {error && <div className="ofr-alert ofr-alert--danger">{error}</div>}
      {success && <div className="ofr-alert ofr-alert--success">{success}</div>}

      {/* Filter */}
      <div className="ofr-filters">
        <input
          placeholder="Tìm theo tên doanh nghiệp, địa điểm, người liên hệ..."
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">Tất cả</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Từ chối</option>
        </select>
        <button className="btn-primary" onClick={() => { setCurrentPage(1); loadRequests(); }}>
          Tìm
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="ofr-loading">Đang tải...</div>
      ) : requests.length === 0 ? (
        <div className="ofr-empty">Chưa có yêu cầu nào</div>
      ) : (
        <>
          <table className="ofr-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên doanh nghiệp</th>
                <th>Địa điểm</th>
                <th>Người liên hệ</th>
                <th>Số vốn dự kiến</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr
                  key={req.id}
                  className={detailRequest?.id === req.id ? "ofr-row ofr-row--active" : "ofr-row"}
                  onClick={() => loadRequestDetail(req.id)}
                >
                  <td>{req.id}</td>
                  <td>{req.businessName}</td>
                  <td>{req.location}</td>
                  <td>
                    {req.contactPerson}
                    <br />
                    <small>{req.contactPhone}</small>
                  </td>
                  <td>{formatCurrency(req.investmentAmount)}</td>
                  <td>
                    <StatusBadge status={req.status} />
                  </td>
                  <td>{formatDate(req.createdAt)}</td>
                  <td>
                    <div className="ofr-actions">
                      {req.status === "pending" && (
                        <>
                          <button
                            className="ofr-btn ofr-btn--sm ofr-btn--secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(req);
                            }}
                          >
                            Sửa
                          </button>
                          <button
                            className="ofr-btn ofr-btn--sm ofr-btn--danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(req.id);
                            }}
                          >
                            Xóa
                          </button>
                        </>
                      )}
                      {req.status === "approved" && (
                        <span className="ofr-text--success">✓ Đã được duyệt</span>
                      )}
                      {req.status === "rejected" && (
                        <span className="ofr-text--danger">✗ Đã từ chối</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="ofr-pagination">
              <button
                className="ofr-btn ofr-btn--sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Trước
              </button>
              <span>
                Trang {currentPage} / {pagination.totalPages}
              </span>
              <button
                className="ofr-btn ofr-btn--sm"
                disabled={currentPage === pagination.totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {showDetailModal && (
        <div className="ofr-modal">
          <div className="ofr-modal__backdrop" onClick={handleCloseDetail} />
          <div className="ofr-modal__content ofr-modal__content--detail">
            <div className="ofr-modal__header">
              <h2>Chi tiết yêu cầu nhượng quyền</h2>
              <button className="ofr-modal__close" onClick={handleCloseDetail}>
                ×
              </button>
            </div>

            <div className="ofr-detail">
              {detailLoading ? (
                <div className="ofr-loading ofr-loading--modal">Đang tải chi tiết...</div>
              ) : detailRequest ? (
                <>
                  <div className="ofr-detail__grid">
                    <div className="ofr-detail__item">
                      <span className="ofr-detail__label">Mã yêu cầu</span>
                      <span className="ofr-detail__value">#{detailRequest.id}</span>
                    </div>
                    <div className="ofr-detail__item">
                      <span className="ofr-detail__label">Trạng thái</span>
                      <span className="ofr-detail__value"><StatusBadge status={detailRequest.status} /></span>
                    </div>
                    <div className="ofr-detail__item">
                      <span className="ofr-detail__label">Tên doanh nghiệp</span>
                      <span className="ofr-detail__value">{detailRequest.businessName || "—"}</span>
                    </div>
                    <div className="ofr-detail__item">
                      <span className="ofr-detail__label">Địa điểm</span>
                      <span className="ofr-detail__value">{detailRequest.location || "—"}</span>
                    </div>
                    <div className="ofr-detail__item">
                      <span className="ofr-detail__label">Người liên hệ</span>
                      <span className="ofr-detail__value">{detailRequest.contactPerson || "—"}</span>
                    </div>
                    <div className="ofr-detail__item">
                      <span className="ofr-detail__label">Số điện thoại</span>
                      <span className="ofr-detail__value">{detailRequest.contactPhone || "—"}</span>
                    </div>
                    <div className="ofr-detail__item">
                      <span className="ofr-detail__label">Email</span>
                      <span className="ofr-detail__value">{detailRequest.contactEmail || "—"}</span>
                    </div>
                    <div className="ofr-detail__item">
                      <span className="ofr-detail__label">Số vốn dự kiến</span>
                      <span className="ofr-detail__value">{formatCurrency(detailRequest.investmentAmount)}</span>
                    </div>
                    <div className="ofr-detail__item">
                      <span className="ofr-detail__label">Ngày tạo</span>
                      <span className="ofr-detail__value">{formatDate(detailRequest.createdAt)}</span>
                    </div>
                    <div className="ofr-detail__item">
                      <span className="ofr-detail__label">Người xử lý</span>
                      <span className="ofr-detail__value">{detailRequest.reviewer?.username || "—"}</span>
                    </div>
                  </div>

                  <div className="ofr-detail__section">
                    <div className="ofr-detail__label">Kế hoạch kinh doanh</div>
                    <div className="ofr-detail__panel">{detailRequest.businessPlan || "Chưa có mô tả."}</div>
                  </div>

                  <div className="ofr-form__actions ofr-form__actions--detail">
                    {detailRequest.status === "pending" && (
                      <button
                        type="button"
                        className="ofr-btn ofr-btn--secondary"
                        onClick={() => {
                          handleCloseDetail();
                          handleEdit(detailRequest);
                        }}
                      >
                        Sửa yêu cầu
                      </button>
                    )}
                    <button type="button" className="ofr-btn ofr-btn--primary" onClick={handleCloseDetail}>
                      Đóng
                    </button>
                  </div>
                </>
              ) : (
                <div className="ofr-empty ofr-empty--modal">Không có dữ liệu chi tiết</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="ofr-modal">
          <div className="ofr-modal__backdrop" onClick={() => setShowModal(false)} />
          <div className="ofr-modal__content">
            <div className="ofr-modal__header">
              <h2>{editing ? "Sửa yêu cầu" : "Tạo yêu cầu nhượng quyền"}</h2>
              <button className="ofr-modal__close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="ofr-form">
              <Field label="Tên doanh nghiệp" required>
                <input
                  type="text"
                  className="ofr-input"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  required
                />
              </Field>

              <Field label="Địa điểm" required>
                <input
                  type="text"
                  className="ofr-input"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  required
                />
              </Field>

              <Field label="Người liên hệ" required>
                <input
                  type="text"
                  className="ofr-input"
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  required
                />
              </Field>

              <Field label="Số điện thoại" hint="10-11 chữ số">
                <input
                  type="tel"
                  className="ofr-input"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  pattern="[0-9]{10,11}"
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  className="ofr-input"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                />
              </Field>

              <Field label="Số vốn dự kiến" hint="VNĐ">
                <input
                  type="number"
                  className="ofr-input"
                  value={form.investmentAmount}
                  onChange={(e) => setForm({ ...form, investmentAmount: e.target.value })}
                  min="0"
                  step="1000000"
                />
              </Field>

              <Field label="Kế hoạch kinh doanh">
                <textarea
                  className="ofr-textarea"
                  rows="6"
                  value={form.businessPlan}
                  onChange={(e) => setForm({ ...form, businessPlan: e.target.value })}
                  placeholder="Mô tả kế hoạch kinh doanh, mục tiêu, thị trường..."
                />
              </Field>

              <div className="ofr-form__actions">
                <button
                  type="button"
                  className="ofr-btn ofr-btn--secondary"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="ofr-btn ofr-btn--primary">
                  {editing ? "Cập nhật" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
