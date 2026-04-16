import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./EquipmentPage.css";
import axios from "../../../setup/axios";

import {
  createEquipment,
  deleteEquipment,
  discontinueEquipment,
  getSuppliers,
  getEquipmentCategories,
  getEquipments,
  updateEquipment,
  // images
  getEquipmentImages,
  uploadEquipmentImages,
  setPrimaryEquipmentImage,
  deleteEquipmentImage,
} from "../../../services/equipmentSupplierInventoryService";
import { translateEquipmentCategoryName } from "../../../utils/equipmentCategoryI18n";

const emptyForm = {
  name: "",
  description: "",
  categoryId: "",
  unit: "VND",
  price: 0,
  quantity: 0,
  preferredSupplierId: "",
  status: "active",
};

const validateEquipmentForm = (form, mode = "create") => {
  const errors = [];
  const name = String(form.name || "").trim();
  const price = Number(form.price ?? 0);
  const quantity = Number(form.quantity ?? 0);

  if (!name) errors.push("Tên thiết bị là bắt buộc.");
  if (name.length > 255) errors.push("Tên thiết bị quá dài (tối đa 255 ký tự).");

  if (!Number.isFinite(price) || price <= 0) {
    errors.push("Giá bán phải lớn hơn 0.");
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    errors.push(
      mode === "create"
        ? "Số lượng ban đầu phải lớn hơn 0."
        : "Số lượng phải lớn hơn 0."
    );
  }

  if (mode === "create") {
    const catId = Number(form.categoryId);
    if (!form.categoryId || !Number.isFinite(catId) || catId <= 0) {
      errors.push("Vui lòng chọn danh mục.");
    }
    const supId = Number(form.preferredSupplierId);
    if (!form.preferredSupplierId || !Number.isFinite(supId) || supId <= 0) {
      errors.push("Vui lòng chọn nhà cung cấp.");
    }
    const desc = String(form.description || "").trim();
    if (!desc) {
      errors.push("Vui lòng nhập mô tả thiết bị.");
    }
  }

  return errors;
};

