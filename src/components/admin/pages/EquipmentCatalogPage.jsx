import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "../../../setup/axios";
import {
  getEquipments,
  getEquipmentCategories,
  getSuppliers,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  uploadEquipmentImages,
  getEquipmentImages,
  setPrimaryEquipmentImage,
  deleteEquipmentImage,
} from "../../../services/equipmentSupplierInventoryService";
import "./EquipmentCatalogPage.css";

const emptyForm = {
  name: "",
  code: "",
  description: "",
  categoryId: "",
  preferredSupplierId: "",
  price: "",
  status: "active",
};

const money = (value) => Number(value || 0).toLocaleString("vi-VN");

const statusLabel = (value) => {
  if (value === "active") return "Đang hoạt động";
  if (value === "inactive") return "Ngừng bán";
  return "Ngưng sử dụng";
};

export default function EquipmentCatalogPage() {
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [images, setImages] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const API_HOST = String(
    axios?.defaults?.baseURL ||
      process.env.REACT_APP_API_BASE ||
      "http://localhost:8080",
  ).replace(/\/+$/, "");
  const absUrl = (u) =>
    u ? (String(u).startsWith("http") ? u : `${API_HOST}${u}`) : "";

  const activeCount = useMemo(
    () => rows.filter((item) => String(item.status) === "active").length,
    [rows],
  );
  const selectedRow = useMemo(
    () => rows.find((item) => Number(item.id) === Number(selectedId)) || null,
    [rows, selectedId],
  );
  const selectedSupplier = useMemo(
    () =>
      suppliers.find(
        (item) => Number(item.id) === Number(form.preferredSupplierId),
      ) || null,
    [suppliers, form.preferredSupplierId],
  );
  const selectedCategory = useMemo(
    () =>
      categories.find((item) => Number(item.id) === Number(form.categoryId)) ||
      null,
    [categories, form.categoryId],
  );
  const selectedRowSupplier = useMemo(
    () =>
      suppliers.find(
        (item) => Number(item.id) === Number(selectedRow?.preferredSupplierId),
      ) || null,
    [suppliers, selectedRow],
  );
  const selectedRowCategory = useMemo(
    () =>
      categories.find((item) => Number(item.id) === Number(selectedRow?.categoryId)) ||
      null,
    [categories, selectedRow],
  );
  const primaryImage = useMemo(
    () => images.find((item) => item?.isPrimary) || images[0] || null,
    [images],
  );
  const existingPrimaryImage = absUrl(
    primaryImage?.url ||
      selectedRow?.primaryImageUrl ||
      selectedRow?.thumbnail ||
      selectedRow?.imageUrl ||
      selectedRow?.image ||
      "",
  );
  const currentPreviewImage = imagePreview || existingPrimaryImage;

  const isCreateMode = !editingId;
  const previewTitle = isCreateMode
    ? "Xem trước thiết bị mới"
    : "Thông tin thiết bị đang sửa";
  const previewImageSrc = isCreateMode ? imagePreview || "" : currentPreviewImage;
  const previewName = isCreateMode
    ? form.name || "Chưa nhập tên thiết bị"
    : form.name || selectedRow?.name || "Chưa nhập tên thiết bị";
  const previewCode = isCreateMode
    ? form.code || "Chưa có mã thiết bị"
    : form.code || selectedRow?.code || "Chưa có mã thiết bị";
  const previewCategoryName = isCreateMode
    ? selectedCategory?.name || "Chưa chọn danh mục"
    : selectedCategory?.name ||
      selectedRowCategory?.name ||
      selectedRow?.categoryName ||
      "Chưa chọn danh mục";
  const previewSupplierName = isCreateMode
    ? selectedSupplier?.name || "Chưa chọn nhà cung cấp"
    : selectedSupplier?.name ||
      selectedRowSupplier?.name ||
      selectedRow?.preferredSupplierName ||
      "Chưa chọn nhà cung cấp";
  const previewStatus = isCreateMode
    ? form.status || "active"
    : form.status || selectedRow?.status || "active";
  const previewDescription = isCreateMode
    ? form.description ||
      "Mô tả ngắn sẽ hiển thị ở đây để admin và owner dễ nhận diện thiết bị."
    : form.description ||
      selectedRow?.description ||
      "Mô tả ngắn sẽ hiển thị ở đây để admin và owner dễ nhận diện thiết bị.";
  const previewPrice = isCreateMode
    ? form.price === "" ? null : form.price
    : form.price !== "" && form.price !== null && form.price !== undefined
      ? form.price
      : selectedRow?.price;

  const loadRefs = async () => {
    const [categoryRes, supplierRes] = await Promise.all([
      getEquipmentCategories().catch(() => ({ data: [] })),
      getSuppliers({ page: 1, limit: 300 }).catch(() => ({ data: [] })),
    ]);

    const categoryRows = categoryRes?.data?.data ?? categoryRes?.data ?? [];
    const supplierRows = supplierRes?.data?.data ?? supplierRes?.data ?? [];

    setCategories(Array.isArray(categoryRows) ? categoryRows : []);
    setSuppliers(Array.isArray(supplierRows) ? supplierRows : []);
  };

  const loadImages = async (equipmentId) => {
    if (!equipmentId) {
      setImages([]);
      return;
    }
    try {
      const res = await getEquipmentImages(equipmentId);
      const data = res?.data ?? res ?? [];
      setImages(Array.isArray(data) ? data : []);
    } catch (_) {
      setImages([]);
    }
  };

  const loadRows = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getEquipments({
        page: 1,
        limit: 200,
        q: query || undefined,
        status,
      });
      const data = res?.data?.data ?? res?.data ?? [];
      const normalized = Array.isArray(data) ? data : [];
      setRows(normalized);
      if (normalized.length && !selectedId) {
        setSelectedId(normalized[0].id);
      } else if (
        selectedId &&
        !normalized.some((item) => Number(item.id) === Number(selectedId))
      ) {
        setSelectedId(normalized[0]?.id || null);
      }
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e.message ||
          "Tải danh mục thiết bị thất bại",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefs();
  }, []);

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (selectedId) loadImages(selectedId);
    else setImages([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const clearImageState = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    clearImageState();
  };

  const acceptImageFile = (file) => {
    if (!file) {
      setImageFile(null);
      setImagePreview("");
      return false;
    }
    const okTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!okTypes.includes(file.type)) {
      setError("Chỉ hỗ trợ ảnh PNG, JPG hoặc WEBP.");
      clearImageState();
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh tối đa 5MB.");
      clearImageState();
      return false;
    }
    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    return true;
  };

  const handlePickImage = (e) => {
    const file = e.target.files?.[0];
    acceptImageFile(file);
  };

  const handleDropImage = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (imageUploading || saving) return;
    const file = e.dataTransfer?.files?.[0];
    acceptImageFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!imageUploading && !saving) setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const uploadSelectedImage = async (equipmentId) => {
    if (!imageFile || !equipmentId) return null;
    setImageUploading(true);
    try {
      const previousPrimaryId = primaryImage?.id || null;
      const res = await uploadEquipmentImages(equipmentId, [imageFile]);
      let created = res?.data?.[0] || res?.[0] || null;
      if (!created?.id) {
        const imgs = await getEquipmentImages(equipmentId).catch(() => null);
        const list = imgs?.data || imgs || [];
        created = Array.isArray(list) ? list[0] : null;
      }
      if (created?.id) {
        await setPrimaryEquipmentImage(equipmentId, created.id).catch(
          () => null,
        );
        if (
          previousPrimaryId &&
          Number(previousPrimaryId) !== Number(created.id)
        ) {
          await deleteEquipmentImage(equipmentId, previousPrimaryId).catch(
            () => null,
          );
        }
      }
      await loadImages(equipmentId);
      clearImageState();
      return created;
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    const targetId = editingId || selectedId;
    if (!targetId || !primaryImage?.id) return;
    if (!window.confirm("Xóa ảnh thiết bị hiện tại?")) return;
    setImageUploading(true);
    setError("");
    try {
      await deleteEquipmentImage(targetId, primaryImage.id);
      await loadImages(targetId);
      clearImageState();
      await loadRows();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Xóa ảnh thất bại");
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        code: form.code,
        description: form.description,
        categoryId: form.categoryId || null,
        preferredSupplierId: form.preferredSupplierId || null,
        price: form.price === "" ? null : Number(form.price),
        status: form.status,
      };

      let targetId = editingId;
      if (editingId) {
        const updated = await updateEquipment(editingId, payload);
        targetId = updated?.id || editingId;
      } else {
        const created = await createEquipment(payload);
        targetId = created?.id;
      }

      if (targetId && imageFile) {
        await uploadSelectedImage(targetId);
      }

      await loadRows();
      setSelectedId(targetId || null);
      await loadImages(targetId || null);
      resetForm();
    } catch (e2) {
      setError(
        e2?.response?.data?.message || e2.message || "Lưu thiết bị thất bại",
      );
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setSelectedId(row.id);
    setForm({
      name: row.name || "",
      code: row.code || "",
      description: row.description || "",
      categoryId: row.categoryId ? String(row.categoryId) : "",
      preferredSupplierId: row.preferredSupplierId
        ? String(row.preferredSupplierId)
        : "",
      price: row.price ?? "",
      status: row.status || "active",
    });
    clearImageState();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (row) => {
    if (!window.confirm(`Xóa thiết bị ${row.name}?`)) return;
    try {
      await deleteEquipment(row.id);
      if (editingId === row.id) resetForm();
      await loadRows();
    } catch (e) {
      setError(
        e?.response?.data?.message || e.message || "Xóa thiết bị thất bại",
      );
    }
  };

  return (
    <div className="eq-catalog-page">
      <section className="eq-catalog-hero">
        <div>
          <div className="eq-catalog-kicker">Thiết bị & combo</div>
          <h2>Thiết bị</h2>
          <p>
            Đây là catalog thiết bị gốc để admin quản lý. Module combo chỉ lấy
            dữ liệu từ đây để ghép combo, không lấy tồn kho admin làm điều kiện
            bán combo.
          </p>
        </div>
        <div className="eq-catalog-heroStats">
          <div className="eq-catalog-statCard">
            <span>Tổng thiết bị</span>
            <strong>{rows.length}</strong>
          </div>
          <div className="eq-catalog-statCard">
            <span>Đang hoạt động</span>
            <strong>{activeCount}</strong>
          </div>
          <div className="eq-catalog-statCard eq-catalog-statCard--accent">
            <span>Nhà cung cấp</span>
            <strong>{suppliers.length}</strong>
          </div>
        </div>
      </section>

      {error ? <div className="eq-catalog-alert">{error}</div> : null}

      <section className="eq-catalog-shell">
        <div className="eq-catalog-panel eq-catalog-panel--list">
          <div className="eq-catalog-panel__header eq-catalog-panel__header--stack">
            <div>
              <h3>Danh sách thiết bị</h3>
              <p>
                Chọn một thiết bị để xem chi tiết nhanh, hoặc bấm Sửa để nạp vào form bên
                phải. Khi bấm Tạo mới, panel bên phải sẽ chỉ hiển thị dữ liệu bạn đang nhập.
              </p>
            </div>
            <div className="eq-catalog-filters">
              <input
                className="eq-input"
                placeholder="Tìm theo tên / mã thiết bị"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadRows()}
              />
              <select
                className="eq-input eq-filter-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Ngừng bán</option>
                <option value="discontinued">Ngưng sử dụng</option>
              </select>
              <button type="button" className="eq-btn" onClick={loadRows}>
                Tìm
              </button>
            </div>
          </div>

          <div className="eq-listCards">
            {loading ? (
              <div className="eq-emptyCard">Đang tải dữ liệu thiết bị...</div>
            ) : null}
            {!loading && rows.length === 0 ? (
              <div className="eq-emptyCard">
                Chưa có thiết bị nào trong catalog.
              </div>
            ) : null}
            {!loading &&
              rows.map((row) => {
                const imageUrl = absUrl(
                  row.primaryImageUrl ||
                    row.thumbnail ||
                    row.imageUrl ||
                    row.image ||
                    "",
                );
                const isActive = Number(selectedId) === Number(row.id);
                return (
                  <article
                    key={row.id}
                    className={`eq-listCard ${isActive ? "is-active" : ""}`}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <div className="eq-listCard__media">
                      {imageUrl ? (
                        <img
                          className="eq-thumb"
                          src={imageUrl}
                          alt={row.name || "equipment"}
                        />
                      ) : (
                        <div className="eq-thumb eq-thumb--placeholder">
                          {row.name?.slice(0, 1) || "T"}
                        </div>
                      )}
                    </div>
                    <div className="eq-listCard__content">
                      <div className="eq-listCard__top">
                        <div>
                          <div className="eq-name">{row.name}</div>
                          <div className="eq-meta">
                            {row.code || `EQ-${row.id}`} ·{" "}
                            {row.categoryName || "Chưa phân loại"}
                          </div>
                        </div>
                        <span
                          className={`eq-badge is-${row.status || "inactive"}`}
                        >
                          {statusLabel(row.status)}
                        </span>
                      </div>
                      <div className="eq-listCard__sub">
                        {row.preferredSupplierName || "Chưa gán nhà cung cấp"} ·{" "}
                        {money(row.price)} đ
                      </div>
                      <div className="eq-listCard__desc">
                        {row.description || "Thiết bị chưa có mô tả chi tiết."}
                      </div>
                      <div className="eq-actions">
                        <button
                          type="button"
                          className="eq-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(row);
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="eq-btn eq-btn--danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(row);
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>
        </div>

        <div className="eq-catalog-panel eq-catalog-panel--editor">
          <div className="eq-catalog-panel__header">
            <div>
              <h3>{editingId ? "Cập nhật thiết bị" : "Tạo thiết bị mới"}</h3>
              <p>
                Chỉ giữ các trường trọng tâm để admin CRUD nhanh. Màn combo chỉ
                lấy catalog này để build gói bán cho owner.
              </p>
            </div>
            {editingId ? (
              <span className="eq-formTag">Đang sửa #{editingId}</span>
            ) : (
              <span className="eq-formTag">Tạo mới</span>
            )}
          </div>

          <div className="eq-editorBody">
            <form className="eq-form" onSubmit={handleSubmit}>
              <div className="eq-formSection">
                <div className="eq-formSection__title">Thông tin trọng tâm</div>
                <div className="eq-form__grid eq-form__grid--2col">
                  <input
                    className="eq-input"
                    placeholder="Tên thiết bị *"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <input
                    className="eq-input"
                    placeholder="Mã thiết bị"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                  <select
                    className="eq-input"
                    value={form.categoryId}
                    onChange={(e) =>
                      setForm({ ...form, categoryId: e.target.value })
                    }
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="eq-input"
                    value={form.preferredSupplierId}
                    onChange={(e) =>
                      setForm({ ...form, preferredSupplierId: e.target.value })
                    }
                  >
                    <option value="">Chọn nhà cung cấp</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="eq-input"
                    type="number"
                    placeholder="Giá tham chiếu"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                  />
                  <select
                    className="eq-input"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Ngừng bán</option>
                    <option value="discontinued">Ngưng sử dụng</option>
                  </select>
                </div>
              </div>

              <div className="eq-formSection">
                <div className="eq-formSection__title">Ảnh thiết bị</div>
                <div className="eq-uploadBox">
                  <label
                    className={`eq-uploadDrop ${imageUploading ? "is-disabled" : ""} ${dragActive ? "is-dragging" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDropImage}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handlePickImage}
                      disabled={imageUploading || saving}
                    />
                    <div className="eq-uploadDrop__icon">↑</div>
                    <div className="eq-uploadDrop__title">
                      Kéo thả ảnh vào đây hoặc bấm để chọn
                    </div>
                    <div className="eq-uploadDrop__text">
                      PNG, JPG hoặc WEBP · tối đa 5MB · upload lên Cloudinary và
                      dùng đồng bộ cho catalog + combo
                    </div>
                    <div className="eq-uploadActionsInline">
                      <button
                        type="button"
                        className="eq-btn eq-btn--accent"
                        onClick={(e) => {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }}
                        disabled={imageUploading || saving}
                      >
                        Chọn ảnh
                      </button>
                      <button
                        type="button"
                        className="eq-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          clearImageState();
                        }}
                        disabled={
                          imageUploading ||
                          saving ||
                          (!imageFile && !imagePreview)
                        }
                      >
                        Bỏ ảnh mới
                      </button>
                    </div>
                  </label>
                  <div className="eq-uploadPreviewWrap">
                    {(isCreateMode && imagePreview) || (!isCreateMode && (imagePreview || existingPrimaryImage)) ? (
                      <div className="eq-uploadPreviewCard">
                        {imagePreview || existingPrimaryImage ? (
                          <img
                            className="eq-uploadPreview"
                            src={imagePreview || existingPrimaryImage}
                            alt={form.name || selectedRow?.name || "preview"}
                          />
                        ) : (
                          <div className="eq-uploadPreview eq-uploadPreview--placeholder">
                            Chưa có ảnh
                          </div>
                        )}
                        <div className="eq-uploadPreviewMeta">
                          <div className="eq-uploadPreviewTitle">
                            {isCreateMode
                              ? "Ảnh mới sẽ dùng cho thiết bị này"
                              : imageFile
                                ? "Ảnh mới sẽ thay thế ảnh hiện tại"
                                : existingPrimaryImage
                                  ? "Ảnh hiện tại"
                                  : "Ảnh đại diện"}
                          </div>
                          <div className="eq-uploadHint eq-uploadHint--truncate">
                            {isCreateMode
                              ? imageFile
                                ? `Ảnh mới: ${imageFile.name}`
                                : "Chưa có ảnh mới được chọn."
                              : imageFile
                                ? `Ảnh mới: ${imageFile.name}`
                                : existingPrimaryImage
                                  ? "Khi lưu, ảnh mới sẽ thay ảnh cũ và ảnh cũ sẽ được xóa khỏi Cloudinary."
                                  : "Thiết bị chưa có ảnh. Hãy tải lên 1 ảnh đại diện."}
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {!isCreateMode ? (
                      <div className="eq-uploadActions">
                        <button
                          type="button"
                          className="eq-btn"
                          onClick={(e) => {
                            e.preventDefault();
                            fileInputRef.current?.click();
                          }}
                          disabled={imageUploading || saving}
                        >
                          Thay ảnh
                        </button>
                        <button
                          type="button"
                          className="eq-btn eq-btn--danger"
                          onClick={handleRemoveImage}
                          disabled={imageUploading || saving || !primaryImage?.id}
                        >
                          Xóa ảnh
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="eq-formSection">
                <div className="eq-formSection__title">Mô tả ngắn</div>
                <textarea
                  className="eq-input eq-textarea"
                  placeholder="Mô tả ngắn để owner/admin dễ nhận diện thiết bị"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              <div className="eq-form__actions">
                <button
                  type="submit"
                  className="eq-btn eq-btn--accent"
                  disabled={saving}
                >
                  {saving
                    ? "Đang lưu..."
                    : editingId
                      ? "Cập nhật thiết bị"
                      : "Tạo thiết bị"}
                </button>
                <button type="button" className="eq-btn" onClick={resetForm}>
                  Làm mới
                </button>
              </div>
            </form>

            <aside className="eq-previewPanel">
              <div className="eq-previewPanel__title">{previewTitle}</div>
              <div className="eq-previewCard">
                {previewImageSrc ? (
                  <img
                    className="eq-previewCard__image"
                    src={previewImageSrc}
                    alt={previewName || "equipment"}
                  />
                ) : (
                  <div className="eq-previewCard__image eq-previewCard__image--placeholder">
                    {(previewName || "T").slice(0, 1)}
                  </div>
                )}
                <div className="eq-previewCard__header">
                  <div>
                    <div className="eq-previewCard__name">{previewName}</div>
                    <div className="eq-meta">
                      {previewCode} · {previewCategoryName}
                    </div>
                  </div>
                  <span
                    className={`eq-badge is-${previewStatus}`}
                  >
                    {statusLabel(previewStatus)}
                  </span>
                </div>
                <div className="eq-previewCard__price">
                  {previewPrice === null || previewPrice === ""
                    ? "Chưa thiết lập giá"
                    : `${money(previewPrice)} đ`}
                </div>
                <div className="eq-previewCard__line">
                  Nhà cung cấp ưu tiên:{" "}
                  <b>
                    {previewSupplierName}
                  </b>
                </div>
                <div className="eq-previewCard__line">
                  Danh mục:{" "}
                  <b>
                    {previewCategoryName}
                  </b>
                </div>
                <div className="eq-previewCard__desc">
                  {previewDescription}
                </div>
                <div className="eq-previewNote">
                  {isCreateMode
                    ? "Bạn đang ở chế độ tạo mới. Panel này chỉ xem trước dữ liệu đang nhập, không lấy thông tin của thiết bị cũ."
                    : "Bạn đang ở chế độ chỉnh sửa. Kiểm tra lại ảnh, tên, danh mục, nhà cung cấp và giá trước khi lưu cập nhật."}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
