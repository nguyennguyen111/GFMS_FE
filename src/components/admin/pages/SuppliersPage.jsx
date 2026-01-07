import React, { useEffect, useMemo, useState } from "react";
import "./SuppliersPage.css";

import {
  createSupplier,
  getSuppliers,
  setSupplierActive, // ✅ dùng cái này để gửi isActive
  updateSupplier,
} from "../../../services/equipmentSupplierInventoryService";

const emptyForm = {
  name: "",
  code: "",
  phone: "",
  email: "",
  address: "",
  taxCode: "",
  notes: "",
  isActive: true,
};

export default function SuppliersPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [items, setItems] = useState([]);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all"); // all | active | inactive

  // modal
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchAll = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await getSuppliers({
        page: 1,
        limit: 200,
        q: q || undefined,
        status: status !== "all" ? status : undefined,
      });

      const data = res?.data?.data ?? res?.data ?? [];
      setItems(Array.isArray(data) ? data : data.items ?? []);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = () => fetchAll();

  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setForm(emptyForm);
    setErr("");
    setShow(true);
  };

  const openEdit = (row) => {
    setMode("edit");
    setEditingId(row.id);
    setForm({
      name: row.name ?? "",
      code: row.code ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      address: row.address ?? "",
      taxCode: row.taxCode ?? "",
      notes: row.notes ?? "",
      isActive: !!row.isActive,
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
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
        address: form.address?.trim() || null,
        taxCode: form.taxCode?.trim() || null,
        notes: form.notes?.trim() || null,
        // ✅ gửi isActive để backend map sang status active/inactive
        isActive: !!form.isActive,
      };

      if (!payload.name) {
        setErr("Tên nhà cung cấp là bắt buộc");
        return;
      }

      if (mode === "create") await createSupplier(payload);
      else await updateSupplier(editingId, payload);

      closeModal();
      fetchAll();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Save failed");
    }
  };

  /**
   * ✅ FIX HOÀN CHỈNH TOGGLE:
   * - Luôn toggle qua lại (Enable <-> Disable)
   * - Optimistic update để UI đổi ngay (tránh “chỉ enable” do state không refresh)
   * - Nếu API fail -> rollback lại
   * - Cuối cùng fetchAll() để đồng bộ server
   */
  const toggleActive = async (row) => {
    const next = !row.isActive;

    // ✅ Optimistic update: đổi UI ngay lập tức
    setItems((prev) =>
      prev.map((it) =>
        it.id === row.id
          ? { ...it, isActive: next, status: next ? "active" : "inactive" }
          : it
      )
    );

    try {
      // ưu tiên dạng object (chuẩn backend của bạn)
      await setSupplierActive(row.id, { isActive: next });
    } catch (e1) {
      try {
        // fallback: nếu service FE chỉ nhận boolean
        await setSupplierActive(row.id, next);
      } catch (e2) {
        // ❌ rollback nếu thất bại
        setItems((prev) =>
          prev.map((it) =>
            it.id === row.id
              ? { ...it, isActive: !next, status: !next ? "active" : "inactive" }
              : it
          )
        );

        alert(
          e2?.response?.data?.message ||
            e2?.message ||
            e1?.response?.data?.message ||
            e1?.message ||
            "Update status failed"
        );
        return;
      }
    }

    // ✅ Đồng bộ lại từ server (đảm bảo đúng 100%)
    fetchAll();
  };

  const visibleItems = useMemo(() => items || [], [items]);

  return (
    <div className="sup-page">
      <div className="sup-head">
        <div>
          <h2 className="sup-title">Nhà cung cấp</h2>
          <div className="sup-sub">
            Quản lý vendor cung cấp trang thiết bị / vật tư cho hệ thống gym
          </div>
        </div>

        <button className="sup-btn sup-btn--primary" onClick={openCreate}>
          + Thêm nhà cung cấp
        </button>
      </div>

      <div className="sup-filters">
        <input
          className="sup-input"
          placeholder="Tìm theo tên / mã / phone / email..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => (e.key === "Enter" ? onSearch() : null)}
        />

        <select
          className="sup-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Tất cả</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button className="sup-btn" onClick={onSearch} disabled={loading}>
          {loading ? "Đang tải..." : "Tải lại"}
        </button>
      </div>

      {err ? <div className="sup-alert">{err}</div> : null}

      <div className="sup-table">
        <table className="sup-table__tbl">
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
            {visibleItems.length === 0 ? (
              <tr>
                <td className="sup-empty" colSpan={7}>
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              visibleItems.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.code || "-"}</td>
                  <td className="sup-strong">{row.name}</td>
                  <td>{row.phone || "-"}</td>
                  <td>{row.email || "-"}</td>
                  <td>
                    <span
                      className={`sup-badge ${
                        row.isActive ? "active" : "inactive"
                      }`}
                    >
                      {row.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="sup-actions">
                    <button
                      className="sup-btn sup-btn--ghost"
                      onClick={() => openEdit(row)}
                    >
                      Sửa
                    </button>

                    {/* ✅ Nút luôn bấm được để “tái kích hoạt” */}
                    <button
                      className="sup-btn"
                      onClick={() => toggleActive(row)}
                      title={
                        row.isActive
                          ? "Ngưng hoạt động nhà cung cấp"
                          : "Kích hoạt lại nhà cung cấp"
                      }
                    >
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
        <div className="sup-modal__backdrop" onMouseDown={closeModal}>
          <div
            className="sup-modal"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="sup-modal__header">
              <div>
                <div className="sup-modal__title">
                  {mode === "create"
                    ? "Thêm nhà cung cấp"
                    : "Cập nhật nhà cung cấp"}
                </div>
                <div className="sup-modal__subtitle">
                  Thông tin vendor dùng cho nghiệp vụ nhập kho / đối soát chứng từ
                </div>
              </div>

              <button
                className="sup-iconbtn"
                onClick={closeModal}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <div className="sup-modal__body">
              <div className="sup-formgrid">
                <label className="sup-field">
                  <span className="sup-label">
                    Tên <b>*</b>
                  </span>
                  <input
                    className="sup-input"
                    value={form.name}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, name: e.target.value }))
                    }
                    placeholder="VD: Gym Essentials Vietnam"
                  />
                </label>

                <label className="sup-field">
                  <span className="sup-label">Mã</span>
                  <input
                    className="sup-input"
                    value={form.code}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, code: e.target.value }))
                    }
                    placeholder="VD: GEV-004"
                  />
                </label>

                <label className="sup-field">
                  <span className="sup-label">Phone</span>
                  <input
                    className="sup-input"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, phone: e.target.value }))
                    }
                    placeholder="VD: 0901234004"
                  />
                </label>

                <label className="sup-field">
                  <span className="sup-label">Email</span>
                  <input
                    className="sup-input"
                    value={form.email}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, email: e.target.value }))
                    }
                    placeholder="VD: info@vendor.com"
                  />
                </label>

                <label className="sup-field sup-field--full">
                  <span className="sup-label">Địa chỉ</span>
                  <input
                    className="sup-input"
                    value={form.address}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, address: e.target.value }))
                    }
                    placeholder="VD: 321 Cách Mạng Tháng 8, Q3, HCM"
                  />
                </label>

                <label className="sup-field">
                  <span className="sup-label">Mã số thuế</span>
                  <input
                    className="sup-input"
                    value={form.taxCode}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, taxCode: e.target.value }))
                    }
                    placeholder="VD: 0312345678"
                  />
                </label>

                <label className="sup-field sup-field--full">
                  <span className="sup-label">Ghi chú</span>
                  <textarea
                    className="sup-textarea"
                    rows={3}
                    value={form.notes}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, notes: e.target.value }))
                    }
                    placeholder="VD: Supplier for gym accessories..."
                  />
                </label>

                <label className="sup-checkrow">
                  <input
                    type="checkbox"
                    checked={!!form.isActive}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, isActive: e.target.checked }))
                    }
                  />
                  <div>
                    <div className="sup-checkrow__title">Đang hoạt động</div>
                    <div className="sup-checkrow__hint">
                      Tắt để ngưng giao dịch / ẩn khỏi luồng nhập kho
                    </div>
                  </div>
                </label>
              </div>

              {err ? (
                <div className="sup-alert sup-alert--inmodal">{err}</div>
              ) : null}
            </div>

            <div className="sup-modal__footer">
              <button className="sup-btn sup-btn--ghost" onClick={closeModal}>
                Huỷ
              </button>
              <button className="sup-btn sup-btn--primary" onClick={save}>
                Lưu
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
