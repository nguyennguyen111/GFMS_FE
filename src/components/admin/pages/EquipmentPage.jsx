import React, { useEffect, useMemo, useState } from "react";
import "./EquipmentPage.css";
import axios from "../../../setup/axios";

import {
  createEquipment,
  discontinueEquipment,
  getEquipmentCategories,
  getEquipments,
  updateEquipment,
  // images
  getEquipmentImages,
  uploadEquipmentImages,
  setPrimaryEquipmentImage,
  deleteEquipmentImage,
} from "../../../services/equipmentSupplierInventoryService";

const emptyForm = {
  name: "",
  code: "",
  description: "",
  categoryId: "",
  brand: "",
  model: "",
  unit: "piece",
  minStockLevel: 0,
  maxStockLevel: 0,
  status: "active",
};

export default function EquipmentPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all"); // all | active | discontinued
  const [categoryId, setCategoryId] = useState("all");

  // modal create/edit
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // modal images
  const [imgOpen, setImgOpen] = useState(false);
  const [imgEquipment, setImgEquipment] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [uploading, setUploading] = useState(false);

  // ✅ tuyệt đối hoá url ảnh theo baseURL hiện tại (local/deploy)
  const API_HOST = String(axios?.defaults?.baseURL || process.env.REACT_APP_API_BASE || "http://localhost:8080").replace(/\/+$/, "");
  const absUrl = (u) => (u ? (u.startsWith("http") ? u : `${API_HOST}${u}`) : "");

  const fetchInit = async () => {
    setLoading(true);
    setErr("");
    try {
      const [catRes] = await Promise.all([getEquipmentCategories()]);
      setCategories(catRes?.data?.data ?? catRes?.data ?? []);
      await fetchList();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Load init failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchList = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await getEquipments({
        page: 1,
        limit: 200,
        q: q || undefined,
        status: status !== "all" ? status : undefined,
        categoryId: categoryId !== "all" ? Number(categoryId) : undefined,
      });

      const data = res?.data?.data ?? res?.data ?? res?.data?.rows ?? res?.rows ?? [];
      const normalized = Array.isArray(data) ? data : data.data ?? data.items ?? [];
      setItems(normalized);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = () => fetchList();

  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setForm({ ...emptyForm, status: "active" });
    setErr("");
    setShow(true);
  };

  const openEdit = (row) => {
    setMode("edit");
    setEditingId(row.id);
    setForm({
      name: row.name ?? "",
      code: row.code ?? "",
      description: row.description ?? "",
      categoryId: row.categoryId ? String(row.categoryId) : "",
      brand: row.brand ?? "",
      model: row.model ?? "",
      unit: row.unit ?? "piece",
      minStockLevel: Number(row.minStockLevel ?? 0),
      maxStockLevel: Number(row.maxStockLevel ?? 0),
      status: row.status ?? "active",
    });
    setErr("");
    setShow(true);
  };

  const closeModal = () => {
    setShow(false);
    setErr("");
  };

  const save = async () => {
    setErr("");
    try {
      const payload = {
        name: form.name?.trim(),
        code: form.code?.trim() || null,
        description: form.description?.trim() || null,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        brand: form.brand?.trim() || null,
        model: form.model?.trim() || null,
        unit: form.unit?.trim() || "piece",
        minStockLevel: Number(form.minStockLevel ?? 0) || 0,
        maxStockLevel: Number(form.maxStockLevel ?? 0) || 0,
        status: form.status === "discontinued" ? "discontinued" : "active",
      };

      if (!payload.name) {
        setErr("Tên thiết bị là bắt buộc");
        return;
      }

      if (mode === "create") await createEquipment(payload);
      else await updateEquipment(editingId, payload);

      closeModal();
      fetchList();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Save failed");
    }
  };

  const onDiscontinue = async (row) => {
    const okConfirm = window.confirm(`Ẩn/Ngưng sử dụng thiết bị "${row.name}"?`);
    if (!okConfirm) return;
    try {
      await discontinueEquipment(row.id);
      fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Discontinue failed");
    }
  };

  const openImages = async (row) => {
    setImgEquipment(row);
    setImgOpen(true);
    try {
      const res = await getEquipmentImages(row.id);
      setGallery(res?.data?.data ?? res?.data ?? []);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Load images failed");
      setGallery([]);
    }
  };

  const closeImages = () => {
    setImgOpen(false);
    setImgEquipment(null);
    setGallery([]);
    setUploading(false);
  };

  const visibleItems = useMemo(() => items || [], [items]);

  const catMap = useMemo(() => {
    const map = new Map();
    (categories || []).forEach((c) => map.set(Number(c.id), c));
    return map;
  }, [categories]);

  return (
    <div className="eq-page">
      <div className="eq-head">
        <div>
          <h2 className="eq-title">Thiết bị</h2>
          <div className="eq-sub">
            Master data thiết bị — tồn kho theo gym chỉ thay đổi khi nhận hàng từ PO hoặc điều chỉnh hợp lệ (không nhập tay số lượng tồn tại đây)
          </div>
        </div>

        <button className="eq-btn eq-btn--primary" onClick={openCreate}>
          + Thêm thiết bị
        </button>
      </div>

      <div className="eq-filters">
        <input
          className="eq-input"
          placeholder="Tìm theo tên / mã / brand / model..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => (e.key === "Enter" ? onSearch() : null)}
        />

        <select
          className="eq-select"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="all">Tất cả danh mục</option>
          {(categories || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.code ? `(${c.code})` : ""}
            </option>
          ))}
        </select>

        <select className="eq-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Active</option>
          <option value="discontinued">Discontinued</option>
        </select>

        <button className="eq-btn" onClick={onSearch} disabled={loading}>
          {loading ? "Đang tải..." : "Tải lại"}
        </button>
      </div>

      {err ? <div className="eq-alert">{err}</div> : null}

      <div className="eq-table">
        <table className="eq-table__tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Ảnh</th>
              <th>Mã</th>
              <th>Tên</th>
              <th>Danh mục</th>
              <th>Đơn vị</th>
              <th>Min</th>
              <th>Max</th>
              <th>Trạng thái</th>
              <th style={{ width: 320 }}>Hành động</th>
            </tr>
          </thead>

          <tbody>
            {visibleItems.length === 0 ? (
              <tr>
                <td className="eq-empty" colSpan={10}>
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              visibleItems.map((row) => {
                const cat = row.categoryName || catMap.get(Number(row.categoryId))?.name || "-";
                const isActive = row.status === "active";
                return (
                  <tr key={row.id}>
                    <td>{row.id}</td>

                    <td className="eq-img-cell">
                      {row.primaryImageUrl ? (
                        <img
                          className="eq-thumb"
                          src={absUrl(row.primaryImageUrl)}
                          alt={row.name}
                        />
                      ) : (
                        <div className="eq-thumb placeholder">No Image</div>
                      )}
                    </td>

                    <td>{row.code || "-"}</td>
                    <td className="eq-strong">
                      {row.name}
                      {row.brand || row.model ? (
                        <div className="eq-muted">
                          {[row.brand, row.model].filter(Boolean).join(" • ")}
                        </div>
                      ) : null}
                    </td>
                    <td>{cat}</td>
                    <td>{row.unit || "-"}</td>
                    <td>{row.minStockLevel ?? 0}</td>
                    <td>{row.maxStockLevel ?? 0}</td>
                    <td>
                      <span className={`eq-badge ${isActive ? "active" : "inactive"}`}>
                        {isActive ? "Active" : "Discontinued"}
                      </span>
                    </td>
                    <td className="eq-actions">
                      <button className="eq-btn eq-btn--ghost" onClick={() => openEdit(row)}>
                        Sửa
                      </button>

                      <button className="eq-btn eq-btn--ghost" onClick={() => openImages(row)}>
                        Ảnh
                      </button>

                      <button
                        className="eq-btn eq-btn--danger"
                        onClick={() => onDiscontinue(row)}
                        disabled={!isActive}
                      >
                        Ẩn thiết bị
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Modal Create/Edit ===== */}
      {show ? (
        <div className="eq-modal__backdrop" onMouseDown={closeModal}>
          <div
            className="eq-modal"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="eq-modal__header">
              <div>
                <div className="eq-modal__title">
                  {mode === "create" ? "Thêm thiết bị" : "Cập nhật thiết bị"}
                </div>
                <div className="eq-modal__subtitle">
                  Dùng để quản lý tồn kho theo gym + ghi nhật ký nhập/xuất
                </div>
              </div>

              <button className="eq-iconbtn" onClick={closeModal} aria-label="Đóng">
                ✕
              </button>
            </div>

            <div className="eq-modal__body">
              <div className="eq-formgrid">
                <label className="eq-field">
                  <span className="eq-label">
                    Tên <b>*</b>
                  </span>
                  <input
                    className="eq-input"
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    placeholder="VD: Commercial Treadmill Pro"
                  />
                </label>

                <label className="eq-field">
                  <span className="eq-label">Mã</span>
                  <input
                    className="eq-input"
                    value={form.code}
                    onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
                    placeholder="VD: EQ-TREADMILL-001"
                  />
                </label>

                <label className="eq-field">
                  <span className="eq-label">Danh mục</span>
                  <select
                    className="eq-select"
                    value={form.categoryId}
                    onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))}
                  >
                    <option value="">-- Chọn --</option>
                    {(categories || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="eq-field">
                  <span className="eq-label">Đơn vị</span>
                  <input
                    className="eq-input"
                    value={form.unit}
                    onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value }))}
                    placeholder="VD: piece / set"
                  />
                </label>

                <label className="eq-field">
                  <span className="eq-label">Brand</span>
                  <input
                    className="eq-input"
                    value={form.brand}
                    onChange={(e) => setForm((s) => ({ ...s, brand: e.target.value }))}
                    placeholder="VD: Life Fitness"
                  />
                </label>

                <label className="eq-field">
                  <span className="eq-label">Model</span>
                  <input
                    className="eq-input"
                    value={form.model}
                    onChange={(e) => setForm((s) => ({ ...s, model: e.target.value }))}
                    placeholder="VD: T5"
                  />
                </label>

                <label className="eq-field eq-col2">
                  <span className="eq-label">Mô tả</span>
                  <textarea
                    className="eq-textarea"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                    placeholder="VD: High-end commercial treadmill..."
                  />
                </label>

                <label className="eq-field">
                  <span className="eq-label">Min stock</span>
                  <input
                    className="eq-input"
                    type="number"
                    min="0"
                    value={form.minStockLevel}
                    onChange={(e) => setForm((s) => ({ ...s, minStockLevel: e.target.value }))}
                  />
                </label>

                <label className="eq-field">
                  <span className="eq-label">Max stock</span>
                  <input
                    className="eq-input"
                    type="number"
                    min="0"
                    value={form.maxStockLevel}
                    onChange={(e) => setForm((s) => ({ ...s, maxStockLevel: e.target.value }))}
                  />
                </label>

                <label className="eq-field eq-col2">
                  <span className="eq-label">Trạng thái</span>
                  <select
                    className="eq-select"
                    value={form.status}
                    onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
                  >
                    <option value="active">active</option>
                    <option value="discontinued">discontinued</option>
                  </select>
                  <div className="eq-hint">
                    * Discontinued: ẩn thiết bị khỏi nghiệp vụ tạo mới (vẫn giữ dữ liệu lịch sử)
                  </div>
                </label>
              </div>

              {err ? <div className="eq-alert eq-alert--inmodal">{err}</div> : null}
            </div>

            <div className="eq-modal__footer">
              <button className="eq-btn eq-btn--ghost" onClick={closeModal}>
                Huỷ
              </button>
              <button className="eq-btn eq-btn--primary" onClick={save}>
                Lưu
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===== Modal Images ===== */}
      {imgOpen && imgEquipment ? (
        <div className="eq-modal__backdrop" onMouseDown={closeImages}>
          <div className="eq-modal eq-modal--wide" onMouseDown={(e) => e.stopPropagation()}>
            <div className="eq-modal__header">
              <div>
                <div className="eq-modal__title">Ảnh thiết bị</div>
                <div className="eq-modal__subtitle">{imgEquipment.name}</div>
              </div>

              <button className="eq-iconbtn" onClick={closeImages} aria-label="Đóng">
                ✕
              </button>
            </div>

            <div className="eq-modal__body">
              <div className="eq-upload-row">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  disabled={uploading}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;

                    setUploading(true);
                    try {
                      await uploadEquipmentImages(imgEquipment.id, files);
                      const res = await getEquipmentImages(imgEquipment.id);
                      setGallery(res?.data?.data ?? res?.data ?? []);
                      await fetchList(); // để refresh ảnh đại diện ngoài bảng
                    } catch (err2) {
                      alert(err2?.response?.data?.message || err2?.message || "Upload failed");
                    } finally {
                      setUploading(false);
                      e.target.value = "";
                    }
                  }}
                />
                {uploading ? <span className="eq-muted">Đang upload...</span> : null}
              </div>

              <div className="eq-gallery">
                {gallery.length === 0 ? (
                  <div className="eq-muted">Chưa có ảnh. Hãy upload ảnh cho thiết bị.</div>
                ) : (
                  gallery.map((img) => (
                    <div key={img.id} className={`eq-card-img ${img.isPrimary ? "primary" : ""}`}>
                      <img src={absUrl(img.url)} alt={img.altText || "equipment"} />

                      {img.isPrimary ? <div className="eq-badge2">Primary</div> : null}

                      <div className="eq-img-actions">
                        {!img.isPrimary ? (
                          <button
                            className="eq-btn eq-btn--ghost"
                            onClick={async () => {
                              try {
                                await setPrimaryEquipmentImage(imgEquipment.id, img.id);
                                const res = await getEquipmentImages(imgEquipment.id);
                                setGallery(res?.data?.data ?? res?.data ?? []);
                                await fetchList();
                              } catch (err3) {
                                alert(
                                  err3?.response?.data?.message ||
                                    err3?.message ||
                                    "Set primary failed"
                                );
                              }
                            }}
                          >
                            Đặt đại diện
                          </button>
                        ) : null}

                        <button
                          className="eq-btn eq-btn--danger"
                          onClick={async () => {
                            const okConfirm = window.confirm("Xoá ảnh này?");
                            if (!okConfirm) return;

                            try {
                              await deleteEquipmentImage(imgEquipment.id, img.id);
                              const res = await getEquipmentImages(imgEquipment.id);
                              setGallery(res?.data?.data ?? res?.data ?? []);
                              await fetchList();
                            } catch (err4) {
                              alert(
                                err4?.response?.data?.message ||
                                  err4?.message ||
                                  "Delete image failed"
                              );
                            }
                          }}
                        >
                          Xoá
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="eq-modal__footer">
              <button className="eq-btn eq-btn--ghost" onClick={closeImages}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
