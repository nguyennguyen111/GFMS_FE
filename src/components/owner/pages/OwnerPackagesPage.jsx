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
  price: 0,
  sessions: 0,
  commissionRate: 0.6,
  validityType: "months",
  maxSessionsPerWeek: "",
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

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // all | active | inactive

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
      validityType: pkg.validityType ?? "months",
      maxSessionsPerWeek: pkg.maxSessionsPerWeek ?? "",
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

    const payload = {
      gymId: safeNum(form.gymId),
      name: form.name.trim(),
      description: form.description,
      type: form.type,
      durationDays: safeNum(form.durationDays),
      price: safeNum(form.price),
      sessions: safeNum(form.sessions),
      commissionRate: safeNum(form.commissionRate, 0.6),
      validityType: form.validityType,
      maxSessionsPerWeek: form.maxSessionsPerWeek === "" ? null : safeNum(form.maxSessionsPerWeek),
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
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="op-select"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
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
                <th>Type</th>
                <th>Thời hạn</th>
                <th>Giá</th>
                <th>Buổi</th>
                <th>Trạng thái</th>
                <th style={{ width: 220 }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const gym = gyms.find(g => g.id === p.gymId);
                return (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>
                      <div className="op-name">{p.name}</div>
                      <div className="op-desc">{p.description}</div>
                    </td>
                    <td>{gym ? gym.name : `#${p.gymId}`}</td>
                    <td>{p.type}</td>
                    <td>{p.durationDays} ngày</td>
                    <td>{Number(p.price).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₫</td>
                    <td>{p.sessions}</td>
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
                  onChange={(e) => setForm({ ...form, gymId: e.target.value })}
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

              <div className="op-grid">
                <div className="op-row">
                  <label>Type</label>
                  <select
                    className="op-select"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="basic">basic</option>
                    <option value="premium">premium</option>
                    <option value="pt_only">pt_only</option>
                    <option value="unlimited">unlimited</option>
                  </select>
                </div>

                <div className="op-row">
                  <label>Thời hạn (days)</label>
                  <input
                    className="op-input"
                    value={form.durationDays}
                    onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
                  />
                </div>

                <div className="op-row">
                  <label>Giá</label>
                  <input
                    className="op-input"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>

                <div className="op-row">
                  <label>Số buổi</label>
                  <input
                    className="op-input"
                    value={form.sessions}
                    onChange={(e) => setForm({ ...form, sessions: e.target.value })}
                  />
                </div>

                <div className="op-row">
                  <label>Hoa hồng PT (0-1)</label>
                  <input
                    className="op-input"
                    value={form.commissionRate}
                    onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
                  />
                </div>

                <div className="op-row">
                  <label>ValidityType</label>
                  <select
                    className="op-select"
                    value={form.validityType}
                    onChange={(e) => setForm({ ...form, validityType: e.target.value })}
                  >
                    <option value="days">days</option>
                    <option value="months">months</option>
                    <option value="sessions">sessions</option>
                  </select>
                </div>

                <div className="op-row">
                  <label>Max sessions/week</label>
                  <input
                    className="op-input"
                    value={form.maxSessionsPerWeek}
                    onChange={(e) => setForm({ ...form, maxSessionsPerWeek: e.target.value })}
                    placeholder="(optional)"
                  />
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
