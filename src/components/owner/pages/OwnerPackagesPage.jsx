import React, { useEffect, useMemo, useState } from "react";
import "./OwnerPackagesPage.css";
import {
  ownerGetPackages,
  ownerCreatePackage,
  ownerUpdatePackage,
  ownerTogglePackage,
} from "../../../services/ownerPackageService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";

const emptyForm = {
  gymId: "",
  name: "",
  description: "",
  type: "basic",
  durationDays: 30,
  price: "",
  sessions: "",
  commissionRate: 0.6,
};

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatPackageType(type) {
  const normalized = String(type || "").toLowerCase();
  if (normalized === "premium") return "Cao cấp";
  return "Cơ bản";
}

export default function OwnerPackagesPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [gyms, setGyms] = useState([]);

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

  useEffect(() => {
    fetchData();
    loadGyms();
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
      setErr("Vui lòng nhập ID phòng tập và Tên gói.");
      return;
    }

    if (safeNum(form.sessions) <= 0) {
      setErr("Vui lòng nhập số buổi tập lớn hơn 0.");
      return;
    }

    const commissionRate = safeNum(form.commissionRate, 0.6);
    if (commissionRate < 0 || commissionRate > 1) {
      setErr("Tỷ lệ hoa hồng phải trong khoảng từ 0 đến 1.");
      return;
    }

    const payload = {
      gymId: safeNum(form.gymId),
      name: form.name.trim(),
      description: form.description,
      type: form.type === "premium" ? "premium" : "basic",
      packageType: "personal_training",
      trainerId: null,
      durationDays: safeNum(form.durationDays),
      price: safeNum(form.price),
      sessions: safeNum(form.sessions),
      commissionRate,
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
            Tạo / cập nhật / kích hoạt-hủy kích hoạt gói tập theo phòng tập thuộc quyền quản lý.
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
                <th>Phòng tập</th>
                <th>Loại gói</th>
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
                return (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>
                      <div className="op-name">{p.name}</div>
                      <div className="op-desc">{p.description}</div>
                    </td>
                    <td>{gym ? gym.name : `#${p.gymId}`}</td>
                    <td>
                      <span className="op-badge badge-pt">
                        {formatPackageType(p.type)}
                      </span>
                    </td>
                    <td>{p.durationDays} ngày</td>
                    <td>{Number(p.price).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₫</td>
                    <td>{p.sessions || 0}</td>
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
                <label>Chọn phòng tập *</label>
                <select
                  className="op-select"
                  value={form.gymId}
                  onChange={(e) => setForm({ ...form, gymId: e.target.value })}
                  required
                >
                  <option value="">-- Chọn phòng tập --</option>
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
                  placeholder="VD: Gói PT 12 buổi"
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

                <div className="op-row">
                  <label>Tỷ lệ hoa hồng huấn luyện viên</label>
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
