import React, { useEffect, useMemo, useState } from "react";
import "./OwnerPoliciesPage.css";
import {
  ownerListTrainerSharePolicies,
  ownerGetEffectiveTrainerSharePolicy,
  ownerCreateTrainerSharePolicy,
  ownerUpdatePolicy,
  ownerTogglePolicy,
  ownerDeletePolicy,
} from "../../../services/ownerPolicyService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import useSelectedGym from "../../../hooks/useSelectedGym";

// ===== helpers =====
const toISO = (d) => (d ? String(d).slice(0, 10) : "");
const parseNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
};

function Badge({ on, label }) {
  return <span className={`op2-badge ${on ? "is-on" : "is-off"}`}>{label}</span>;
}

function Field({ label, hint, children }) {
  return (
    <div className="op2-field">
      <div className="op2-field__label">
        <div className="op2-field__title">{label}</div>
        {hint ? <div className="op2-field__hint">{hint}</div> : null}
      </div>
      <div className="op2-field__control">{children}</div>
    </div>
  );
}

const formatPolicyActiveLabel = (isActive) => (isActive ? "Đang áp dụng" : "Ngừng áp dụng");

const DEFAULT_VALUE = {
  commissionSplit: 0.7,
  maxHoursPerWeek: 20,
  cancelBeforeHours: 24,
  cancellationFeeRate: 0.2,
  allowCancel: true,
  note: "",
};

// ✅ normalize value từ BE (object | string JSON | snake_case)
const normalizeValue = (v) => {
  if (!v) return {};

  // nếu BE trả value là string JSON
  let obj = v;
  if (typeof v === "string") {
    try {
      obj = JSON.parse(v);
    } catch {
      obj = {};
    }
  }

  if (typeof obj !== "object" || Array.isArray(obj) || obj == null) return {};

  return {
    commissionSplit: obj.commissionSplit ?? obj.commission_split,
    maxHoursPerWeek: obj.maxHoursPerWeek ?? obj.max_hours_per_week,
    cancelBeforeHours: obj.cancelBeforeHours ?? obj.cancel_before_hours,
    cancellationFeeRate: obj.cancellationFeeRate ?? obj.cancellation_fee_rate,
    allowCancel: obj.allowCancel ?? obj.allow_cancel,
    note: obj.note ?? "",
  };
};

