import React, { useEffect, useState } from "react";
import "./SuppliersPage.css";

import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  toggleSupplierActive,
} from "../../../services/equipmentSupplierInventoryService";

  
const empty = {
  name: "",
  code: "",
  email: "",
  phone: "",
  address: "",
  taxCode: "",
  notes: "",
  isActive: true,
};

export default function SuppliersPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [show, setShow] = useState(false);
  const [mode, setMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(empty);

  const fetchAll = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await getSuppliers({
        q: search || undefined,
        isActive: activeFilter !== "all" ? activeFilter === "true" : undefined,
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
  }, []);

  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setForm(empty);
    setShow(true);
  };

  const openEdit = (row) => {
    setMode("edit");
    setEditingId(row.id);
    setForm({
      name: row.name ?? "",
      code: row.code ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      address: row.address ?? "",
      taxCode: row.taxCode ?? "",
      notes: row.notes ?? "",
      isActive: row.isActive ?? true,
    });
    setShow(true);
  };

  const save = async () => {
    setErr("");
    try {
      if (!form.name?.trim()) {
        setErr("Tên nhà cung cấp là bắt buộc");
        return;
      }
      if (mode === "create") await createSupplier(form);
      else await updateSupplier(editingId, form);
      setShow(false);
      fetchAll();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Save failed");
    }
  };

  const toggleActive = async (row) => {
    try {
      await toggleSupplierActive(row.id, !row.isActive);
      fetchAll();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Update failed");
    }
  };

  return (
    <div className="sup-page">
      <div className="sup-header">
        <h2>Nhà cung cấp</h2>
        <button className="btn primary" onClick={openCreate}>
          + Thêm nhà cung cấp
        </button>
      </div>

      <div className="sup-filters">
        <input
          className="input"
          placeholder="Tìm theo tên / mã / phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchAll()}
        />
        <select
          className="select"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          <option value="all">Tất cả</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Ngưng hoạt động</option>
        </select>
        <button className="btn" onClick={fetchAll}>
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
              <th>Mã</th>
              <th>Tên</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Trạng thái</th>
              <th style={{ width: 240 }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td className="empty" colSpan={7}>Không có dữ liệu</td></tr>
            ) : (
              items.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.code || "-"}</td>
                  <td>{row.name}</td>
                  <td>{row.phone || "-"}</td>
                  <td>{row.email || "-"}</td>
                  <td>
                    <span className={`badge ${row.isActive ? "active" : "inactive"}`}>
                      {row.isActive ? "active" : "inactive"}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn small" onClick={() => openEdit(row)}>Sửa</button>
                    <button className="btn small" onClick={() => toggleActive(row)}>
                      {row.isActive ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {show ? (
        <div className="modal-backdrop" onMouseDown={() => setShow(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{mode === "create" ? "Thêm nhà cung cấp" : "Sửa nhà cung cấp"}</h3>
              <button className="btn small" onClick={() => setShow(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="grid">
                <label>
                  Tên *
                  <input className="input" value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}/>
                </label>

                <label>
                  Mã
                  <input className="input" value={form.code}
                    onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}/>
                </label>

                <label>
                  Phone
                  <input className="input" value={form.phone}
                    onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}/>
                </label>

                <label>
                  Email
                  <input className="input" value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}/>
                </label>

                <label className="full">
                  Địa chỉ
                  <input className="input" value={form.address}
                    onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}/>
                </label>

                <label>
                  Mã số thuế
                  <input className="input" value={form.taxCode}
                    onChange={(e) => setForm((s) => ({ ...s, taxCode: e.target.value }))}/>
                </label>

                <label className="full">
                  Ghi chú
                  <textarea className="textarea" rows={3} value={form.notes}
                    onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}/>
                </label>

                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={!!form.isActive}
                    onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))}
                  />
                  Đang hoạt động
                </label>
              </div>

              {err ? <div className="alert">{err}</div> : null}
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setShow(false)}>Huỷ</button>
              <button className="btn primary" onClick={save}>Lưu</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
