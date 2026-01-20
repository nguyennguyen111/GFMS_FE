import React, { useEffect, useMemo, useState } from "react";
import "./SharingPoliciesPage.css";
import {
  admGetPolicies,
  admCreatePolicy,
  admUpdatePolicy,
  admTogglePolicy,
} from "../../../services/adminAdminCoreService";

const safeJsonParse = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const isoDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default function SharingPoliciesPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const [filters, setFilters] = useState({ policyType: "", gymId: "", isActive: "" });
  const [modal, setModal] = useState({ open: false, editId: null, form: null });

  const emptyForm = useMemo(
    () => ({
      policyType: "trainer_share",
      appliesTo: "system",
      gymId: "",
      name: "",
      description: "",
      valueText: "{\n  \"commissionSplit\": 0.6,\n  \"maxHoursPerWeek\": 20\n}",
      isActive: true,
      effectiveFrom: "",
      effectiveTo: "",
    }),
    []
  );

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await admGetPolicies(filters);
      const data = res?.data?.data ?? res?.data ?? [];
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line
  }, []);

  const openCreate = () => {
    setModal({ open: true, editId: null, form: { ...emptyForm } });
  };

  const openEdit = (p) => {
    setModal({
      open: true,
      editId: p.id,
      form: {
        policyType: p.policyType || "trainer_share",
        appliesTo: p.appliesTo || "system",
        gymId: p.gymId ? String(p.gymId) : "",
        name: p.name || "",
        description: p.description || "",
        valueText: JSON.stringify(p.value ?? {}, null, 2),
        isActive: !!p.isActive,
        effectiveFrom: p.effectiveFrom ? isoDate(p.effectiveFrom) : "",
        effectiveTo: p.effectiveTo ? isoDate(p.effectiveTo) : "",
      },
    });
  };

  const close = () => setModal({ open: false, editId: null, form: null });

  const submit = async () => {
    const f = modal.form;
    const val = safeJsonParse(f.valueText);
    if (!val) return alert("JSON trong Value không hợp lệ.");

    const payload = {
      policyType: f.policyType,
      appliesTo: f.appliesTo,
      gymId: f.appliesTo === "gym" ? Number(f.gymId) : null,
      name: f.name,
      description: f.description,
      value: val,
      isActive: !!f.isActive,
      effectiveFrom: f.effectiveFrom || null,
      effectiveTo: f.effectiveTo || null,
    };

    setLoading(true);
    try {
      if (modal.editId) await admUpdatePolicy(modal.editId, payload);
      else await admCreatePolicy(payload);

      close();
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (id) => {
    if (!window.confirm("Toggle trạng thái policy này?")) return;
    setLoading(true);
    try {
      await admTogglePolicy(id);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const pill = (active) => (
    <span className={`sp-pill ${active ? "sp-pill--on" : "sp-pill--off"}`}>
      {active ? "ACTIVE" : "INACTIVE"}
    </span>
  );

  return (
    <div className="sp-page">
      <div className="sp-head">
        <div>
          <div className="sp-title">Chính sách chia sẻ PT</div>
          <div className="sp-sub">CRUD + toggle (module 4)</div>
        </div>
        <div className="sp-actions">
          <button className="sp-btn sp-btn--primary" onClick={openCreate}>
            + Tạo policy
          </button>
        </div>
      </div>

      <div className="sp-filters">
        <div className="sp-field">
          <label>policyType</label>
          <select value={filters.policyType} onChange={(e) => setFilters((s) => ({ ...s, policyType: e.target.value }))}>
            <option value="">Tất cả</option>
            <option value="trainer_share">trainer_share</option>
            <option value="commission">commission</option>
          </select>
        </div>

        <div className="sp-field">
          <label>gymId</label>
          <input value={filters.gymId} onChange={(e) => setFilters((s) => ({ ...s, gymId: e.target.value }))} placeholder="VD: 1" />
        </div>

        <div className="sp-field">
          <label>isActive</label>
          <select value={filters.isActive} onChange={(e) => setFilters((s) => ({ ...s, isActive: e.target.value }))}>
            <option value="">Tất cả</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>

        <button className="sp-btn" onClick={fetchList} disabled={loading}>
          Lọc
        </button>

        <div className="sp-right">{loading ? "Đang tải..." : `Tổng: ${rows.length}`}</div>
      </div>

      <div className="sp-card">
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>policyType</th>
                <th>appliesTo</th>
                <th>gymId</th>
                <th>name</th>
                <th>active</th>
                <th style={{ width: 200 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td>{p.policyType}</td>
                  <td>{p.appliesTo}</td>
                  <td>{p.gymId ?? "-"}</td>
                  <td className="sp-strong">{p.name || "-"}</td>
                  <td>{pill(p.isActive)}</td>
                  <td>
                    <div className="sp-row-actions">
                      <button className="sp-btn" onClick={() => openEdit(p)}>Edit</button>
                      <button className="sp-btn sp-btn--warn" onClick={() => toggle(p.id)}>
                        Toggle
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="sp-empty" colSpan={7}>
                    Không có policy nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal.open && (
        <div className="sp-modal__backdrop" onMouseDown={close}>
          <div className="sp-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="sp-modal__head">
              <div className="sp-modal__title">{modal.editId ? "Cập nhật policy" : "Tạo policy"}</div>
              <button className="sp-btn sp-btn--ghost" onClick={close}>✕</button>
            </div>

            <div className="sp-modal__body">
              <div className="sp-grid">
                <div className="sp-field">
                  <label>policyType</label>
                  <select
                    value={modal.form.policyType}
                    onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, policyType: e.target.value } }))}
                  >
                    <option value="trainer_share">trainer_share</option>
                    <option value="commission">commission</option>
                  </select>
                </div>

                <div className="sp-field">
                  <label>appliesTo</label>
                  <select
                    value={modal.form.appliesTo}
                    onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, appliesTo: e.target.value } }))}
                  >
                    <option value="system">system</option>
                    <option value="gym">gym</option>
                  </select>
                </div>

                <div className="sp-field">
                  <label>gymId (nếu appliesTo=gym)</label>
                  <input
                    value={modal.form.gymId}
                    onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, gymId: e.target.value } }))}
                    placeholder="VD: 1"
                  />
                </div>

                <div className="sp-field">
                  <label>name</label>
                  <input
                    value={modal.form.name}
                    onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, name: e.target.value } }))}
                    placeholder="VD: Default trainer share"
                  />
                </div>

                <div className="sp-field sp-field--full">
                  <label>description</label>
                  <input
                    value={modal.form.description}
                    onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, description: e.target.value } }))}
                    placeholder="Mô tả policy"
                  />
                </div>

                <div className="sp-field sp-field--full">
                  <label>value (JSON)</label>
                  <textarea
                    value={modal.form.valueText}
                    onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, valueText: e.target.value } }))}
                  />
                </div>

                <div className="sp-field">
                  <label>effectiveFrom</label>
                  <input
                    type="date"
                    value={modal.form.effectiveFrom}
                    onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, effectiveFrom: e.target.value } }))}
                  />
                </div>

                <div className="sp-field">
                  <label>effectiveTo</label>
                  <input
                    type="date"
                    value={modal.form.effectiveTo}
                    onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, effectiveTo: e.target.value } }))}
                  />
                </div>

                <div className="sp-field">
                  <label>isActive</label>
                  <select
                    value={modal.form.isActive ? "true" : "false"}
                    onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, isActive: e.target.value === "true" } }))}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </div>
              </div>

              <div className="sp-modal__actions">
                <button className="sp-btn sp-btn--primary" onClick={submit} disabled={loading}>
                  {modal.editId ? "Cập nhật" : "Tạo mới"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