export default function OwnerPoliciesPage() {
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const [gymId, setGymId] = useState(selectedGymId ? String(selectedGymId) : "");

  // gyms dropdown
  const [gyms, setGyms] = useState([]);
  const [loadingGyms, setLoadingGyms] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingEffective, setLoadingEffective] = useState(false);
  const [err, setErr] = useState("");

  const [policies, setPolicies] = useState([]);
  const [effective, setEffective] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    gymId: selectedGymId ? String(selectedGymId) : "",
    name: "Trainer Share Policy",
    description: "Hoa hồng/max giờ/huỷ",
    isActive: true,
    effectiveFrom: "",
    effectiveTo: "",
    value: { ...DEFAULT_VALUE },
  });

  const canQueryGym = useMemo(() => String(gymId || "").trim().length > 0, [gymId]);

  useEffect(() => {
    const scopedGymId = selectedGymId ? String(selectedGymId) : "";
    setGymId(scopedGymId);
    setForm((prev) => ({ ...prev, gymId: scopedGymId || prev.gymId }));
  }, [selectedGymId]);

  // ===== load gyms =====
  useEffect(() => {
    (async () => {
      setLoadingGyms(true);
      try {
        const res = await ownerGetMyGyms();
        // BE có thể trả {DT} hoặc {data}
        const list = res?.data?.data || res?.data?.DT || [];
        setGyms(Array.isArray(list) ? list : []);

        if (!selectedGymId && !gymId && Array.isArray(list) && list.length > 0) {
          setGymId(String(list[0].id));
        }
      } catch (e) {
        console.log("load gyms error", e?.response?.data || e?.message);
      } finally {
        setLoadingGyms(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId, selectedGymId]);

  const loadList = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await ownerListTrainerSharePolicies({
        gymId: canQueryGym ? gymId : undefined,
        includeInactive: true,
      });

      // BE có thể trả {data} hoặc {DT}
      const list = res?.data?.data || res?.data?.DT || [];
      setPolicies(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.response?.data?.EM || "Không tải được danh sách policy.");
    } finally {
      setLoading(false);
    }
  };

  const loadEffective = async () => {
    if (!canQueryGym) {
      setEffective(null);
      return;
    }
    setLoadingEffective(true);
    try {
      const res = await ownerGetEffectiveTrainerSharePolicy(gymId);
      const ef = res?.data?.data || res?.data?.DT || null;
      setEffective(ef || null);
    } catch {
      setEffective(null);
    } finally {
      setLoadingEffective(false);
    }
  };

  // load lần đầu
  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // gymId đổi => reload
  useEffect(() => {
    loadList();
    loadEffective();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId]);

  const systemPolicies = useMemo(() => policies.filter((p) => p.gymId == null), [policies]);
  const gymPolicies = useMemo(() => policies.filter((p) => p.gymId != null), [policies]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      gymId: selectedGymId ? String(selectedGymId) : gymId || "",
      name: "Trainer Share Policy",
      description: "Hoa hồng/max giờ/huỷ",
      isActive: true,
      effectiveFrom: "",
      effectiveTo: "",
      value: { ...DEFAULT_VALUE },
    });
    setShowCreate(true);
  };

  const openEdit = (p) => {
    const x = normalizeValue(p.value);
    setEditing(p);
    setForm({
      gymId: selectedGymId ? String(selectedGymId) : p.gymId ?? "",
      name: p.name || "Trainer Share Policy",
      description: p.description || "",
      isActive: !!p.isActive,
      effectiveFrom: toISO(p.effectiveFrom),
      effectiveTo: toISO(p.effectiveTo),
      value: { ...DEFAULT_VALUE, ...x },
    });
    setShowCreate(true);
  };

  const closeModal = () => {
    setShowCreate(false);
    setEditing(null);
  };

  const onChangeValue = (key, val) => {
    setForm((f) => ({ ...f, value: { ...f.value, [key]: val } }));
  };

  const submit = async () => {
    setErr("");

    const payload = {
      gymId: parseNum(form.gymId),
      name: form.name,
      description: form.description,
      isActive: !!form.isActive,
      effectiveFrom: form.effectiveFrom ? new Date(`${form.effectiveFrom}T00:00:00`) : null,
      effectiveTo: form.effectiveTo ? new Date(`${form.effectiveTo}T23:59:59`) : null,
      value: {
        commissionSplit: parseNum(form.value.commissionSplit),
        maxHoursPerWeek: parseNum(form.value.maxHoursPerWeek),
        cancelBeforeHours: parseNum(form.value.cancelBeforeHours),
        cancellationFeeRate: parseNum(form.value.cancellationFeeRate),
        allowCancel: !!form.value.allowCancel,
        note: form.value.note || "",
      },
    };

    if (!payload.gymId) {
      setErr("Vui lòng chọn phòng tập.");
      return;
    }

    try {
      if (editing?.id) {
        await ownerUpdatePolicy(editing.id, payload);
      } else {
        await ownerCreateTrainerSharePolicy(payload);
      }
      closeModal();
      await Promise.all([loadList(), loadEffective()]);
      alert("✅ Lưu policy thành công");
    } catch (e) {
      setErr(e?.response?.data?.message || e?.response?.data?.EM || "Lưu policy thất bại.");
    }
  };

  const toggleActive = async (p) => {
    if (p.gymId == null) {
      alert("System policy không toggle ở Owner.");
      return;
    }
    try {
      await ownerTogglePolicy(p.id);
      await Promise.all([loadList(), loadEffective()]);
    } catch (e) {
      alert(e?.response?.data?.message || e?.response?.data?.EM || "Toggle thất bại");
    }
  };

  const removePolicy = async (p) => {
    if (p.gymId == null) {
      alert("System policy không xoá ở Owner.");
      return;
    }
    if (!window.confirm(`Xoá policy #${p.id}?`)) return;

    try {
      await ownerDeletePolicy(p.id);
      await Promise.all([loadList(), loadEffective()]);
    } catch (e) {
      alert(e?.response?.data?.message || e?.response?.data?.EM || "Xoá thất bại");
    }
  };

  const renderValue = (v) => {
    const x = normalizeValue(v);
    return (
      <div className="op2-kv">
        <div><span>commissionSplit</span><b>{x.commissionSplit ?? "—"}</b></div>
        <div><span>maxHoursPerWeek</span><b>{x.maxHoursPerWeek ?? "—"}</b></div>
        <div><span>cancelBeforeHours</span><b>{x.cancelBeforeHours ?? "—"}</b></div>
        <div><span>cancellationFeeRate</span><b>{x.cancellationFeeRate ?? "—"}</b></div>
        <div><span>allowCancel</span><b>{String(x.allowCancel ?? "—")}</b></div>
      </div>
    );
  };

  return (
    <div className="op2-wrap">
      <div className="op2-head">
        <div>
          <h2 className="op2-title">📜 Chính sách • Chia sẻ Huấn luyện viên</h2>
          <div className="op2-sub">
            Quản lý policy loại <b>trainer_share</b> theo phòng tập (override) và xem policy hiệu lực (fallback system){selectedGymName ? ` cho ${selectedGymName}` : ""}.
          </div>
        </div>

        <div className="op2-toolbar">
          <div className="op2-gymPick">
            <span>Phòng tập</span>

            {gyms.length > 0 ? (
              <select value={gymId} onChange={(e) => setGymId(e.target.value)} disabled={loadingGyms || Boolean(selectedGymId)}>
                {gyms.map((g) => (
                  <option key={g.id} value={g.id}>
                    #{g.id} • {g.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={gymId}
                onChange={(e) => setGymId(e.target.value)}
                placeholder={loadingGyms ? "đang tải..." : "vd: 1"}
                disabled={Boolean(selectedGymId)}
              />
            )}
          </div>

          <button className="op2-btn" onClick={() => { loadList(); loadEffective(); }} disabled={loading}>
            ↻ Tải lại
          </button>

          <button className="op2-btn op2-btn--primary" onClick={openCreate}>
            + Tạo policy phòng tập
          </button>
        </div>
      </div>

      {err && <div className="op2-error">{err}</div>}

      {/* Effective */}
      <div className="op2-card">
        <div className="op2-card__head">
          <div>
            <div className="op2-card__title">Policy hiệu lực (Effective)</div>
            <div className="op2-card__desc">
              {canQueryGym ? (
                <>Ưu tiên policy theo gymId = <b>{gymId}</b>, nếu không có sẽ dùng system policy.</>
              ) : (
                <>Chọn phòng tập để xem effective.</>
              )}
            </div>
          </div>
          <div className="op2-right">
            {loadingEffective ? <span className="op2-muted">đang tải…</span> : null}
          </div>
        </div>

        {!canQueryGym ? (
          <div className="op2-empty">Chọn phòng tập ở góc phải để xem policy hiệu lực.</div>
        ) : !effective ? (
          <div className="op2-empty">Không tìm thấy policy hiệu lực (phòng tập và hệ thống đều không có hoặc không áp dụng).</div>
        ) : (
          <div className="op2-effective">
            <div className="op2-effective__top">
              <div className="op2-effective__name">
                <b>{effective.name}</b>{" "}
                <span className="op2-muted">
                  #{effective.id} • {effective.gymId == null ? "SYSTEM" : `GYM ${effective.gymId}`}
                </span>
              </div>
              <Badge on={!!effective.isActive} label={formatPolicyActiveLabel(effective.isActive)} />
            </div>
            {renderValue(effective.value)}
          </div>
        )}
      </div>

      {/* Lists */}
      <div className="op2-grid2">
        <div className="op2-card">
          <div className="op2-card__head">
            <div>
              <div className="op2-card__title">System policies</div>
              <div className="op2-card__desc">Chỉ xem (Owner không sửa/xoá/toggle).</div>
            </div>
          </div>

          {loading ? (
            <div className="op2-empty">Đang tải…</div>
          ) : systemPolicies.length === 0 ? (
            <div className="op2-empty">Chưa có system policy.</div>
          ) : (
            <div className="op2-list">
              {systemPolicies.map((p) => (
                <div key={p.id} className="op2-item">
                  <div className="op2-item__top">
                    <div>
                      <div className="op2-item__name">
                        {p.name} <span className="op2-muted">#{p.id}</span>
                      </div>
                      <div className="op2-muted">{p.description || "—"}</div>
                    </div>
                    <Badge on={!!p.isActive} label={formatPolicyActiveLabel(p.isActive)} />
                  </div>
                  {renderValue(p.value)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="op2-card">
          <div className="op2-card__head">
            <div>
              <div className="op2-card__title">Chính sách phòng tập</div>
              <div className="op2-card__desc">Owner có thể tạo/sửa/toggle/xoá (chỉ phòng tập thuộc owner).</div>
            </div>
          </div>

          {loading ? (
            <div className="op2-empty">Đang tải…</div>
          ) : gymPolicies.length === 0 ? (
            <div className="op2-empty">Chưa có policy cho phòng tập.</div>
          ) : (
            <div className="op2-list">
              {gymPolicies.map((p) => (
                <div key={p.id} className="op2-item">
                  <div className="op2-item__top">
                    <div>
                      <div className="op2-item__name">
                        {p.name} <span className="op2-muted">#{p.id} • phòng tập {p.gymId}</span>
                      </div>
                      <div className="op2-muted">{p.description || "—"}</div>
                    </div>
                    <Badge on={!!p.isActive} label={formatPolicyActiveLabel(p.isActive)} />
                  </div>

                  {renderValue(p.value)}

                  <div className="op2-actions">
                    <button className="op2-btn op2-btn--small" onClick={() => openEdit(p)}>
                      Sửa
                    </button>
                    <button className="op2-btn op2-btn--small" onClick={() => toggleActive(p)}>
                      Toggle
                    </button>
                    <button className="op2-btn op2-btn--small op2-btn--danger" onClick={() => removePolicy(p)}>
                      Xoá
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal create/edit */}
      {showCreate && (
        <div className="op2-modalOverlay" onMouseDown={closeModal}>
          <div className="op2-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="op2-modal__head">
              <div>
                <div className="op2-modal__title">
                  {editing ? `Sửa policy #${editing.id}` : "Tạo policy phòng tập (trainer_share)"}
                </div>
                <div className="op2-muted">Nếu bật áp dụng, hệ thống sẽ tự tắt policy đang áp dụng khác cùng phòng tập (theo BE).</div>
              </div>
              <button className="op2-btn op2-btn--small" onClick={closeModal}>✕</button>
            </div>

            <div className="op2-modal__body">
              <Field label="Phòng tập">
                {gyms.length > 0 ? (
                  <select
                    value={form.gymId}
                    onChange={(e) => setForm((f) => ({ ...f, gymId: e.target.value }))}
                    disabled={Boolean(selectedGymId)}
                  >
                    <option value="">{selectedGymId ? (selectedGymName || "Chi nhánh đang quản lý") : "-- chọn phòng tập --"}</option>
                    {gyms.map((g) => (
                      <option key={g.id} value={g.id}>
                        #{g.id} • {g.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={form.gymId}
                    onChange={(e) => setForm((f) => ({ ...f, gymId: e.target.value }))}
                    placeholder="vd: 1"
                    disabled={Boolean(selectedGymId)}
                  />
                )}
              </Field>

              <Field label="Tên policy">
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </Field>

              <Field label="Mô tả">
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </Field>

              <div className="op2-row2">
                <Field label="Effective From">
                  <input
                    type="date"
                    value={form.effectiveFrom}
                    onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
                  />
                </Field>
                <Field label="Effective To">
                  <input
                    type="date"
                    value={form.effectiveTo}
                    onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))}
                  />
                </Field>
              </div>

              <div className="op2-box">
                <div className="op2-box__title">Rule (value JSON)</div>

                <div className="op2-row2">
                  <Field label="Hoa hồng (commissionSplit)" hint="0..1">
                    <input
                      type="number"
                      step="0.01"
                      value={form.value.commissionSplit}
                      onChange={(e) => onChangeValue("commissionSplit", e.target.value)}
                    />
                  </Field>

                  <Field label="Max giờ/tuần (maxHoursPerWeek)" hint=">= 0">
                    <input
                      type="number"
                      step="1"
                      value={form.value.maxHoursPerWeek}
                      onChange={(e) => onChangeValue("maxHoursPerWeek", e.target.value)}
                    />
                  </Field>
                </div>

                <div className="op2-row2">
                  <Field label="Huỷ trước (cancelBeforeHours)" hint="giờ">
                    <input
                      type="number"
                      step="1"
                      value={form.value.cancelBeforeHours}
                      onChange={(e) => onChangeValue("cancelBeforeHours", e.target.value)}
                    />
                  </Field>

                  <Field label="Phí huỷ (cancellationFeeRate)" hint="0..1">
                    <input
                      type="number"
                      step="0.01"
                      value={form.value.cancellationFeeRate}
                      onChange={(e) => onChangeValue("cancellationFeeRate", e.target.value)}
                    />
                  </Field>
                </div>

                <Field label="Cho phép huỷ (allowCancel)">
                  <label className="op2-switch">
                    <input
                      type="checkbox"
                      checked={!!form.value.allowCancel}
                      onChange={(e) => onChangeValue("allowCancel", e.target.checked)}
                    />
                    <span>Cho phép</span>
                  </label>
                </Field>

                <Field label="Ghi chú (note)">
                  <input
                    value={form.value.note}
                    onChange={(e) => onChangeValue("note", e.target.value)}
                    placeholder="tuỳ chọn"
                  />
                </Field>
              </div>

              <Field label="Trạng thái áp dụng">
                <label className="op2-switch">
                  <input
                    type="checkbox"
                    checked={!!form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  <span>{formatPolicyActiveLabel(form.isActive)}</span>
                </label>
              </Field>
            </div>

            <div className="op2-modal__foot">
              <button className="op2-btn" onClick={closeModal}>Huỷ</button>
              <button className="op2-btn op2-btn--primary" onClick={submit}>
                {editing ? "Lưu thay đổi" : "Tạo policy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
