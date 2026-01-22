import React, { useEffect, useMemo, useState } from "react";
import "./TrainerShareOverridesPage.css";
import {
  admGetTrainerShares,
  admGetTrainerShareDetail,
  admOverrideTrainerShare,
} from "../../../services/adminAdminCoreService";

export default function TrainerShareOverridesPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({
    status: "approved",
    fromGymId: "",
    toGymId: "",
    trainerId: "",
  });

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [modal, setModal] = useState({
    open: false,
    payload: { policyId: "", commissionSplit: "", notes: "" },
  });

  // ===== helpers giống approvals =====
  const pick = (obj, keys) => {
    if (!obj) return undefined;
    for (const k of keys) {
      if (obj?.[k] !== undefined && obj?.[k] !== null && String(obj[k]).trim() !== "") return obj[k];
    }
    return undefined;
  };

  const userLabel = (u) =>
    pick(u, ["username", "fullName", "name", "email"]) || (u?.id ? `#${u.id}` : "-");

  const gymLabel = (gymObj, gymId) => pick(gymObj, ["name", "gymName", "title"]) || (gymId ?? "-");

  const trainerLabel = (trainerObj, trainerId) => {
    const u = trainerObj?.User || trainerObj?.user;
    if (u) return userLabel(u);
    return pick(trainerObj, ["displayName", "fullName", "name"]) || (trainerId ?? "-");
  };

  const policyLabel = (policyObj, policyId) =>
    pick(policyObj, ["name", "policyName", "title"]) || (policyId ?? "-");

  const normalizeRow = (r) => {
    const fromGym = r?.fromGym || r?.FromGym;
    const toGym = r?.toGym || r?.ToGym;
    const trainer = r?.trainer || r?.Trainer;
    const requester = r?.requester || r?.Requester;
    const policy = r?.policy || r?.Policy;
    return { ...r, fromGym, toGym, trainer, requester, policy };
  };

  const normalizedRows = useMemo(() => rows.map(normalizeRow), [rows]);
  const normalizedDetail = useMemo(() => (detail ? normalizeRow(detail) : null), [detail]);

  // dropdown options từ list (giống approvals)
  const gymOptions = useMemo(() => {
    const map = new Map();
    normalizedRows.forEach((r) => {
      if (r?.fromGym?.id) map.set(String(r.fromGym.id), r.fromGym.name || `Gym #${r.fromGym.id}`);
      if (r?.toGym?.id) map.set(String(r.toGym.id), r.toGym.name || `Gym #${r.toGym.id}`);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [normalizedRows]);

  const trainerOptions = useMemo(() => {
    const map = new Map();
    normalizedRows.forEach((r) => {
      const tId = r?.trainer?.id ?? r?.trainerId;
      if (!tId) return;
      map.set(String(tId), trainerLabel(r?.trainer, r?.trainerId) || `Trainer #${tId}`);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [normalizedRows]);

  const policyOptions = useMemo(() => {
    const map = new Map();
    const ingest = (p, pid) => {
      const id = String(p?.id ?? pid ?? "");
      if (!id) return;
      map.set(id, { id, name: policyLabel(p, id), value: p?.value });
    };

    normalizedRows.forEach((r) => {
      if (r?.policy || r?.policyId) ingest(r.policy, r.policyId);
    });
    if (normalizedDetail?.policy || normalizedDetail?.policyId) ingest(normalizedDetail.policy, normalizedDetail.policyId);

    return Array.from(map.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [normalizedRows, normalizedDetail]);

  const getDefaultSplitFromPolicy = (policyObj) => {
    if (!policyObj) return "";
    let v = policyObj.value;
    if (typeof v === "string") {
      try {
        v = JSON.parse(v);
      } catch {
        v = null;
      }
    }
    const candidate = v?.defaultCommissionSplit ?? v?.commissionSplit ?? v?.defaultSplit ?? null;
    if (candidate === null || candidate === undefined) return "";
    return String(candidate);
  };

  // ===== data =====
  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await admGetTrainerShares(filters);
      const data = res?.data?.data ?? res?.data ?? [];
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id) => {
    setLoading(true);
    try {
      const res = await admGetTrainerShareDetail(id);
      setDetail(res.data);
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

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
    // eslint-disable-next-line
  }, [selectedId]);

  // ===== modal override =====
  const openOverride = () => {
    if (!normalizedDetail) return;
    setModal({
      open: true,
      payload: {
        policyId: normalizedDetail.policyId ? String(normalizedDetail.policyId) : "",
        commissionSplit:
          normalizedDetail.commissionSplit !== null && normalizedDetail.commissionSplit !== undefined
            ? String(normalizedDetail.commissionSplit)
            : "",
        notes: normalizedDetail.notes ?? "",
      },
    });
  };

  const close = () => setModal({ open: false, payload: { policyId: "", commissionSplit: "", notes: "" } });

  // validate split
  const splitNum = Number(modal.payload.commissionSplit);
  const hasPolicy = String(modal.payload.policyId || "").trim() !== "";
  const splitValid = Number.isFinite(splitNum) && splitNum > 0 && splitNum < 1;
  const canSave = hasPolicy && splitValid;

  const doOverride = async () => {
    if (!selectedId) return;
    if (!canSave) return;

    setLoading(true);
    try {
      await admOverrideTrainerShare(selectedId, {
        policyId: modal.payload.policyId,
        commissionSplit: modal.payload.commissionSplit,
        notes: modal.payload.notes,
      });
      close();
      await fetchDetail(selectedId);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="to-page">
      <div className="to-head">
        <div>
          <div className="to-title">Ngoại lệ chia sẻ PT</div>
          <div className="to-sub">Danh sách approved → override policy/commissionSplit (module 5)</div>
        </div>
        <div className="to-badge">{loading ? "Đang tải..." : "Overrides"}</div>
      </div>

      <div className="to-filters">
        <div className="to-field">
          <label>Status</label>
          <select value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}>
            <option value="approved">approved</option>
            <option value="pending">pending</option>
            <option value="rejected">rejected</option>
          </select>
        </div>

        <div className="to-field">
          <label>Từ Gym</label>
          <select value={filters.fromGymId} onChange={(e) => setFilters((s) => ({ ...s, fromGymId: e.target.value }))}>
            <option value="">Tất cả</option>
            {gymOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="to-field">
          <label>Đến Gym</label>
          <select value={filters.toGymId} onChange={(e) => setFilters((s) => ({ ...s, toGymId: e.target.value }))}>
            <option value="">Tất cả</option>
            {gymOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="to-field">
          <label>PT</label>
          <select value={filters.trainerId} onChange={(e) => setFilters((s) => ({ ...s, trainerId: e.target.value }))}>
            <option value="">Tất cả</option>
            {trainerOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <button className="to-btn to-btn--primary" onClick={fetchList} disabled={loading}>
          Lọc
        </button>
      </div>

      <div className="to-grid">
        {/* LIST */}
        <div className="to-card">
          <div className="to-card__head">
            <div className="to-card__title">Danh sách</div>
            <div className="to-card__meta">
              Tổng: <b>{normalizedRows.length}</b>
            </div>
          </div>

          <div className="to-table-wrap">
            <table className="to-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>PT</th>
                  <th>Từ Gym</th>
                  <th>Đến Gym</th>
                  <th>Policy</th>
                  <th>Split</th>
                </tr>
              </thead>
              <tbody>
                {normalizedRows.map((r) => (
                  <tr
                    key={r.id}
                    className={selectedId === r.id ? "is-active" : ""}
                    onClick={() => setSelectedId(r.id)}
                    title={`Request #${r.id}`}
                  >
                    <td>
                      <span className={`to-pill to-pill--${r.status}`}>{r.status}</span>
                    </td>
                    <td>{trainerLabel(r.trainer, r.trainerId)}</td>
                    <td>{gymLabel(r.fromGym, r.fromGymId)}</td>
                    <td>{gymLabel(r.toGym, r.toGymId)}</td>
                    <td>{policyLabel(r.policy, r.policyId)}</td>
                    <td>{r.commissionSplit ?? "-"}</td>
                  </tr>
                ))}

                {normalizedRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="to-empty">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DETAIL */}
        <div className="to-card">
          <div className="to-card__head">
            <div className="to-card__title">Chi tiết</div>
            {!normalizedDetail ? <div className="to-card__meta">Chọn 1 dòng</div> : null}
          </div>

          {!normalizedDetail ? (
            <div className="to-empty-box">Chưa chọn trainer share nào.</div>
          ) : (
            <>
              <div className="to-detail">
                <div className="to-kv">
                  <div className="to-k">Request</div>
                  <div className="to-v">#{normalizedDetail.id}</div>
                </div>

                <div className="to-kv">
                  <div className="to-k">Status</div>
                  <div className="to-v">
                    <span className={`to-pill to-pill--${normalizedDetail.status}`}>{normalizedDetail.status}</span>
                  </div>
                </div>

                <div className="to-kv">
                  <div className="to-k">PT</div>
                  <div className="to-v">{trainerLabel(normalizedDetail.trainer, normalizedDetail.trainerId)}</div>
                </div>

                <div className="to-kv">
                  <div className="to-k">Từ Gym</div>
                  <div className="to-v">{gymLabel(normalizedDetail.fromGym, normalizedDetail.fromGymId)}</div>
                </div>

                <div className="to-kv">
                  <div className="to-k">Đến Gym</div>
                  <div className="to-v">{gymLabel(normalizedDetail.toGym, normalizedDetail.toGymId)}</div>
                </div>

                <div className="to-kv">
                  <div className="to-k">Policy</div>
                  <div className="to-v">{policyLabel(normalizedDetail.policy, normalizedDetail.policyId)}</div>
                </div>

                <div className="to-kv">
                  <div className="to-k">CommissionSplit</div>
                  <div className="to-v">{normalizedDetail.commissionSplit ?? "-"}</div>
                </div>

                <div className="to-kv to-kv--full">
                  <div className="to-k">Notes</div>
                  <div className="to-v">{normalizedDetail.notes || "-"}</div>
                </div>
              </div>

              <div className="to-actions">
                <button className="to-btn to-btn--primary" onClick={openOverride} disabled={normalizedDetail.status !== "approved"}>
                  Override
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL */}
      {modal.open && (
        <div className="to-modal__backdrop" onMouseDown={close}>
          <div className="to-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="to-modal__head">
              <div className="to-modal__title">Override Trainer Share</div>
              <button className="to-btn to-btn--ghost" onClick={close}>
                ✕
              </button>
            </div>

            <div className="to-modal__body">
              <div className="to-field">
                <label>Policy</label>
                {policyOptions.length > 0 ? (
                  <select
                    value={modal.payload.policyId}
                    onChange={(e) => {
                      const val = e.target.value;
                      const picked = policyOptions.find((p) => String(p.id) === String(val));
                      const defaultSplit = getDefaultSplitFromPolicy(picked);

                      setModal((m) => ({
                        ...m,
                        payload: {
                          ...m.payload,
                          policyId: val,
                          commissionSplit:
                            String(m.payload.commissionSplit || "").trim() !== "" ? m.payload.commissionSplit : defaultSplit,
                        },
                      }));
                    }}
                  >
                    <option value="">Chọn policy…</option>
                    {policyOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (#{p.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={modal.payload.policyId}
                    onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, policyId: e.target.value } }))}
                    placeholder="Nhập policyId (VD: 600)"
                  />
                )}
                <div className="to-hint">Chọn chính sách theo tên để tránh nhập nhầm ID.</div>
              </div>

              <div className="to-field">
                <label>Commission Split (0 → 1)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={modal.payload.commissionSplit}
                  onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, commissionSplit: e.target.value } }))}
                  placeholder="VD: 0.6"
                />
                <div className={`to-hint ${!splitValid && modal.payload.commissionSplit !== "" ? "to-hint--danger" : ""}`}>
                  Ví dụ 0.6 = 60%. Giá trị hợp lệ: lớn hơn 0 và nhỏ hơn 1.
                </div>
              </div>

              <div className="to-field">
                <label>Notes</label>
                <textarea
                  value={modal.payload.notes}
                  onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, notes: e.target.value } }))}
                  placeholder="Ghi chú lý do override..."
                />
              </div>

              <div className="to-modal__actions">
                <button className="to-btn to-btn--primary" onClick={doOverride} disabled={!canSave || loading}>
                  Lưu override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
