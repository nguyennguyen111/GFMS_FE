import React, { useEffect, useState } from "react";
import "./OwnerTrainerSharePage.css";
import {
  ownerGetMyTrainerShares,
  ownerCreateTrainerShare,
  ownerUpdateTrainerShare,
  ownerDeleteTrainerShare,
} from "../../../services/ownerTrainerShareService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import axios from "../../../setup/axios";

const STATUS_LABELS = {
  pending: { label: "Chờ duyệt", color: "warning" },
  approved: { label: "Đã duyệt", color: "success" },
  rejected: { label: "Từ chối", color: "danger" },
};

function StatusBadge({ status }) {
  const info = STATUS_LABELS[status] || { label: status, color: "secondary" };
  return <span className={`ots-badge ots-badge--${info.color}`}>{info.label}</span>;
}

function Field({ label, required, hint, children }) {
  return (
    <div className="ots-field">
      <label className="ots-field__label">
        {label}
        {required && <span className="ots-required">*</span>}
      </label>
      {hint && <div className="ots-field__hint">{hint}</div>}
      <div className="ots-field__control">{children}</div>
    </div>
  );
}

const INITIAL_FORM = {
  trainerId: "",
  fromGymId: "",
  toGymId: "",
  shareType: "temporary",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  commissionSplit: 0.7,
  notes: "",
};

