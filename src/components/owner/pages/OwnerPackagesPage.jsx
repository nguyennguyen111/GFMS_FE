import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./OwnerPackagesPage.css";
import {
  ownerGetPackages,
  ownerGetPackageSpecializations,
  ownerGetSpecializationTrainers,
  ownerCreatePackage,
  ownerUpdatePackage,
  ownerTogglePackage,
} from "../../../services/ownerPackageService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import ownerTrainerService from "../../../services/ownerTrainerService";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import useSelectedGym from "../../../hooks/useSelectedGym";

const emptyForm = {
  gymId: "",
  name: "",
  description: "",
  types: [],
  trainerIds: [],
  price: "",
  sessions: "",
};

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatPackageType(type) {
  return String(type || "").trim() || "Chưa phân loại";
}

function parseTypeList(raw) {
  return String(raw || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function OwnerPackagesPage() {
  const { selectedGymId, selectedGymName } = useSelectedGym();
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
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailTrainerName, setDetailTrainerName] = useState("—");

  const [form, setForm] = useState(emptyForm);
  const [specializations, setSpecializations] = useState([]);
  const [matchingTrainers, setMatchingTrainers] = useState([]);
  const [loadingTrainers, setLoadingTrainers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trainerDropdownOpen, setTrainerDropdownOpen] = useState(false);
  const trainerDropdownRef = useRef(null);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((p) => {
      const matchGym = selectedGymId ? Number(p.gymId) === Number(selectedGymId) : true;
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

      return matchGym && matchText && matchActive;
    });
  }, [items, search, activeFilter, selectedGymId]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, gymId: selectedGymId ? String(selectedGymId) : prev.gymId }));
  }, [selectedGymId]);

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await ownerGetPackages();
      // Lọc bỏ các item NULL hoặc không hợp lệ
      const validItems = (res.data?.data || []).filter(item => item && item.id && item.name);
      setItems(validItems);
      return validItems;
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Load failed");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGyms = useCallback(async () => {
    try {
      const response = await ownerGetMyGyms();
      setGyms(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error("Lỗi khi load danh sách phòng gym:", error);
      setGyms([]);
    }
  }, []);

  const loadSpecializationsByGym = async (gymId) => {
    const gymIdNum = Number(gymId);
    if (!Number.isInteger(gymIdNum)) {
      setSpecializations([]);
      return;
    }

    try {
      const response = await ownerGetPackageSpecializations(gymIdNum);
      const specs = Array.isArray(response?.data?.data) ? response.data.data : [];
      setSpecializations(specs);
    } catch (error) {
      console.error("Lỗi khi load chuyên môn Huấn luyện viên:", error);
      setSpecializations([]);
    }
  };

  const loadMatchingTrainers = async (gymId, specialization) => {
    const gymIdNum = Number(gymId);
    const spec = Array.isArray(specialization)
      ? specialization.join(", ").trim()
      : String(specialization || "").trim();

    if (!Number.isInteger(gymIdNum) || !spec) {
      setMatchingTrainers([]);
      return;
    }

    try {
      setLoadingTrainers(true);
      const response = await ownerGetSpecializationTrainers(gymIdNum, spec);
      const trainers = Array.isArray(response?.data?.data) ? response.data.data : [];
      setMatchingTrainers(trainers);
    } catch (error) {
      console.error("Lỗi khi load huấn luyện viên theo chuyên môn:", error);
      setMatchingTrainers([]);
    } finally {
      setLoadingTrainers(false);
    }
  };

  useEffect(() => {
    fetchData();
    loadGyms();
  }, [fetchData, loadGyms]);

  useEffect(() => {
    if (!detailItem?.id) return;
    const nextDetail = items.find((item) => Number(item.id) === Number(detailItem.id));
    if (nextDetail) {
      setDetailItem(nextDetail);
    }
  }, [detailItem?.id, items]);

  useEffect(() => {
    if (!trainerDropdownOpen) return;
    const handleClickOutside = (event) => {
      if (trainerDropdownRef.current && !trainerDropdownRef.current.contains(event.target)) {
        setTrainerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [trainerDropdownOpen]);

  useOwnerRealtimeRefresh({
    onRefresh: async () => {
      await Promise.all([fetchData(), loadGyms()]);
    },
    events: ["package:changed"],
  });

  const openCreate = () => {
    setModalMode("create");
    setEditing(null);
    setForm({ ...emptyForm, gymId: selectedGymId ? String(selectedGymId) : "" });
    setSpecializations([]);
    setMatchingTrainers([]);
    if (selectedGymId) {
      loadSpecializationsByGym(selectedGymId);
    }
    setTrainerDropdownOpen(false);
    setModalOpen(true);
  };

  const openEdit = (pkg) => {
    const initialTypes = parseTypeList(pkg.type);
    const primaryType = initialTypes.length > 0 ? [initialTypes[0]] : [];
    setModalMode("edit");
    setEditing(pkg);
    setForm({
      gymId: pkg.gymId ?? "",
      name: pkg.name ?? "",
      description: pkg.description ?? "",
      types: primaryType,
      trainerIds: pkg.trainerId ? [Number(pkg.trainerId)] : [],
      price: pkg.price ?? 0,
      sessions: pkg.sessions ?? 0,
    });
    setMatchingTrainers([]);
    loadSpecializationsByGym(pkg.gymId);
    loadMatchingTrainers(pkg.gymId, primaryType);
    setTrainerDropdownOpen(false);
    setModalOpen(true);
  };

  const openDetail = async (pkg) => {
    setDetailItem(pkg);
    setDetailOpen(true);

    const directName = pkg?.Trainer?.User?.username;
    if (directName) {
      setDetailTrainerName(directName);
      return;
    }

    if (!pkg?.trainerId) {
      if (!pkg?.gymId || !pkg?.type) {
        setDetailTrainerName("—");
        return;
      }

      try {
        const response = await ownerGetSpecializationTrainers(pkg.gymId, pkg.type);
        const trainers = Array.isArray(response?.data?.data) ? response.data.data : [];
        if (trainers.length === 0) {
          setDetailTrainerName("—");
          return;
        }

        const names = trainers
          .map((trainer) => trainer?.User?.username)
          .filter(Boolean);

        setDetailTrainerName(names.length > 0 ? names.join(", ") : `Có ${trainers.length} huấn luyện viên phù hợp`);
      } catch {
        setDetailTrainerName("—");
      }
      return;
    }

    setDetailTrainerName(`Huấn luyện viên #${pkg.trainerId}`);

    try {
      const detailRes = await ownerTrainerService.getTrainerDetail(pkg.trainerId);
      const detailName = detailRes?.data?.User?.username;
      if (detailName) {
        setDetailTrainerName(detailName);
        return;
      }
    } catch {
      // fallback below
    }

    if (!pkg?.gymId || !pkg?.type) return;

    try {
      const response = await ownerGetSpecializationTrainers(pkg.gymId, pkg.type);
      const trainers = Array.isArray(response?.data?.data) ? response.data.data : [];
      const matchedTrainer = trainers.find((trainer) => Number(trainer.id) === Number(pkg.trainerId));
      if (matchedTrainer?.User?.username) {
        setDetailTrainerName(matchedTrainer.User.username);
      }
    } catch {
      // Keep fallback trainer id if lookup fails.
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailItem(null);
    setDetailTrainerName("—");
  };

  const closeModal = () => {
    setTrainerDropdownOpen(false);
    setModalOpen(false);
  };

  const submit = async () => {
    if (submitting) return;
    setErr("");

    if (!form.gymId || !form.name.trim()) {
      setErr("Vui lòng chọn phòng tập và nhập tên gói.");
      return;
    }

    if (!Array.isArray(form.types) || form.types.length === 0) {
      setErr("Vui lòng chọn chuyên môn Huấn luyện viên.");
      return;
    }

    const selectedSpecs = form.types.map((spec) => String(spec || "").trim().toLowerCase()).filter(Boolean);
    const allowedSpecs = specializations.map((spec) => String(spec).trim().toLowerCase());
    const invalidSpecs = selectedSpecs.filter((spec) => !allowedSpecs.includes(spec));
    if (invalidSpecs.length > 0) {
      setErr("Có chuyên môn Huấn luyện viên không hợp lệ cho phòng gym này.");
      return;
    }

    const selectedTrainerIds = Array.isArray(form.trainerIds)
      ? form.trainerIds.map((id) => Number(id)).filter((id) => Number.isInteger(id))
      : [];
    const matchedIds = matchingTrainers.map((t) => Number(t.id));
    const hasInvalidTrainer = selectedTrainerIds.some((id) => !matchedIds.includes(id));
    if (hasInvalidTrainer) {
        setErr("Huấn luyện viên đã chọn không thuộc chuyên môn này.");
        return;
    }

    if (safeNum(form.sessions) <= 0) {
      setErr("Vui lòng nhập số buổi tập lớn hơn 0.");
      return;
    }

    if (safeNum(form.price) < 0) {
      setErr("Vui lòng nhập giá gói hợp lệ.");
      return;
    }

    const basePayload = {
      gymId: safeNum(form.gymId),
      name: form.name.trim(),
      description: form.description,
      type: form.types.join(", "),
      packageType: "personal_training",
      price: safeNum(form.price),
      sessions: safeNum(form.sessions),
    };

    const trainerIdForPayload = selectedTrainerIds.length === 1 ? selectedTrainerIds[0] : null;

    try {
      setSubmitting(true);
      if (modalMode === "create") {
        await ownerCreatePackage({
          ...basePayload,
          trainerId: trainerIdForPayload,
          trainerIds: selectedTrainerIds,
        });
      } else {
        await ownerUpdatePackage(editing.id, {
          ...basePayload,
          trainerId: trainerIdForPayload,
          trainerIds: selectedTrainerIds,
        });
      }
      setModalOpen(false);
      await fetchData();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Save failed");
    } finally {
      setSubmitting(false);
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
            Tạo / cập nhật / kích hoạt-hủy kích hoạt gói tập {selectedGymName ? `cho ${selectedGymName}` : "theo phòng tập thuộc quyền quản lý"}.
          </div>
        </div>

        <button className="op-btn op-btn--primary" onClick={openCreate}>
          + Tạo gói
        </button>
      </div>

      <div className="op-toolbar">
        <input
          className="op-input"
          placeholder="Tìm theo tên / mô tả / chuyên môn..."
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
                <th>Chuyên môn</th>
                <th>Giá</th>
                <th>Buổi</th>
                <th>Trạng thái</th>
                <th style={{ width: 300 }}>Hành động</th>
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
                    <td>{Number(p.price).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₫</td>
                    <td>{p.sessions || 0}</td>
                    <td>
                      <span className={`op-badge ${p.status === 'ACTIVE' ? "is-on" : "is-off"}`}>
                        {p.status === 'ACTIVE' ? "Đang hoạt động" : "Ngừng hoạt động"}
                      </span>
                    </td>
                    <td className="op-cell-actions">
                      <div className="op-actions">
                        <button className="op-btn--detail" onClick={() => openDetail(p)}>
                          Chi tiết
                        </button>
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
                  onChange={(e) => {
                    const nextGymId = e.target.value;
                    setForm((prev) => ({ ...prev, gymId: nextGymId, types: [], trainerIds: [] }));
                    loadSpecializationsByGym(nextGymId);
                    setMatchingTrainers([]);
                  }}
                  required
                  disabled={Boolean(selectedGymId)}
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
                  placeholder="VD: Gói huấn luyện viên 12 buổi"
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
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="op-row">
                    <label>Chuyên môn huấn luyện viên *</label>
                    <select
                      className="op-select"
                      value={Array.isArray(form.types) && form.types.length > 0 ? String(form.types[0]) : ""}
                      onChange={(e) => {
                        const nextType = String(e.target.value || "").trim();
                        const nextTypes = nextType ? [nextType] : [];
                        setForm((prev) => ({ ...prev, types: nextTypes, trainerIds: [] }));
                        loadMatchingTrainers(form.gymId, nextTypes);
                      }}
                      disabled={!form.gymId || specializations.length === 0}
                    >
                      <option value="">-- Chọn chuyên môn --</option>
                      {specializations.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>

                    {form.gymId && specializations.length === 0 && (
                      <small className="op-spec-empty-help">
                        phòng tập này chưa có huấn luyện viên có chuyên môn để gán gói.
                      </small>
                    )}
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
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="op-row">
                    <label>Huấn luyện viên phụ trách</label>
                    <div className="op-multi" ref={trainerDropdownRef}>
                      <button
                        type="button"
                        className={`op-multi__trigger ${trainerDropdownOpen ? "is-open" : ""}`}
                        onClick={() => setTrainerDropdownOpen((prev) => !prev)}
                        disabled={!Array.isArray(form.types) || form.types.length === 0 || loadingTrainers}
                      >
                        {loadingTrainers
                          ? "Đang tải huấn luyện viên..."
                          : Array.isArray(form.trainerIds) && form.trainerIds.length > 0
                          ? `Đã chọn ${form.trainerIds.length} huấn luyện viên`
                          : "Chọn huấn luyện viên phụ trách"}
                        <span className="op-multi__caret">{trainerDropdownOpen ? "▴" : "▾"}</span>
                      </button>

                      {trainerDropdownOpen && !loadingTrainers ? (
                        <div className="op-multi__menu">
                          {matchingTrainers.length === 0 ? (
                            <div className="op-multi__empty">Không có huấn luyện viên phù hợp.</div>
                          ) : (
                            matchingTrainers.map((trainer) => {
                              const trainerId = Number(trainer.id);
                              const isSelected = Array.isArray(form.trainerIds)
                                ? form.trainerIds.map((id) => Number(id)).includes(trainerId)
                                : false;
                              return (
                                <label className="op-multi__item" key={trainer.id}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      setForm((prev) => {
                                        const current = Array.isArray(prev.trainerIds)
                                          ? prev.trainerIds.map((id) => Number(id)).filter((id) => Number.isInteger(id))
                                          : [];
                                        const next = isSelected
                                          ? current.filter((id) => id !== trainerId)
                                          : [...current, trainerId];
                                        return { ...prev, trainerIds: next };
                                      });
                                    }}
                                  />
                                  <span className="op-multi__text">
                                    {trainer?.User?.username || `Huấn luyện viên #${trainer.id}`}
                                    {trainer?.User?.phone ? ` • ${trainer.User.phone}` : ""}
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      ) : null}

                      {Array.isArray(form.trainerIds) && form.trainerIds.length > 0 ? (
                        <div className="op-multi__chips">
                          {form.trainerIds.map((id) => {
                            const trainer = matchingTrainers.find((item) => Number(item.id) === Number(id));
                            const name = trainer?.User?.username || `PT #${id}`;
                            return (
                              <span className="op-multi__chip" key={id}>
                                {name}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      trainerIds: (prev.trainerIds || []).filter((tid) => Number(tid) !== Number(id)),
                                    }))
                                  }
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                    {!loadingTrainers && Array.isArray(form.types) && form.types.length > 0 && matchingTrainers.length === 0 ? (
                      <small className="op-trainer-hint">Không có huấn luyện viên phù hợp.</small>
                    ) : null}
                  </div>
                </div>
              </div>

              {!!err && <div className="op-error">⚠ {err}</div>}

              <div className="op-modal__foot">
                <button className="op-btn" onClick={closeModal}>Hủy</button>
                <button className="op-btn op-btn--primary" onClick={submit} disabled={submitting}>
                  {submitting ? "Đang lưu..." : modalMode === "create" ? "Tạo" : "Lưu"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailOpen && detailItem && (
        <div className="op-modal" onClick={closeDetail}>
          <div className="op-modal__panel" onClick={(e) => e.stopPropagation()}>
            <div className="op-modal__head">
              <div className="op-modal__title">Chi tiết gói #{detailItem.id}</div>
              <button className="op-x" onClick={closeDetail}>✕</button>
            </div>

            <div className="op-form op-detail-body">
              <div className="op-grid op-detail-grid">
                <div className="op-row op-detail-item">
                  <label>Tên gói</label>
                  <div className="op-detail-value">{detailItem.name || "—"}</div>
                </div>

                <div className="op-row op-detail-item">
                  <label>Phòng tập</label>
                  <div className="op-detail-value">{gyms.find((g) => g.id === detailItem.gymId)?.name || `#${detailItem.gymId}`}</div>
                </div>

                <div className="op-row op-detail-item">
                  <label>Chuyên môn</label>
                  <div className="op-detail-value">{formatPackageType(detailItem.type)}</div>
                </div>

                <div className="op-row op-detail-item">
                  <label>Huấn luyện viên phụ trách</label>
                  <div className="op-detail-value">{detailTrainerName}</div>
                </div>

                <div className="op-row op-detail-item">
                  <label>Giá</label>
                  <div className="op-detail-value">{Number(detailItem.price || 0).toLocaleString("vi-VN")} ₫</div>
                </div>

                <div className="op-row op-detail-item">
                  <label>Số buổi</label>
                  <div className="op-detail-value">{detailItem.sessions || 0}</div>
                </div>

                <div className="op-row op-detail-item op-detail-item--full">
                  <label>Mô tả</label>
                  <div className="op-detail-value op-detail-value--muted">{detailItem.description || "—"}</div>
                </div>

                <div className="op-row op-detail-item op-detail-item--full">
                  <label>Trạng thái</label>
                  <div>
                    <span className={`op-badge ${detailItem.status === 'ACTIVE' ? "is-on" : "is-off"}`}>
                      {detailItem.status === 'ACTIVE' ? "Đang hoạt động" : "Ngừng hoạt động"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="op-modal__foot">
                <button className="op-btn" onClick={closeDetail}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
