import React, { useEffect, useMemo, useState } from "react";
import "./OwnerPackagesPage.css";
import {
  ownerGetPackages,
  ownerCreatePackage,
  ownerUpdatePackage,
  ownerTogglePackage,
} from "../../../services/ownerPackageService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import ownerTrainerService from "../../../services/ownerTrainerService";

const emptyForm = {
  gymId: "",
  name: "",
  description: "",
  type: "basic",
  packageType: "membership", // membership | personal_training
  trainerId: "", // Chỉ áp dụng cho personal_training
  durationDays: 30,
  price: 0,
  sessions: 0,
  commissionRate: 0.6,
};

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function OwnerPackagesPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [trainers, setTrainers] = useState([]);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // all | active | inactive
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // create | edit
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((p) => {
      const matchText =
        !s ||
        (p.name || "").toLowerCase().includes(s) ||
        (p.description || "").toLowerCase().includes(s) ||
        (p.type || "").toLowerCase().includes(s);

      const matchActive =
        activeFilter === "all"
          ? true
          : activeFilter === "active"
          ? p.status === 'ACTIVE'
          : p.status !== 'ACTIVE';

      return matchText && matchActive;
    });
  }, [items, search, activeFilter]);

  const gymFilteredTrainers = useMemo(() => {
    if (!form.gymId) return [];
    return trainers.filter((trainer) => {
      const trainerGymId = trainer?.gymId ?? trainer?.Gym?.id;
      return String(trainerGymId || "") === String(form.gymId);
    });
  }, [trainers, form.gymId]);

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  const fetchData = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await ownerGetPackages();
      // Lọc bỏ các item NULL hoặc không hợp lệ
      const validItems = (res.data?.data || []).filter(item => item && item.id && item.name);
      setItems(validItems);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  const loadGyms = async () => {
    try {
      const response = await ownerGetMyGyms();
      setGyms(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error("Lỗi khi load danh sách phòng gym:", error);
      setGyms([]);
    }
  };

  const loadTrainers = async () => {
    try {
      const response = await ownerTrainerService.getMyTrainers();
      setTrainers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Lỗi khi load danh sách PT:", error);
      setTrainers([]);
    }
  };

  useEffect(() => {
    fetchData();
    loadGyms();
    loadTrainers();
  }, []);

  const openCreate = () => {
    setModalMode("create");
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (pkg) => {
    setModalMode("edit");
    setEditing(pkg);
    setForm({
      gymId: pkg.gymId ?? "",
      name: pkg.name ?? "",
      description: pkg.description ?? "",
      type: pkg.type ?? "basic",
      packageType: pkg.packageType ?? "membership",
      trainerId: pkg.trainerId ?? "",
      durationDays: pkg.durationDays ?? 30,
      price: pkg.price ?? 0,
      sessions: pkg.sessions ?? 0,
      commissionRate: pkg.commissionRate ?? 0.6,
    });
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const submit = async () => {
    setErr("");

    if (!form.gymId || !form.name.trim()) {
      setErr("Vui lòng nhập Gym ID và Tên gói.");
      return;
    }

    if (form.packageType === "personal_training" && !form.trainerId) {
      setErr("Vui lòng chọn PT cho gói Personal Training.");
      return;
    }

    const payload = {
      gymId: safeNum(form.gymId),
      name: form.name.trim(),
      description: form.description,
      type: form.type,
      packageType: form.packageType,
      trainerId: form.packageType === 'personal_training' && form.trainerId ? safeNum(form.trainerId) : null,
      durationDays: safeNum(form.durationDays),
      price: safeNum(form.price),
      sessions: safeNum(form.sessions),
      commissionRate: safeNum(form.commissionRate, 0.6),
    };

    try {
      if (modalMode === "create") {
        await ownerCreatePackage(payload);
      } else {
        await ownerUpdatePackage(editing.id, payload);
      }
      setModalOpen(false);
      await fetchData();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Save failed");
    }
  };

  const toggle = async (pkg) => {
    try {
      await ownerTogglePackage(pkg.id);
      await fetchData();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Toggle failed");
    }
  };

  return (
    <div className="op-wrap">
      <div className="op-head">
        <div>
          <h2 className="op-title">Quản lý gói tập</h2>
          <div className="op-sub">
            Tạo / cập nhật / kích hoạt-hủy kích hoạt gói tập theo gym thuộc quyền quản lý.
          </div>
        </div>

        <button className="op-btn op-btn--primary" onClick={openCreate}>
          + Tạo gói
        </button>
      </div>

      <div className="op-toolbar">
        <input
          className="op-input"
          placeholder="Tìm theo tên / mô tả / type..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />

        <select
          className="op-select"
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">Tất cả</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Ngừng hoạt động</option>
        </select>

        <button className="op-btn" onClick={fetchData}>
          Tìm kiếm
        </button>
      </div>

      {!!err && <div className="op-error">⚠ {err}</div>}

      <div className="op-table-wrapper">
        {loading ? (
          <div className="op-empty">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="op-empty">Không có gói nào phù hợp.</div>
        ) : (
          <table className="op-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên gói</th>
                <th>Gym</th>
                <th>Loại gói</th>
                <th>PT</th>
                <th>Thời hạn</th>
                <th>Giá</th>
                <th>Buổi</th>
                <th>Trạng thái</th>
                <th style={{ width: 220 }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((p) => {
                const gym = gyms.find(g => g.id === p.gymId);
                const trainer = trainers.find(t => t.id === p.trainerId);
                return (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>
                      <div className="op-name">{p.name}</div>
                      <div className="op-desc">{p.description}</div>
                    </td>
                    <td>{gym ? gym.name : `#${p.gymId}`}</td>
                    <td>
                      <span className={`op-badge ${p.packageType === 'membership' ? 'badge-membership' : 'badge-pt'}`}>
                        {p.packageType === 'membership' ? '🏋️ Membership' : '👤 PT'}
                      </span>
                    </td>
                    <td>{trainer ? trainer.User?.username : '-'}</td>
                    <td>{p.durationDays} ngày</td>
                    <td>{Number(p.price).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₫</td>
                    <td>{p.packageType === 'membership' ? 'Không giới hạn' : p.sessions}</td>
                    <td>
                      <span className={`op-badge ${p.status === 'ACTIVE' ? "is-on" : "is-off"}`}>
                        {p.status === 'ACTIVE' ? "Đang hoạt động" : "Ngừng hoạt động"}
                      </span>
                    </td>
                    <td>
                      <div className="op-actions">
                        <button className="op-btn--edit" onClick={() => openEdit(p)}>
                          Sửa
                        </button>
                        {p.status === 'ACTIVE' ? (
                          <button
                            className="op-btn--deactivate"
                            onClick={() => toggle(p)}
                          >
                            Hủy kích hoạt
                          </button>
                        ) : (
                          <button
                            className="op-btn--activate"
                            onClick={() => toggle(p)}
                          >
                            Kích hoạt
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div className="op-pagination">
          <button 
            className="op-pagination-btn"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Trước
          </button>
          <span className="op-pagination-pages">
            Trang {currentPage} / {totalPages}
          </span>
          <button 
            className="op-pagination-btn"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Sau
          </button>
        </div>
      )}

      {/* MODAL */}
      {modalOpen && (
        <div className="op-modal">
          <div className="op-modal__panel">
            <div className="op-modal__head">
              <div className="op-modal__title">
                {modalMode === "create" ? "Tạo gói mới" : `Cập nhật gói #${editing?.id}`}
              </div>
              <button className="op-x" onClick={closeModal}>✕</button>
            </div>

            <div className="op-form">
              <div className="op-row">
                <label>Chọn phòng gym *</label>
                <select
                  className="op-select"
                  value={form.gymId}
                  onChange={(e) => setForm({ ...form, gymId: e.target.value, trainerId: "" })}
                  required
                >
                  <option value="">-- Chọn gym --</option>
                  {gyms.map((gym) => (
                    <option key={gym.id} value={gym.id}>
                      {gym.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="op-row">
                <label>Tên gói *</label>
                <input
                  className="op-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="VD: Gói 12 buổi PT"
                />
              </div>

              <div className="op-row">
                <label>Mô tả</label>
                <textarea
                  className="op-textarea"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="op-row">
                <label>Loại gói *</label>
                <select
                  className="op-select"
                  value={form.packageType}
                  onChange={(e) => setForm({ ...form, packageType: e.target.value, trainerId: "" })}
                >
                  <option value="membership">🏋️ Membership (Thẻ tập gym)</option>
                  <option value="personal_training">👤 Personal Training (Gói PT)</option>
                </select>
              </div>

              {form.packageType === 'personal_training' && (
                <div className="op-row">
                  <label>Chọn PT *</label>
                  <select
                    className="op-select"
                    value={form.trainerId}
                    onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
                    disabled={!form.gymId}
                  >
                    <option value="">{form.gymId ? "-- Chọn PT --" : "-- Chọn gym trước --"}</option>
                    {gymFilteredTrainers.map((trainer) => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.User?.username || `Trainer #${trainer.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="op-grid">
                <div className="op-row">
                  <label>Phân loại</label>
                  <select
                    className="op-select"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="basic">Cơ bản</option>
                    <option value="premium">Cao cấp</option>
                    <option value="pt_only">Chỉ PT</option>
                    <option value="unlimited">Không giới hạn</option>
                  </select>
                </div>

                <div className="op-row">
                  <label>Thời hạn (ngày)</label>
                  <input
                    className="op-input"
                    type="number"
                    value={form.durationDays}
                    onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
                    placeholder="30"
                  />
                </div>

                <div className="op-row">
                  <label>Giá (VNĐ)</label>
                  <input
                    className="op-input"
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0"
                  />
                </div>

                {form.packageType === 'personal_training' && (
                  <div className="op-row">
                    <label>Số buổi tập *</label>
                    <input
                      className="op-input"
                      type="number"
                      value={form.sessions}
                      onChange={(e) => setForm({ ...form, sessions: e.target.value })}
                      placeholder="VD: 12"
                    />
                  </div>
                )}

                {form.packageType === 'personal_training' && (
                  <div className="op-row">
                    <label>Tỷ lệ hoa hồng PT</label>
                    <input
                      className="op-input"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={form.commissionRate}
                      onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
                      placeholder="0.6"
                    />
                    <small style={{color: 'rgba(238, 242, 255, 0.6)', fontSize: '0.75rem', marginTop: '4px', display: 'block'}}>Nhập giá trị từ 0 đến 1 (VD: 0.6 = 60%)</small>
                  </div>
                )}

              </div>

              {!!err && <div className="op-error">⚠ {err}</div>}

              <div className="op-modal__foot">
                <button className="op-btn" onClick={closeModal}>Hủy</button>
                <button className="op-btn op-btn--primary" onClick={submit}>
                  {modalMode === "create" ? "Tạo" : "Lưu"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