export default function OwnerTrainerSharePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [shares, setShares] = useState([]);
  const [pagination, setPagination] = useState({});

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });

  const [filters, setFilters] = useState({ q: "", status: "" });
  const [currentPage, setCurrentPage] = useState(1);

  // Lookups
  const [gyms, setGyms] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  // Filter trainers by selected fromGym
  const availableTrainers = React.useMemo(() => {
    if (!form.fromGymId) return trainers;
    // Chỉ hiển thị PT đang được share đến gym này
    return trainers.filter(t => {
      // Nếu không có dữ liệu share, hiển thị tất cả
      return true; // TODO: filter based on TrainerShare data
    });
  }, [trainers, form.fromGymId]);

  // Load trainers khi chọn fromGym
  useEffect(() => {
    if (form.fromGymId) {
      const loadTrainersForGym = async () => {
        try {
          const res = await axios.get(`/api/owner/trainer-shares/available-trainers/${form.fromGymId}`);
          setTrainers(res.data?.trainers || []);
        } catch (err) {
          console.error("Failed to load trainers for gym:", err);
        }
      };
      loadTrainersForGym();
    } else {
      // Reset về tất cả trainers nếu không chọn gym
      loadLookups();
    }
  }, [form.fromGymId]);

  // Load lookups (gyms, trainers)
  const loadLookups = async () => {
    setLoadingLookups(true);
    try {
      const [gymsRes, trainersRes] = await Promise.all([
        ownerGetMyGyms(),
        axios.get("/api/trainer"), // Get all trainers
      ]);
      setGyms(gymsRes?.data?.data || []);
      setTrainers(trainersRes?.data?.trainers || []);
    } catch (err) {
      console.error("Failed to load lookups:", err);
    } finally {
      setLoadingLookups(false);
    }
  };

  // Load danh sách
  const loadShares = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { ...filters, page: currentPage, limit: 10 };

      console.log('Loading trainer shares with params:', params);
      const res = await ownerGetMyTrainerShares(params);
      console.log('Trainer shares response:', res);
      
      setShares(res.data?.data || []);
      setPagination(res.data?.pagination || {});
    } catch (err) {
      console.error('Error loading trainer shares:', err);
      setError(err.response?.data?.message || err.message || "Không thể tải danh sách");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadShares();
    // eslint-disable-next-line
  }, [currentPage]);

  // Mở modal tạo mới
  const handleCreate = () => {
    setEditing(null);
    setForm({ ...INITIAL_FORM });
    setShowModal(true);
  };

  // Mở modal sửa
  const handleEdit = (share) => {
    setEditing(share);
    setForm({
      trainerId: share.trainerId || "",
      fromGymId: share.fromGymId || "",
      toGymId: share.toGymId || "",
      shareType: share.shareType || "temporary",
      startDate: share.startDate ? share.startDate.slice(0, 10) : "",
      endDate: share.endDate ? share.endDate.slice(0, 10) : "",
      commissionSplit: share.commissionSplit || 0.7,
      notes: share.notes || "",
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
        await ownerUpdateTrainerShare(editing.id, form);
        setSuccess("Cập nhật yêu cầu thành công!");
      } else {
        await ownerCreateTrainerShare(form);
        setSuccess("Tạo yêu cầu chia sẻ trainer thành công!");
      }

      setShowModal(false);
      loadShares();
    } catch (err) {
      setError(err.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  // Xóa share
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa yêu cầu này?")) return;

    try {
      setError("");
      setSuccess("");
      await ownerDeleteTrainerShare(id);
      setSuccess("Đã xóa yêu cầu");
      loadShares();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể xóa");
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  return (
    <div className="ots-page">
      <div className="ots-header">
        <h1 className="ots-title">Chia sẻ PT</h1>
        <button className="ots-btn ots-btn--primary" onClick={handleCreate}>
          + Tạo yêu cầu mới
        </button>
      </div>

      {error && <div className="ots-alert ots-alert--danger">{error}</div>}
      {success && <div className="ots-alert ots-alert--success">{success}</div>}

      {/* Filter */}
      <div className="ots-filters">
        <input
          placeholder="Tìm theo tên trainer..."
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
        <button className="btn-primary" onClick={() => { setCurrentPage(1); loadShares(); }}>
          Tìm
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="ots-loading">Đang tải...</div>
      ) : error ? (
        <div className="ots-empty">
          <p style={{ color: '#ff5555' }}>Lỗi: {error}</p>
          <button className="ots-btn ots-btn--primary" onClick={loadShares}>
            Thử lại
          </button>
        </div>
      ) : shares.length === 0 ? (
        <div className="ots-empty">
          <p>Chưa có yêu cầu chia sẻ PT nào</p>
          <button className="ots-btn ots-btn--primary" onClick={handleCreate}>
            Tạo yêu cầu đầu tiên
          </button>
        </div>
      ) : (
        <>
          <table className="ots-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Trainer</th>
                <th>Từ Gym</th>
                <th>Đến Gym</th>
                <th>Loại</th>
                <th>Thời gian</th>
                <th>Hoa hồng</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {shares.map((share) => (
                <tr key={share.id}>
                  <td>{share.id}</td>
                  <td><strong>{share.Trainer?.User?.username || "—"}</strong></td>
                  <td>{share.fromGym?.name || "—"}</td>
                  <td>{share.toGym?.name || "—"}</td>
                  <td>{share.shareType}</td>
                  <td>
                    {formatDate(share.startDate)} - {formatDate(share.endDate)}
                  </td>
                  <td>{(share.commissionSplit * 100).toFixed(0)}%</td>
                  <td>
                    <StatusBadge status={share.status} />
                  </td>
                  <td>
                    <div className="ots-actions">
                      {share.status === "pending" && (
                        <>
                          <button
                            className="ots-btn ots-btn--sm ots-btn--secondary"
                            onClick={() => handleEdit(share)}
                          >
                            Sửa
                          </button>
                          <button
                            className="ots-btn ots-btn--sm ots-btn--danger"
                            onClick={() => handleDelete(share.id)}
                          >
                            Xóa
                          </button>
                        </>
                      )}
                      {share.status === "approved" && (
                        <span className="ots-text--success">✓ Đã được duyệt</span>
                      )}
                      {share.status === "rejected" && (
                        <span className="ots-text--danger">✗ Đã từ chối</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="ots-pagination">
              <button
                className="ots-btn ots-btn--sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Trước
              </button>
              <span>
                Trang {currentPage} / {pagination.totalPages}
              </span>
              <button
                className="ots-btn ots-btn--sm"
                disabled={currentPage === pagination.totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="ots-modal">
          <div className="ots-modal__backdrop" onClick={() => setShowModal(false)} />
          <div className="ots-modal__content">
            <div className="ots-modal__header">
              <h2>{editing ? "Sửa yêu cầu" : "Tạo yêu cầu chia sẻ PT"}</h2>
              <button className="ots-modal__close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="ots-form">
              <Field label="Từ Gym" required>
                <select
                  className="ots-select"
                  value={form.fromGymId}
                  onChange={(e) => setForm({ ...form, fromGymId: e.target.value, trainerId: '' })}
                  required
                  disabled={loadingLookups}
                >
                  <option value="">-- Chọn Gym --</option>
                  {gyms.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.address || g.location || 'N/A'})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Trainer" required>
                <select
                  className="ots-select"
                  value={form.trainerId}
                  onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
                  required
                  disabled={!form.fromGymId || loadingLookups}
                >
                  <option value="">
                    {!form.fromGymId ? "-- Chọn Gym trước --" : "-- Chọn Trainer --"}
                  </option>
                  {availableTrainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.User?.username || 'N/A'} {t.specialization ? `(${t.specialization})` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Đến Gym" required>
                <select
                  className="ots-select"
                  value={form.toGymId}
                  onChange={(e) => setForm({ ...form, toGymId: e.target.value })}
                  required
                  disabled={loadingLookups}
                >
                  <option value="">-- Chọn Gym --</option>
                  {gyms.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.address || g.location || 'N/A'})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Loại chia sẻ">
                <select
                  className="ots-select"
                  value={form.shareType}
                  onChange={(e) => setForm({ ...form, shareType: e.target.value })}
                >
                  <option value="temporary">Tạm thời</option>
                  <option value="permanent">Vĩnh viễn</option>
                </select>
              </Field>

              <div className="ots-row">
                <Field label="Ngày bắt đầu">
                  <input
                    type="date"
                    className="ots-input"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </Field>

                <Field label="Ngày kết thúc">
                  <input
                    type="date"
                    className="ots-input"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </Field>
              </div>

              <div className="ots-row">
                <Field label="Giờ bắt đầu">
                  <input
                    type="time"
                    className="ots-input"
                    value={form.startTime || ''}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </Field>

                <Field label="Giờ kết thúc">
                  <input
                    type="time"
                    className="ots-input"
                    value={form.endTime || ''}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Hoa hồng (%)" hint="Từ 0 đến 1 (vd: 0.7 = 70%)">
                <input
                  type="number"
                  className="ots-input"
                  value={form.commissionSplit}
                  onChange={(e) => setForm({ ...form, commissionSplit: e.target.value })}
                  min="0"
                  max="1"
                  step="0.01"
                />
              </Field>

              <Field label="Ghi chú">
                <textarea
                  className="ots-textarea"
                  rows="4"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ghi chú thêm về yêu cầu..."
                />
              </Field>

              <div className="ots-form__actions">
                <button
                  type="button"
                  className="ots-btn ots-btn--secondary"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="ots-btn ots-btn--primary">
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
