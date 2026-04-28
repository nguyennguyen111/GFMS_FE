import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../../setup/axios";
import adminPurchaseWorkflowService from "../../../services/adminPurchaseWorkflowService";
import { getEquipments, getSuppliers } from "../../../services/equipmentSupplierInventoryService";
import { showAppConfirm } from "../../../utils/appDialog";
import "./EquipmentPage.css";

const money = (value) => Number(value || 0).toLocaleString("vi-VN");
const statusLabel = (value) => (value === "inactive" ? "Ngừng hoạt động" : "Đang hoạt động");

const emptyItem = { equipmentId: "", quantity: 1, note: "" };
const emptyForm = {
  name: "",
  code: "",
  description: "",
  price: "",
  status: "active",
  thumbnail: "",
  supplierId: "",
  isSelling: true,
  items: [emptyItem],
};

export default function EquipmentPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [equipmentQuery, setEquipmentQuery] = useState("");
  const [comboPage, setComboPage] = useState(1);
  const [equipmentPage, setEquipmentPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [noticeModal, setNoticeModal] = useState({
    open: false,
    tone: "error",
    title: "",
    message: "",
  });
  const COMBO_PAGE_SIZE = 6;
  const EQUIPMENT_PAGE_SIZE = 6;

  const API_HOST = String(axios?.defaults?.baseURL || process.env.REACT_APP_API_BASE || "http://localhost:8080").replace(/\/+$/, "");
  const absUrl = (u) => (u ? ((String(u).startsWith("http") || String(u).startsWith("data:")) ? u : `${API_HOST}${u}`) : "");

  const equipmentMap = useMemo(
    () => new Map(equipments.map((equipment) => [Number(equipment.id), equipment])),
    [equipments]
  );

  const totalItems = useMemo(
    () => form.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [form.items]
  );

  const selectedEquipmentKinds = useMemo(
    () => form.items.filter((item) => item.equipmentId).length,
    [form.items]
  );

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => Number(supplier.id) === Number(form.supplierId)),
    [suppliers, form.supplierId]
  );


  const comboThumbnailUrl = useMemo(() => absUrl(form.thumbnail), [form.thumbnail]);
  const comboTotalPages = useMemo(
    () => Math.max(1, Math.ceil(rows.length / COMBO_PAGE_SIZE)),
    [rows],
  );
  const pagedRows = useMemo(() => {
    const start = (comboPage - 1) * COMBO_PAGE_SIZE;
    return rows.slice(start, start + COMBO_PAGE_SIZE);
  }, [rows, comboPage]);

  const openNotice = (tone, title, message) =>
    setNoticeModal({
      open: true,
      tone: tone || "error",
      title: title || "Thông báo",
      message: message || "Đã xảy ra lỗi.",
    });

  const uploadThumbnailFile = async (file) => {
    if (!file) return;
    const isValidType = ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type);
    if (!isValidType) {
      openNotice("warning", "Ảnh không hợp lệ", "Ảnh bìa chỉ hỗ trợ PNG, JPG, JPEG hoặc WEBP.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      openNotice("warning", "Ảnh quá lớn", "Ảnh bìa không được vượt quá 8MB.");
      return;
    }

    const data = new FormData();
    data.append("file", file);
    data.append("kind", "image");
    setUploadingThumbnail(true);
    try {
      const res = await axios.post("/api/upload/chat-asset", data, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      });
      const uploadedUrl = res?.data?.url || "";
      setForm((prev) => ({ ...prev, thumbnail: uploadedUrl }));
    } catch (e) {
      openNotice("error", "Upload thất bại", e?.response?.data?.error || e?.response?.data?.message || e.message);
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleThumbnailInputChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) await uploadThumbnailFile(file);
    e.target.value = "";
  };

  const filteredEquipments = useMemo(() => {
    const keyword = equipmentQuery.trim().toLowerCase();
    if (!keyword) return equipments;
    return equipments.filter((equipment) => {
      const haystack = [equipment.name, equipment.code, equipment.description, equipment?.category?.name, equipment?.categoryName, equipment?.preferredSupplierName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [equipments, equipmentQuery]);
  const equipmentTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredEquipments.length / EQUIPMENT_PAGE_SIZE)),
    [filteredEquipments],
  );
  const pagedEquipments = useMemo(() => {
    const start = (equipmentPage - 1) * EQUIPMENT_PAGE_SIZE;
    return filteredEquipments.slice(start, start + EQUIPMENT_PAGE_SIZE);
  }, [filteredEquipments, equipmentPage]);

  const loadRefs = async () => {
    const [eqRes, supplierRes] = await Promise.all([
      getEquipments({ page: 1, limit: 500, status: "all" }),
      getSuppliers({ page: 1, limit: 200 }),
    ]);
    setEquipments(eqRes?.data || []);
    setSuppliers(supplierRes?.data || []);
  };

  const loadRows = async () => {
    setLoading(true);
    try {
      const res = await adminPurchaseWorkflowService.getEquipmentCombos({ q: query, page: 1, limit: 100 });
      setRows(res?.data?.data || []);
      setComboPage(1);
    } catch (e) {
      openNotice("error", "Tải combo thất bại", e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefs();
    loadRows();
  }, []);

  useEffect(() => {
    setComboPage((prev) => Math.min(prev, comboTotalPages));
  }, [comboTotalPages]);

  useEffect(() => {
    setEquipmentPage(1);
  }, [equipmentQuery]);

  useEffect(() => {
    setEquipmentPage((prev) => Math.min(prev, equipmentTotalPages));
  }, [equipmentTotalPages]);

  const resetForm = () => {
    setForm({ ...emptyForm, items: [{ ...emptyItem }] });
    setEditingId(null);
  };

  const addEquipmentToCombo = (equipmentId) => {
    setForm((prev) => {
      const existed = prev.items.find((item) => Number(item.equipmentId) === Number(equipmentId));
      if (existed) {
        return {
          ...prev,
          items: prev.items.map((item) => (
            Number(item.equipmentId) === Number(equipmentId)
              ? { ...item, quantity: Number(item.quantity || 0) + 1 }
              : item
          )),
        };
      }
      return {
        ...prev,
        items: [...prev.items.filter((item, index) => index > 0 || item.equipmentId), { equipmentId: String(equipmentId), quantity: 1, note: "" }],
      };
    });
  };

  const updateItem = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      const nextItems = prev.items.filter((_, idx) => idx !== index);
      return {
        ...prev,
        items: nextItems.length ? nextItems : [{ ...emptyItem }],
      };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!String(form.name || "").trim()) {
      openNotice("warning", "Thiếu thông tin", "Tên combo là bắt buộc.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price || 0),
        supplierId: form.supplierId || null,
        items: form.items
          .filter((item) => item.equipmentId)
          .map((item, index) => ({
            equipmentId: Number(item.equipmentId),
            quantity: Number(item.quantity || 1),
            note: item.note || "",
            sortOrder: index + 1,
          })),
      };
      if (editingId) {
        await adminPurchaseWorkflowService.updateEquipmentCombo(editingId, payload);
      } else {
        await adminPurchaseWorkflowService.createEquipmentCombo(payload);
      }
      resetForm();
      loadRows();
      openNotice("success", "Thành công", editingId ? "Đã cập nhật combo." : "Đã tạo combo mới.");
    } catch (e2) {
      openNotice("error", "Lưu combo thất bại", e2?.response?.data?.message || e2.message);
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || "",
      code: row.code || "",
      description: row.description || "",
      price: row.price || "",
      status: row.status || "active",
      thumbnail: row.thumbnail || "",
      supplierId: row.supplierId || "",
      isSelling: Boolean(row.isSelling),
      items: (row.items || []).length
        ? row.items.map((item) => ({
            equipmentId: String(item.equipmentId),
            quantity: item.quantity,
            note: item.note || "",
          }))
        : [{ ...emptyItem }],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (row) => {
    const confirmResult = await showAppConfirm({
      title: "Xác nhận xóa combo",
      message: `Bạn có chắc muốn xóa combo "${row.name}"?`,
      confirmText: "Xóa combo",
      cancelText: "Quay lại",
    });
    if (!confirmResult.confirmed) return;
    try {
      await adminPurchaseWorkflowService.deleteEquipmentCombo(row.id);
      loadRows();
      if (editingId === row.id) resetForm();
      openNotice("success", "Đã xóa", `Đã xóa combo "${row.name}".`);
    } catch (e) {
      openNotice("error", "Xóa thất bại", e?.response?.data?.message || e.message);
    }
  };

  const onToggleSelling = async (row) => {
    try {
      await adminPurchaseWorkflowService.toggleEquipmentComboSelling(row.id, { isSelling: !row.isSelling });
      loadRows();
      openNotice("success", "Cập nhật thành công", row.isSelling ? "Đã tắt bán combo." : "Đã mở bán combo.");
    } catch (e) {
      openNotice("error", "Cập nhật thất bại", e?.response?.data?.message || e.message);
    }
  };

  return (
    <div className="combo-admin-page">
      <div className="combo-admin-hero">
        <div>
          <div className="combo-admin-kicker">Thiết bị & combo</div>
          <h2>Combo thiết bị</h2>
        </div>
        <div className="combo-admin-heroStats">
          <div className="combo-admin-statCard">
            <span>Thiết bị sẵn để ghép combo</span>
            <strong>{equipments.length}</strong>
          </div>
          <div className="combo-admin-statCard">
            <span>Combo đang quản lý</span>
            <strong>{rows.length}</strong>
          </div>
          <div className="combo-admin-statCard combo-admin-statCard--accent">
            <span>Thiết bị đã chọn vào combo</span>
            <strong>{selectedEquipmentKinds}</strong>
          </div>
        </div>
      </div>

      <div className="combo-admin-toolbar">
        <button type="button" className="combo-btn" onClick={() => navigate("/admin/devices")}>Mở trang thiết bị</button>
        <button type="button" className="combo-btn combo-btn--ghost" onClick={() => navigate("/admin/suppliers")}>Mở trang nhà cung cấp</button>
      </div>

      <div className="combo-admin-layout">
        <section className="combo-panel combo-panel--catalog">
          <div className="combo-panel__header">
            <div>
              <h3>Danh mục thiết bị hiện có</h3>
              <p>Admin chọn từ danh mục thiết bị gốc để thêm vào combo.</p>
            </div>
            <input
              className="combo-input"
              placeholder="Tìm theo tên / mã thiết bị"
              value={equipmentQuery}
              onChange={(e) => setEquipmentQuery(e.target.value)}
            />
          </div>

          <div className="combo-equipment-grid">
            {pagedEquipments.map((equipment) => {
              const imageUrl = absUrl(equipment.primaryImageUrl || equipment.thumbnail || equipment.imageUrl || equipment.image || "");
              const categoryName = equipment?.category?.name || equipment?.categoryName || "Chưa phân loại";
              const supplierName = equipment?.preferredSupplierName || equipment?.supplier?.name || "Chưa gán nhà cung cấp";
              return (
                <div key={equipment.id} className="combo-equipment-card">
                  <div className="combo-equipment-card__media">
                    {imageUrl ? (
                      <img src={imageUrl} alt={equipment.name} />
                    ) : (
                      <div className="combo-equipment-card__placeholder">{equipment.name?.slice(0, 1) || "T"}</div>
                    )}
                  </div>
                  <div className="combo-equipment-card__top">
                    <div>
                      <div className="combo-equipment-card__name">{equipment.name}</div>
                      <div className="combo-equipment-card__meta">
                        {equipment.code || `EQ-${equipment.id}`} · {categoryName}
                      </div>
                    </div>
                    <div className="combo-tag">Danh mục gốc</div>
                  </div>
                  <div className="combo-equipment-card__desc">{equipment.description || "Chưa có mô tả thiết bị."}</div>
                  <div className="combo-equipment-card__footer">
                    <span className="combo-tag">{supplierName}</span>
                    <button type="button" className="combo-btn combo-btn--accent" onClick={() => addEquipmentToCombo(equipment.id)}>
                      Thêm vào combo
                    </button>
                  </div>
                </div>
              );
            })}
            {!filteredEquipments.length ? <div className="combo-empty">Không tìm thấy thiết bị phù hợp.</div> : null}
          </div>
          {filteredEquipments.length > 0 ? (
            <div className="combo-listPagination">
              <button
                type="button"
                className="combo-btn combo-btn--ghost"
                onClick={() => setEquipmentPage((p) => Math.max(1, p - 1))}
                disabled={equipmentPage <= 1}
              >
                ← Trước
              </button>
              <span className="combo-listPagination__meta">
                Trang {equipmentPage}/{equipmentTotalPages}
              </span>
              <button
                type="button"
                className="combo-btn combo-btn--ghost"
                onClick={() => setEquipmentPage((p) => Math.min(equipmentTotalPages, p + 1))}
                disabled={equipmentPage >= equipmentTotalPages}
              >
                Sau →
              </button>
            </div>
          ) : null}
        </section>

        <section className="combo-panel combo-panel--editor">
          <div className="combo-panel__header">
            <div>
              <h3>{editingId ? "Cập nhật combo" : "Tạo combo từ danh mục thiết bị"}</h3>
            </div>
          </div>

          <form className="combo-form" onSubmit={submit}>
            <div className="combo-form__grid combo-form__grid--2col">
              <input className="combo-input" placeholder="Tên combo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="combo-input" placeholder="Mã combo" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              <input className="combo-input" placeholder="Giá bán combo" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <select className="combo-input" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">Chọn nhà cung cấp</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
              <select className="combo-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Ngừng hoạt động</option>
              </select>
              <div className="combo-thumbnailField">
                <div
                  className={`combo-thumbnailDropzone ${uploadingThumbnail ? "is-uploading" : ""}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) uploadThumbnailFile(file);
                  }}
                >
                  <input
                    id="combo-thumbnail-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="combo-thumbnailDropzone__input"
                    onChange={handleThumbnailInputChange}
                  />
                  <div className="combo-thumbnailDropzone__content">
                    <strong>{uploadingThumbnail ? "Đang tải ảnh lên..." : "Kéo thả ảnh combo vào đây"}</strong>
                    <span>Hoặc bấm để chọn ảnh bìa. Hỗ trợ PNG / JPG / WEBP, tối đa 8MB.</span>
                  </div>
                  <label htmlFor="combo-thumbnail-upload" className="combo-btn combo-btn--ghost">
                    {form.thumbnail ? "Thay ảnh" : "Chọn ảnh"}
                  </label>
                </div>
                <input className="combo-input" placeholder="Hoặc dán URL ảnh bìa" value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} />
                {comboThumbnailUrl ? (
                  <div className="combo-thumbnailPreview">
                    <div className="combo-thumbnailPreview__media">
                      <img src={comboThumbnailUrl} alt={form.name || "ảnh bìa combo"} />
                    </div>
                    <div className="combo-thumbnailPreview__text">
                      <strong>Ảnh bìa hiện tại</strong>
                      <span>Ảnh sẽ được crop gọn theo khung vuông để không bị phình khi preview và khi owner xem combo.</span>
                      <span>{form.thumbnail}</span>
                    </div>
                  </div>
                ) : null}
                {form.thumbnail ? (
                  <button type="button" className="combo-btn combo-btn--ghost combo-thumbnailField__remove" onClick={() => setForm((prev) => ({ ...prev, thumbnail: "" }))}>
                    Xóa ảnh
                  </button>
                ) : null}
              </div>
            </div>

            <textarea className="combo-input combo-textarea" placeholder="Mô tả combo" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

            <label className="combo-checkboxRow">
              <input type="checkbox" checked={form.isSelling} onChange={(e) => setForm({ ...form, isSelling: e.target.checked })} />
              <span>Đang mở bán combo này</span>
            </label>

            <div className="combo-selectedBlock">
              <div className="combo-selectedBlock__head">
                <div>
                  <h4>Thiết bị trong combo</h4>
                  <p>Hiển thị rõ từng thiết bị để admin cấu hình và owner theo dõi đầy đủ.</p>
                </div>
                <div className="combo-selectedBlock__stats">
                  <span>{totalItems} thiết bị</span>
                  <span>Giá bán được set ở cấp combo, không lấy từ từng thiết bị lẻ</span>
                </div>
              </div>

              <div className="combo-selectedTable">
                <div className="combo-selectedTable__head">
                  <span>Thiết bị</span>
                  <span>Số lượng</span>
                  <span>Ghi chú</span>
                  <span />
                </div>
                {form.items.map((item, index) => {
                  const equipment = equipmentMap.get(Number(item.equipmentId));
                  return (
                    <div key={index} className="combo-selectedRow">
                      <div className="combo-selectedEquipment">
                        <select className="combo-input" value={item.equipmentId} onChange={(e) => updateItem(index, { equipmentId: e.target.value })}>
                          <option value="">Chọn thiết bị</option>
                          {equipments.map((equipmentOption) => (
                            <option key={equipmentOption.id} value={equipmentOption.id}>{equipmentOption.name}</option>
                          ))}
                        </select>
                        <div className="combo-selectedEquipment__meta">
                          {equipment ? `${equipment.code || `EQ-${equipment.id}`} · ${equipment?.category?.name || equipment?.categoryName || "Chưa phân loại"}` : "Chọn một thiết bị từ danh mục hiện có"}
                        </div>
                      </div>
                      <input className="combo-input" type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, { quantity: e.target.value })} />
                      <input className="combo-input" placeholder="Ghi chú thiết bị" value={item.note} onChange={(e) => updateItem(index, { note: e.target.value })} />
                      <button type="button" className="combo-btn combo-btn--ghost" onClick={() => removeItem(index)}>Xóa</button>
                    </div>
                  );
                })}
              </div>

              <div className="combo-selectedActions">
                <button type="button" className="combo-btn" onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }))}>
                  + Thêm dòng thiết bị
                </button>
              </div>
            </div>

            <div className="combo-previewCard">
              <div className="combo-previewCard__cover">
                {comboThumbnailUrl ? <img src={comboThumbnailUrl} alt={form.name || "combo"} /> : <div>{form.name || "Xem trước combo"}</div>}
              </div>
              <div className="combo-previewCard__body">
                <div className="combo-previewCard__titleRow">
                  <div>
                    <div className="combo-previewCard__title">{form.name || "Tên combo sẽ hiển thị ở đây"}</div>
                    <div className="combo-previewCard__meta">{form.code || "Mã combo"} · {selectedSupplier?.name || "Chưa chọn nhà cung cấp"}</div>
                  </div>
                  <div className="combo-previewCard__price">{money(form.price)}đ</div>
                </div>
                <div className="combo-previewCard__desc">{form.description || "Mô tả combo sẽ xuất hiện cho owner xem trước khi gửi yêu cầu."}</div>
                <div className="combo-previewItems">
                  {form.items.filter((item) => item.equipmentId).map((item, index) => {
                    const equipment = equipmentMap.get(Number(item.equipmentId));
                    return (
                      <div key={`${item.equipmentId}-${index}`} className="combo-previewItems__row">
                        <div>
                          <strong>{equipment?.name || `Thiết bị #${item.equipmentId}`}</strong>
                          <span>{equipment?.code || "Chưa có mã"}</span>
                        </div>
                        <div>x {item.quantity}</div>
                      </div>
                    );
                  })}
                  {!form.items.some((item) => item.equipmentId) ? <div className="combo-empty">Chưa có thiết bị nào trong combo.</div> : null}
                </div>
              </div>
            </div>

            <div className="combo-form__actions">
              <button className="combo-btn combo-btn--accent" type="submit" disabled={saving}>
                {saving ? "Đang lưu..." : editingId ? "Lưu thay đổi combo" : "Tạo combo"}
              </button>
              {editingId ? <button className="combo-btn combo-btn--ghost" type="button" onClick={resetForm}>Hủy sửa</button> : null}
            </div>
          </form>
        </section>
      </div>

      <section className="combo-panel combo-panel--list">
        <div className="combo-panel__header">
          <div>
            <h3>Danh sách combo đã setup</h3>
            <p>Hiển thị rõ các thiết bị thành phần để admin kiểm tra trước khi bán.</p>
          </div>
          <div className="combo-searchBox">
            <input className="combo-input" placeholder="Tìm combo" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button type="button" className="combo-btn" onClick={loadRows}>Tìm</button>
          </div>
        </div>

        {loading ? <div className="combo-empty">Đang tải combo...</div> : null}
        <div className="combo-listGrid">
          {pagedRows.map((row) => (
            <article key={row.id} className="combo-card">
              <div className="combo-card__top">
                <div className="combo-card__identity">
                  <div className="combo-card__thumb">
                    {row.thumbnail ? <img src={row.thumbnail} alt={row.name} /> : <span>{row.name?.slice(0, 1) || "C"}</span>}
                  </div>
                  <div>
                    <div className="combo-card__name">{row.name}</div>
                    <div className="combo-card__meta">
                      {row.code} · {row.supplier?.name || "Chưa gán nhà cung cấp"} · {statusLabel(row.status)}
                    </div>
                  </div>
                </div>
                <div className="combo-card__priceWrap">
                  <strong>{money(row.price)}đ</strong>
                  <span className={`combo-badge ${row.isSelling ? "is-selling" : "is-paused"}`}>
                    {row.isSelling ? "Đang bán" : "Tạm dừng"}
                  </span>
                </div>
              </div>

              <div className="combo-card__desc">{row.description || "Không có mô tả combo."}</div>

              <div className="combo-card__table">
                <div className="combo-card__tableHead">
                  <span>Thiết bị</span>
                  <span>Mã</span>
                  <span>Số lượng</span>
                </div>
                {(row.items || []).map((item) => (
                  <div key={item.id} className="combo-card__tableRow">
                    <span>{item.equipment?.name || `#${item.equipmentId}`}</span>
                    <span>{item.equipment?.code || "-"}</span>
                    <span>x {item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="combo-card__actions">
                <button type="button" className="combo-btn" onClick={() => onEdit(row)}>Sửa</button>
                <button type="button" className="combo-btn combo-btn--ghost" onClick={() => onToggleSelling(row)}>
                  {row.isSelling ? "Tắt bán" : "Mở bán"}
                </button>
                <button type="button" className="combo-btn combo-btn--danger" onClick={() => onDelete(row)}>Xóa</button>
              </div>
            </article>
          ))}
          {!rows.length && !loading ? <div className="combo-empty">Chưa có combo nào.</div> : null}
        </div>
        {!loading && rows.length > 0 ? (
          <div className="combo-listPagination">
            <button
              type="button"
              className="combo-btn combo-btn--ghost"
              onClick={() => setComboPage((p) => Math.max(1, p - 1))}
              disabled={comboPage <= 1}
            >
              ← Trước
            </button>
            <span className="combo-listPagination__meta">
              Trang {comboPage}/{comboTotalPages}
            </span>
            <button
              type="button"
              className="combo-btn combo-btn--ghost"
              onClick={() => setComboPage((p) => Math.min(comboTotalPages, p + 1))}
              disabled={comboPage >= comboTotalPages}
            >
              Sau →
            </button>
          </div>
        ) : null}
      </section>

      {noticeModal.open ? (
        <div
          className="combo-notice-overlay"
          role="presentation"
          onClick={() => setNoticeModal({ open: false, tone: "error", title: "", message: "" })}
        >
          <div
            className={`combo-notice-card is-${noticeModal.tone || "error"}`}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="combo-notice-close"
              onClick={() => setNoticeModal({ open: false, tone: "error", title: "", message: "" })}
              aria-label="Đóng"
            >
              ×
            </button>
            <div className="combo-notice-title">{noticeModal.title || "Thông báo"}</div>
            <div className="combo-notice-message">{noticeModal.message}</div>
            <div className="combo-notice-actions">
              <button
                type="button"
                className="combo-btn combo-btn--accent"
                onClick={() => setNoticeModal({ open: false, tone: "error", title: "", message: "" })}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
