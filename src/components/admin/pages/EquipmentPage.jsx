import React, { useEffect, useMemo, useState } from "react";
import "./EquipmentPage.css";

import {
  getEquipments,
  createEquipment,
  updateEquipment,
  discontinueEquipment,
  getEquipmentCategories,
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
  maxStockLevel: "",
  status: "active",
};

export default function EquipmentPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [page, setPage] = useState(1);
  const limit = 10;

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const totalPages = useMemo(() => {
    return 1;
  }, [items]); // warning hook không ảnh hưởng chạy

  const fetchAll = async () => {
    setLoading(true);
    setErr("");
    try {
      const catRes = await getEquipmentCategories({ isActive: true });
      setCategories(catRes?.data?.data ?? catRes?.data ?? []);

      const res = await getEquipments({
        q: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        categoryId: categoryFilter !== "all" ? categoryFilter : undefined,
        page,
        limit,
      });

      const data = res?.data?.data ?? res?.data ?? [];
      setItems(Array.isArray(data) ? data : data.items ?? []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const onSearch = () => {
    setPage(1);
    fetchAll();
  };

  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setMode("edit");
    setEditingId(row.id);
    setForm({
      name: row.name ?? "",
      code: row.code ?? "",
      description: row.description ?? "",
      categoryId: row.categoryId ?? "",
      brand: row.brand ?? "",
      model: row.model ?? "",
      unit: row.unit ?? "piece",
      minStockLevel: row.minStockLevel ?? 0,
      maxStockLevel: row.maxStockLevel ?? "",
      status: row.status ?? "active",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setErr("");
  };

  const save = async () => {
    setErr("");
    try {
      const payload = {
        name: form.name?.trim(),
        code: form.code?.trim() || null,
        description: form.description?.trim() || null,
        brand: form.brand?.trim() || null,
        model: form.model?.trim() || null,
        unit: form.unit || "piece",
        status: form.status || "active",
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        minStockLevel: Number(form.minStockLevel || 0),
        maxStockLevel: form.maxStockLevel === "" ? null : Number(form.maxStockLevel),
      };

      if (!payload.name) {
        setErr("Tên thiết bị là bắt buộc");
        return;
      }

      if (mode === "create") await createEquipment(payload);
      else await updateEquipment(editingId, payload);

      closeModal();
      fetchAll();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Save failed");
    }
  };

  const softDelete = async (row) => {
    if (!window.confirm("Ẩn (xóa mềm) thiết bị này?")) return;
    try {
      await discontinueEquipment(row.id);
      fetchAll();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Discontinue failed");
    }
  };

  return (
    <div className="eq-page">
      <div className="eq-header">
        <h2>Thiết bị</h2>

        <div className="eq-actions">
          <button className="btn primary" onClick={openCreate}>
            + Thêm thiết bị
          </button>
        </div>
      </div>

      <div className="eq-filters">
        <input
          className="input"
          placeholder="Tìm theo tên / mã / brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />

        <select
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
          <option value="discontinued">discontinued</option>
        </select>

        <select
          className="select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <button className="btn" onClick={onSearch}>
          Lọc / Tìm
        </button>
      </div>

      {err ? <div className="alert">{err}</div> : null}
      {loading ? <div className="muted">Đang tải...</div> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>MÃ</th>
              <th>TÊN</th>
              <th>DANH MỤC</th>
              <th>ĐƠN VỊ</th>
              <th>TỐI THIỂU</th>
              <th>TRẠNG THÁI</th>
              <th>HÀNH ĐỘNG</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.code || "-"}</td>
                  <td>{row.name}</td>
                  <td>{row.category?.name || row.categoryName || row.categoryId || "-"}</td>
                  <td>{row.unit || "-"}</td>
                  <td>{row.minStockLevel ?? 0}</td>
                  <td>
                    <span className={`badge ${row.status}`}>{row.status}</span>
                  </td>
                  <td className="actions">
                    <button className="btn small" onClick={() => openEdit(row)}>
                      Sửa
                    </button>
                    <button
                      className="btn small danger"
                      onClick={() => softDelete(row)}
                      disabled={row.status === "discontinued"}
                      title={row.status === "discontinued" ? "Đã discontinued" : "Xoá mềm"}
                    >
                      Ẩn thiết bị
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pager">
        <button className="btn small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          ← Trước
        </button>
        <span className="muted">
          Trang {page}
          {totalPages > 1 ? ` / ${totalPages}` : ""}
        </span>
        <button className="btn small" onClick={() => setPage((p) => p + 1)}>
          Sau →
        </button>
      </div>

      {showModal ? (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{mode === "create" ? "Thêm thiết bị" : "Sửa thiết bị"}</h3>
              <button className="btn small" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="grid">
                <label>
                  Tên *
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  />
                </label>

                <label>
                  Mã
                  <input
                    className="input"
                    value={form.code}
                    onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
                  />
                </label>

                <label>
                  Danh mục
                  <select
                    className="select"
                    value={form.categoryId}
                    onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))}
                  >
                    <option value="">-- chọn --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Đơn vị
                  <input
                    className="input"
                    value={form.unit}
                    onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value }))}
                  />
                </label>

                <label>
                  Brand
                  <input
                    className="input"
                    value={form.brand}
                    onChange={(e) => setForm((s) => ({ ...s, brand: e.target.value }))}
                  />
                </label>

                <label>
                  Model
                  <input
                    className="input"
                    value={form.model}
                    onChange={(e) => setForm((s) => ({ ...s, model: e.target.value }))}
                  />
                </label>

                <label className="full">
                  Mô tả
                  <textarea
                    className="textarea"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  />
                </label>

                <label>
                  Min stock
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={form.minStockLevel}
                    onChange={(e) => setForm((s) => ({ ...s, minStockLevel: e.target.value }))}
                  />
                </label>

                <label>
                  Max stock
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={form.maxStockLevel}
                    onChange={(e) => setForm((s) => ({ ...s, maxStockLevel: e.target.value }))}
                  />
                </label>

                <label>
                  Trạng thái
                  <select
                    className="select"
                    value={form.status}
                    onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="discontinued">discontinued</option>
                  </select>
                </label>
              </div>

              {err ? <div className="alert">{err}</div> : null}
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={closeModal}>
                Huỷ
              </button>
              <button className="btn primary" onClick={save}>
                Lưu
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