export default function EquipmentPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all"); // all | active | discontinued
  const [categoryId, setCategoryId] = useState("all");

  // modal create/edit
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  /** Giữ mã từ DB khi sửa (không hiện form) để PUT gửi lại đúng backend */
  const [persistedCode, setPersistedCode] = useState(null);
  const [saving, setSaving] = useState(false);
  const saveLockRef = useRef(false);
  const [createImages, setCreateImages] = useState([]);

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
      const [catRes, supRes] = await Promise.all([getEquipmentCategories(), getSuppliers({ page: 1, limit: 500, status: "active" })]);
      setCategories(catRes?.data?.data ?? catRes?.data ?? []);
      setSuppliers(supRes?.data?.data ?? supRes?.data ?? []);
      await fetchList();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Tải dữ liệu ban đầu thất bại");
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
      setErr(e?.response?.data?.message || e?.message || "Tải danh sách thất bại");
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
    setPersistedCode(null);
    setCreateImages([]);
    setForm({ ...emptyForm, status: "active" });
    setErr("");
    setShow(true);
  };

  const openEdit = (row) => {
    setMode("edit");
    setEditingId(row.id);
    setPersistedCode(row.code != null && row.code !== "" ? String(row.code) : null);
    setForm({
      name: row.name ?? "",
      description: row.description ?? "",
      categoryId: row.categoryId ? String(row.categoryId) : "",
      unit: "VND",
      price: Number(row.price ?? 0),
      quantity: Number(row.adminStockQuantity ?? row.quantity ?? 0) || 0,
      preferredSupplierId: row.preferredSupplierId ? String(row.preferredSupplierId) : "",
      status: row.status ?? "active",
    });
    setErr("");
    setShow(true);
  };

  const closeModal = () => {
    setShow(false);
    setErr("");
    setCreateImages([]);
  };

  const save = async () => {
    if (saving || saveLockRef.current) return;
    saveLockRef.current = true;
    setSaving(true);
    setErr("");
    try {
      const validationErrors = validateEquipmentForm(form, mode);
      if (validationErrors.length) {
        setErr(validationErrors.join(" "));
        return;
      }

      const payload = {
        name: form.name?.trim(),
        code: mode === "create" ? null : persistedCode != null ? String(persistedCode).trim() || null : null,
        description: form.description?.trim() || null,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        preferredSupplierId: form.preferredSupplierId ? Number(form.preferredSupplierId) : null,
        unit: "VND",
        price: Number(form.price ?? 0) || 0,
        quantity: Number(form.quantity ?? 0) || 0,
        minStockLevel: 0,
        maxStockLevel: 0,
        status: form.status === "discontinued" ? "discontinued" : "active",
      };

      if (!payload.name) {
        setErr("Tên thiết bị là bắt buộc");
        return;
      }

      if (mode === "create") {
        const created = await createEquipment(payload);
        const createdId = Number(created?.id ?? created?.data?.id ?? created?.data?.data?.id ?? 0);
        if (createdId > 0 && createImages.length > 0) {
          try {
            await uploadEquipmentImages(createdId, createImages);
          } catch (uploadErr) {
            alert(
              uploadErr?.response?.data?.message ||
                uploadErr?.message ||
                "Tạo thiết bị thành công nhưng tải ảnh thất bại. Bạn có thể vào nút 'Ảnh' để tải lại."
            );
          }
        }
      } else {
        await updateEquipment(editingId, payload);
      }

      closeModal();
      fetchList();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
      saveLockRef.current = false;
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

  const onDelete = async (row) => {
    const okConfirm = window.confirm(
      `Xóa vĩnh viễn thiết bị "${row.name}"?\n\nChỉ xóa được khi chưa phát sinh dữ liệu kho/chứng từ.`
    );
    if (!okConfirm) return;
    try {
      await deleteEquipment(row.id);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Xóa thiết bị thất bại");
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
            Quản lý danh mục, giá và nhà cung cấp. Tổng tồn theo từng phòng gym xem tại mục <strong>Kho thiết bị</strong>.
          </div>
        </div>

        <button className="eq-btn eq-btn--primary" onClick={openCreate}>
          + Thêm thiết bị
        </button>
      </div>

      <div className="eq-filters">
        <input
          className="eq-input"
          placeholder="Tìm theo tên, brand, model..."
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
              {translateEquipmentCategoryName(c.name, c.code)} {c.code ? `(${c.code})` : ""}
            </option>
          ))}
        </select>

        <select className="eq-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="discontinued">Ngừng sử dụng</option>
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
              <th>Tên</th>
              <th>Danh mục</th>
              <th>Đơn vị</th>
              <th>Giá bán</th>
              <th>Trạng thái</th>
              <th style={{ width: 320 }}>Hành động</th>
            </tr>
          </thead>

          <tbody>
            {visibleItems.length === 0 ? (
              <tr>
                <td className="eq-empty" colSpan={8}>
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              visibleItems.map((row) => {
                const catObj = catMap.get(Number(row.categoryId));
                const catRawName = row.categoryName || catObj?.name || "";
                const catRawCode = catObj?.code || "";
                const cat = translateEquipmentCategoryName(catRawName, catRawCode) || "-";
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
                        <div className="eq-thumb placeholder">Chưa có ảnh</div>
                      )}
                    </td>

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
                    <td>{Number(row.price || 0).toLocaleString("vi-VN")} đ</td>
                    <td>
                      <span className={`eq-badge ${isActive ? "active" : "inactive"}`}>
                        {isActive ? "Đang hoạt động" : "Ngừng sử dụng"}
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
                      <button
                        className="eq-btn eq-btn--danger"
                        onClick={() => onDelete(row)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Modal Create/Edit (portal: tránh bị cắt bởi overflow layout admin) ===== */}
      {show
        ? createPortal(
            <div className="eq-modal__backdrop" onMouseDown={closeModal}>
              <div
                className="eq-modal eq-modal--form"
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
                      Điền thông tin danh mục &amp; giá. Số lượng ban đầu (nếu có) dùng nhập tồn kho admin khi tạo mới.
                    </div>
                  </div>

                  <button type="button" className="eq-iconbtn" onClick={closeModal} aria-label="Đóng">
                    ✕
                  </button>
                </div>

                <div className="eq-modal__body">
                  <div className="eq-formgrid">
                    <label className="eq-field eq-field--full">
                      <span className="eq-label">
                        Tên <b>*</b>
                      </span>
                      <input
                        className="eq-input"
                        value={form.name}
                        onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                        placeholder="VD: Máy chạy bộ thương mại"
                      />
                    </label>

                    <label className="eq-field">
                  <span className="eq-label">
                    Danh mục{mode === "create" ? <> <b>*</b></> : null}
                  </span>
                  <select
                    className="eq-select"
                    value={form.categoryId}
                    onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))}
                  >
                    <option value="">-- Chọn --</option>
                    {(categories || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {translateEquipmentCategoryName(c.name, c.code)} {c.code ? `(${c.code})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="eq-field">
                  <span className="eq-label">Đơn vị</span>
                  <input className="eq-input" value="VND" readOnly />
                </label>

                <label className="eq-field">
                  <span className="eq-label">Giá bán (VNĐ)</span>
                  <input
                    className="eq-input"
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
                    placeholder="VD: 25000000"
                  />
                </label>

                <label className="eq-field">
                  <span className="eq-label">Số lượng</span>
                  <input
                    className="eq-input"
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => setForm((s) => ({ ...s, quantity: e.target.value }))}
                    placeholder="VD: 10"
                  />
                </label>

                <label className="eq-field eq-col2">
                  <span className="eq-label">
                    Nhà cung cấp{mode === "create" ? <> <b>*</b></> : null}
                  </span>
                  <select
                    className="eq-select"
                    value={form.preferredSupplierId}
                    onChange={(e) => setForm((s) => ({ ...s, preferredSupplierId: e.target.value }))}
                  >
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {(suppliers || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="eq-field eq-col2">
                  <span className="eq-label">
                    Mô tả{mode === "create" ? <> <b>*</b></> : null}
                  </span>
                  <textarea
                    className="eq-textarea"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                    placeholder="VD: Thiết bị cao cấp cho phòng gym..."
                  />
                </label>

                {mode === "create" ? (
                  <label className="eq-field eq-col2">
                    <span className="eq-label">Ảnh thiết bị</span>
                    <input
                      className="eq-input-file"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setCreateImages(files);
                      }}
                    />
                    <div className="eq-hint">
                      {createImages.length
                        ? `Đã chọn ${createImages.length} ảnh. Ảnh sẽ được tải lên ngay sau khi tạo thiết bị.`
                        : "Bạn có thể chọn nhiều ảnh ngay khi tạo mới."}
                    </div>
                  </label>
                ) : null}

                <label className="eq-field eq-col2">
                  <span className="eq-label">Trạng thái</span>
                  <select
                    className="eq-select"
                    value={form.status}
                    onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="discontinued">Ngừng sử dụng</option>
                  </select>
                  <div className="eq-hint">
                    * Ngừng sử dụng: ẩn thiết bị khỏi nghiệp vụ tạo mới (vẫn giữ dữ liệu lịch sử)
                  </div>
                </label>
                  </div>

                  {err ? <div className="eq-alert eq-alert--inmodal">{err}</div> : null}
                </div>

                <div className="eq-modal__footer">
                  <button type="button" className="eq-btn eq-btn--ghost" onClick={closeModal}>
                    Huỷ
                  </button>
                  <button
                    type="button"
                    className="eq-btn eq-btn--primary"
                    onClick={save}
                    disabled={saving}
                  >
                    {saving ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {/* ===== Modal Images ===== */}
      {imgOpen && imgEquipment
        ? createPortal(
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
                      alert(err2?.response?.data?.message || err2?.message || "Tải ảnh lên thất bại");
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

                      {img.isPrimary ? <div className="eq-badge2">Ảnh đại diện</div> : null}

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
                                    "Đặt ảnh đại diện thất bại"
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
                                  "Xoá ảnh thất bại"
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
              <button type="button" className="eq-btn eq-btn--ghost" onClick={closeImages}>
                Đóng
              </button>
            </div>
          </div>
        </div>,
            document.body
          )
        : null}
    </div>
  );
}
