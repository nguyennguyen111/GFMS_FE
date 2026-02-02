import React, { useEffect, useMemo, useState } from "react";
import "./SharingPoliciesPage.css";
import {
  admGetPolicies,
  admCreatePolicy,
  admUpdatePolicy,
  admTogglePolicy,
} from "../../../services/adminAdminCoreService";

// ===== helpers giống style duyệt chia sẻ PT =====
const safeJsonParse = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const isoDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

const pick = (obj, keys) => {
  if (!obj) return undefined;
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null && String(obj[k]).trim() !== "") return obj[k];
  }
  return undefined;
};

const gymLabel = (gymObj, gymId) => pick(gymObj, ["name", "gymName", "title"]) || (gymId ?? "-");

const policyTypeLabel = (t) => {
  if (!t) return "-";
  if (t === "trainer_share") return "Chia sẻ PT";
  if (t === "cancellation") return "Huỷ đặt lịch";
  if (t === "commission") return "Hoa hồng";
  return t;
};

const appliesToLabel = (v) => {
  if (!v) return "-";
  if (v === "system") return "System (toàn hệ thống)";
  if (v === "gym") return "Theo Gym";
  return v;
};

const summarizeValue = (value) => {
  // value có thể object hoặc string JSON
  let v = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      v = null;
    }
  }
  if (!v || typeof v !== "object") return "-";

  const parts = [];
  if (v.commissionSplit !== undefined) parts.push(`Split: ${v.commissionSplit}`);
  if (v.defaultCommissionSplit !== undefined) parts.push(`DefaultSplit: ${v.defaultCommissionSplit}`);
  if (v.maxHoursPerWeek !== undefined) parts.push(`MaxHours/Week: ${v.maxHoursPerWeek}`);
  if (v.maxBookingsPerDay !== undefined) parts.push(`MaxBooking/Day: ${v.maxBookingsPerDay}`);
  if (v.cancelFee !== undefined) parts.push(`CancelFee: ${v.cancelFee}`);

  // nếu nhiều key quá thì chỉ show 3 cái đầu
  if (parts.length === 0) return "{...}";
  return parts.slice(0, 3).join(" • ") + (parts.length > 3 ? " • ..." : "");
};

export default function SharingPoliciesPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  // filter: đổi gymId input -> dropdown (tự build từ rows)
  const [filters, setFilters] = useState({
    policyType: "",
    gymId: "",
    isActive: "",
  });

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

  const normalizePolicy = (p) => {
    const gym = p?.gym || p?.Gym || p?.appliedGym || p?.AppliedGym || null; // fallback nhiều key
    return { ...p, gym };
  };

  const normalizedRows = useMemo(() => rows.map(normalizePolicy), [rows]);

  const gymOptions = useMemo(() => {
    const map = new Map(); // gymId -> name
    normalizedRows.forEach((p) => {
      if (p?.gymId) map.set(String(p.gymId), gymLabel(p.gym, p.gymId));
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [normalizedRows]);

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

    // validate gymId nếu appliesTo=gym
    if (f.appliesTo === "gym" && (!String(f.gymId || "").trim() || Number.isNaN(Number(f.gymId)))) {
      return alert("appliesTo=gym thì gymId bắt buộc và phải là số.");
    }

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
          <label>Policy type</label>
          <select
            value={filters.policyType}
            onChange={(e) => setFilters((s) => ({ ...s, policyType: e.target.value }))}
          >
            <option value="">Tất cả</option>
            <option value="trainer_share">trainer_share</option>
            <option value="cancellation">cancellation</option>
            <option value="commission">commission</option>
          </select>
        </div>

        {/* gym dropdown: tự build từ rows (nếu API policy trả kèm gymId) */}
        <div className="sp-field">
          <label>Gym</label>
          <select
            value={filters.gymId}
            onChange={(e) => setFilters((s) => ({ ...s, gymId: e.target.value }))}
          >
            <option value="">Tất cả</option>
            {gymOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sp-field">
          <label>Active</label>
          <select
            value={filters.isActive}
            onChange={(e) => setFilters((s) => ({ ...s, isActive: e.target.value }))}
          >
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
                <th style={{ width: 80 }}>ID</th>
                <th style={{ width: 150 }}>Loại</th>
                <th style={{ width: 160 }}>Áp dụng</th>
                <th>Gym</th>
                <th>Name</th>
                <th>Value</th>
                <th style={{ width: 120 }}>Active</th>
                <th style={{ width: 200 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {normalizedRows.map((p) => (
                <tr key={p.id}>
                  <td className="sp-mono">#{p.id}</td>
                  <td>{policyTypeLabel(p.policyType)}</td>
                  <td>{appliesToLabel(p.appliesTo)}</td>
                  <td>{p.appliesTo === "gym" ? gymLabel(p.gym, p.gymId) : "-"}</td>
                  <td className="sp-strong">{p.name || "-"}</td>
                  <td className="sp-value">{summarizeValue(p.value)}</td>
                  <td>{pill(p.isActive)}</td>
                  <td>
                    <div className="sp-row-actions">
                      <button className="sp-btn" onClick={() => openEdit(p)}>
                        Edit
                      </button>
                      <button className="sp-btn sp-btn--warn" onClick={() => toggle(p.id)}>
                        Toggle
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td className="sp-empty" colSpan={8}>
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
              <button className="sp-btn sp-btn--ghost" onClick={close}>
                ✕
              </button>
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
                    <option value="cancellation">cancellation</option>
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

                {/* gym dropdown nếu có options, fallback input */}
                <div className="sp-field">
                  <label>Gym (nếu appliesTo=gym)</label>
                  {gymOptions.length > 0 ? (
                    <select
                      value={modal.form.gymId}
                      onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, gymId: e.target.value } }))}
                      disabled={modal.form.appliesTo !== "gym"}
                    >
                      <option value="">{modal.form.appliesTo === "gym" ? "Chọn gym…" : "—"}</option>
                      {gymOptions.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={modal.form.gymId}
                      onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, gymId: e.target.value } }))}
                      placeholder="VD: 101"
                      disabled={modal.form.appliesTo !== "gym"}
                    />
                  )}
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
