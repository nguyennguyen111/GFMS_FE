import React, { useEffect, useMemo, useState } from "react";
import "./TrainerShareApprovalsPage.css";
import {
  admGetTrainerShares,
  admGetTrainerShareDetail,
  admApproveTrainerShare,
  admRejectTrainerShare,
  // ✅ NEW: lấy policies theo gym/system (đổi tên nếu service bạn đang khác)
  admGetPolicies,
} from "../../../services/adminAdminCoreService";

/* =======================
   Helpers (OUTSIDE COMPONENT)
   -> ESLint will NOT require adding deps for useMemo/useEffect
======================= */
const pick = (obj, keys) => {
  if (!obj) return undefined;
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null && String(obj[k]).trim() !== "") return obj[k];
  }
  return undefined;
};

const userLabel = (u) =>
  pick(u, ["username", "fullName", "name", "email"]) || (u?.id ? `#${u.id}` : "-");

const gymLabel = (gymObj, gymId) =>
  pick(gymObj, ["name", "gymName", "title"]) || (gymId ?? "-");

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
  const approver = r?.approver || r?.Approver;

  const policy = r?.policy || r?.Policy;

  return { ...r, fromGym, toGym, trainer, requester, approver, policy };
};

// ====== helper lấy default split từ policy.value ======
const getDefaultSplitFromPolicy = (policyObj) => {
  if (!policyObj) return "";
  const v = policyObj.value;

  let parsed = v;
  if (typeof v === "string") {
    try {
      parsed = JSON.parse(v);
    } catch {
      parsed = null;
    }
  }

  const candidate =
    parsed?.defaultCommissionSplit ??
    parsed?.commissionSplit ??
    parsed?.defaultSplit ??
    null;

  if (candidate === null || candidate === undefined) return "";
  return String(candidate);
};

// ✅ lọc hiệu lực policy theo ngày (nếu BE có trả)
const isEffectiveNow = (p) => {
  const now = new Date();

  const fromRaw =
    p?.effectiveFrom ??
    p?.effective_from ??
    p?.effective_from_date ??
    p?.startDate ??
    p?.start_date ??
    null;

  const toRaw =
    p?.effectiveTo ??
    p?.effective_to ??
    p?.effective_to_date ??
    p?.endDate ??
    p?.end_date ??
    null;

  const fromOk = !fromRaw || new Date(fromRaw) <= now;
  const toOk = !toRaw || new Date(toRaw) >= now;
  return fromOk && toOk;
};

// ====== normalize policies response ======
const normalizePolicies = (raw) => {
  const list = raw?.data?.data ?? raw?.data ?? raw ?? [];
  if (!Array.isArray(list)) return [];
  return list
    .filter(Boolean)
    .map((p) => ({
      id: String(p.id),
      name: pick(p, ["name", "policyName", "title"]) || `Policy #${p.id}`,
      value: p.value,
      isActive: p.isActive,
      policyType: p.policyType,
      appliesTo: p.appliesTo,
      gymId: p.gymId,
      effectiveFrom:
        p.effectiveFrom ??
        p.effective_from ??
        p.startDate ??
        p.start_date ??
        null,
      effectiveTo:
        p.effectiveTo ??
        p.effective_to ??
        p.endDate ??
        p.end_date ??
        null,
    }));
};

const uniqById = (arr) => {
  const map = new Map();
  (arr || []).forEach((x) => {
    if (!x?.id) return;
    map.set(String(x.id), x);
  });
  return Array.from(map.values());
};

export default function TrainerShareApprovalsPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({
    status: "pending",
    fromGymId: "",
    toGymId: "",
    trainerId: "",
  });

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [modal, setModal] = useState({ open: false, type: "", payload: {} });

  // ✅ policies load theo FROM_GYM + SYSTEM cho modal approve
  const [availablePolicies, setAvailablePolicies] = useState([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);

  const normalizedRows = useMemo(() => rows.map(normalizeRow), [rows]);
  const normalizedDetail = useMemo(() => (detail ? normalizeRow(detail) : null), [detail]);

  // ====== dropdown options (tự build từ list data) ======
  const gymOptions = useMemo(() => {
    const map = new Map();
    normalizedRows.forEach((r) => {
      const fg = r?.fromGym;
      const tg = r?.toGym;
      if (fg?.id) map.set(String(fg.id), fg.name || `Gym #${fg.id}`);
      if (tg?.id) map.set(String(tg.id), tg.name || `Gym #${tg.id}`);
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
      const label = trainerLabel(r?.trainer, r?.trainerId);
      map.set(String(tId), label || `Trainer #${tId}`);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [normalizedRows]);

  // ====== FALLBACK: policy options (tự build từ list + detail như cũ) ======
  const fallbackPolicyOptions = useMemo(() => {
    const map = new Map();
    const ingest = (p, pid) => {
      const id = String(p?.id ?? pid ?? "");
      if (!id) return;
      const name = pick(p, ["name", "policyName", "title"]) || `Policy #${id}`;
      const value = p?.value;
      map.set(id, { id, name, value });
    };

    normalizedRows.forEach((r) => {
      if (r?.policy || r?.policyId) ingest(r.policy, r.policyId);
    });
    if (normalizedDetail?.policy || normalizedDetail?.policyId) {
      ingest(normalizedDetail.policy, normalizedDetail.policyId);
    }

    return Array.from(map.values()).sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    );
  }, [normalizedRows, normalizedDetail]);

  // ✅ load policies theo nghiệp vụ chuẩn (FROM gym + system fallback)
  const fetchPoliciesForApprove = async () => {
    const fromGymId =
      normalizedDetail?.fromGym?.id ??
      normalizedDetail?.fromGymId ??
      normalizedDetail?.from_gym_id;

    if (!fromGymId) {
      setAvailablePolicies([]);
      return;
    }

    setPoliciesLoading(true);
    try {
      const calls = [
        admGetPolicies?.({
          policyType: "trainer_share",
          appliesTo: "gym",
          gymId: String(fromGymId),
          isActive: true,
        }),
        admGetPolicies?.({
          policyType: "trainer_share",
          appliesTo: "system",
          isActive: true,
        }),
        admGetPolicies?.({
          policyType: "trainer_share",
          gymId: "null",
          isActive: true,
        }),
      ].filter(Boolean);

      if (calls.length === 0) throw new Error("admGetPolicies is not available");

      const settled = await Promise.allSettled(calls);

      const all = [];
      settled.forEach((s) => {
        if (s.status === "fulfilled") all.push(...normalizePolicies(s.value));
      });

      const merged = uniqById(all)
        .filter((p) => p.isActive !== false)
        .filter(isEffectiveNow);

      merged.sort((a, b) => {
        const pa = String(a.appliesTo || "").toLowerCase() === "gym" ? 0 : 1;
        const pb = String(b.appliesTo || "").toLowerCase() === "gym" ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return String(a.name).localeCompare(String(b.name));
      });

      setAvailablePolicies(merged);
    } catch (e) {
      console.error(e);
      setAvailablePolicies([]);
    } finally {
      setPoliciesLoading(false);
    }
  };

  // ====== data ======
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

  // ====== modal ======
  const openApprove = async () => {
    const prePolicyId = normalizedDetail?.policyId ? String(normalizedDetail.policyId) : "";
    const preSplit =
      normalizedDetail?.commissionSplit !== null &&
      normalizedDetail?.commissionSplit !== undefined &&
      String(normalizedDetail.commissionSplit).trim() !== ""
        ? String(normalizedDetail.commissionSplit)
        : "";

    await fetchPoliciesForApprove();

    setModal({
      open: true,
      type: "approve",
      payload: { policyId: prePolicyId, commissionSplit: preSplit },
    });
  };

  const openReject = () =>
    setModal({
      open: true,
      type: "reject",
      payload: { reason: "" },
    });

  const close = () => setModal({ open: false, type: "", payload: {} });

  // ====== validation for approve ======
  const splitNum = Number(modal?.payload?.commissionSplit);
  const hasPolicy = String(modal?.payload?.policyId || "").trim() !== "";
  const splitValid = Number.isFinite(splitNum) && splitNum > 0 && splitNum < 1;
  const canApprove = modal.open && modal.type === "approve" && hasPolicy && splitValid;

  const doApprove = async () => {
    if (!canApprove) return;
    setLoading(true);
    try {
      const policyIdNum = Number(modal.payload.policyId);
      const commissionSplitNum = Number(modal.payload.commissionSplit);

      await admApproveTrainerShare(selectedId, {
        policyId: policyIdNum,
        commissionSplit: commissionSplitNum,
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

  const doReject = async () => {
    setLoading(true);
    try {
      await admRejectTrainerShare(selectedId, modal.payload);
      close();
      setSelectedId(null);
      setDetail(null);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ chọn nguồn options cho dropdown policy
  const policyOptions = availablePolicies.length > 0 ? availablePolicies : fallbackPolicyOptions;

  return (
    <div className="ta-page">
      <div className="ta-head">
        <div>
          <div className="ta-title">Duyệt chia sẻ PT</div>
          <div className="ta-sub">Danh sách pending → Approve/Reject (module 5)</div>
        </div>
        <div className="ta-badge">{loading ? "Đang tải..." : "Approvals"}</div>
      </div>

      <div className="ta-filters">
        <div className="ta-field">
          <label>status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
          >
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
        </div>

        <div className="ta-field">
          <label>Từ Gym</label>
          <select
            value={filters.fromGymId}
            onChange={(e) => setFilters((s) => ({ ...s, fromGymId: e.target.value }))}
          >
            <option value="">Tất cả</option>
            {gymOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="ta-field">
          <label>Đến Gym</label>
          <select
            value={filters.toGymId}
            onChange={(e) => setFilters((s) => ({ ...s, toGymId: e.target.value }))}
          >
            <option value="">Tất cả</option>
            {gymOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="ta-field">
          <label>PT</label>
          <select
            value={filters.trainerId}
            onChange={(e) => setFilters((s) => ({ ...s, trainerId: e.target.value }))}
          >
            <option value="">Tất cả</option>
            {trainerOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <button className="ta-btn ta-btn--primary" onClick={fetchList} disabled={loading}>
          Lọc
        </button>
      </div>

      <div className="ta-grid">
        {/* ===== LIST ===== */}
        <div className="ta-card">
          <div className="ta-card__head">
            <div className="ta-card__title">Danh sách</div>
            <div className="ta-card__meta">
              Tổng: <b>{normalizedRows.length}</b>
            </div>
          </div>

          <div className="ta-table-wrap">
            <table className="ta-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>PT</th>
                  <th>Từ Gym</th>
                  <th>Đến Gym</th>
                  <th>Người gửi</th>
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
                      <span className={`ta-pill ta-pill--${r.status}`}>{r.status}</span>
                    </td>
                    <td>{trainerLabel(r.trainer, r.trainerId)}</td>
                    <td>{gymLabel(r.fromGym, r.fromGymId)}</td>
                    <td>{gymLabel(r.toGym, r.toGymId)}</td>
                    <td>{r.requester ? userLabel(r.requester) : "-"}</td>
                  </tr>
                ))}

                {normalizedRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="ta-empty">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== DETAIL ===== */}
        <div className="ta-card">
          <div className="ta-card__head">
            <div className="ta-card__title">Chi tiết</div>
            {!normalizedDetail ? <div className="ta-card__meta">Chọn 1 request</div> : null}
          </div>

          {!normalizedDetail ? (
            <div className="ta-empty-box">Chưa chọn trainer share nào.</div>
          ) : (
            <>
              <div className="ta-detail">
                <div className="ta-kv">
                  <div className="ta-k">Request</div>
                  <div className="ta-v">#{normalizedDetail.id}</div>
                </div>

                <div className="ta-kv">
                  <div className="ta-k">Status</div>
                  <div className="ta-v">
                    <span className={`ta-pill ta-pill--${normalizedDetail.status}`}>
                      {normalizedDetail.status}
                    </span>
                  </div>
                </div>

                <div className="ta-kv">
                  <div className="ta-k">PT</div>
                  <div className="ta-v">
                    {trainerLabel(normalizedDetail.trainer, normalizedDetail.trainerId)}
                  </div>
                </div>

                <div className="ta-kv">
                  <div className="ta-k">Từ Gym</div>
                  <div className="ta-v">
                    {gymLabel(normalizedDetail.fromGym, normalizedDetail.fromGymId)}
                  </div>
                </div>

                <div className="ta-kv">
                  <div className="ta-k">Đến Gym</div>
                  <div className="ta-v">{gymLabel(normalizedDetail.toGym, normalizedDetail.toGymId)}</div>
                </div>

                <div className="ta-kv">
                  <div className="ta-k">Người gửi</div>
                  <div className="ta-v">
                    {normalizedDetail.requester ? userLabel(normalizedDetail.requester) : "-"}
                  </div>
                </div>

                <div className="ta-kv">
                  <div className="ta-k">Policy</div>
                  <div className="ta-v">{policyLabel(normalizedDetail.policy, normalizedDetail.policyId)}</div>
                </div>

                <div className="ta-kv">
                  <div className="ta-k">CommissionSplit</div>
                  <div className="ta-v">{normalizedDetail.commissionSplit ?? "-"}</div>
                </div>

                <div className="ta-kv ta-kv--full">
                  <div className="ta-k">Notes</div>
                  <div className="ta-v">{normalizedDetail.notes || "-"}</div>
                </div>
              </div>

              <div className="ta-actions">
                <button
                  className="ta-btn"
                  disabled={normalizedDetail.status !== "pending"}
                  onClick={openApprove}
                >
                  Approve
                </button>
                <button
                  className="ta-btn ta-btn--danger"
                  disabled={normalizedDetail.status !== "pending"}
                  onClick={openReject}
                >
                  Reject
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== MODAL ===== */}
      {modal.open && (
        <div className="ta-modal__backdrop" onMouseDown={close}>
          <div className="ta-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ta-modal__head">
              <div className="ta-modal__title">
                {modal.type === "approve" ? "Approve Trainer Share" : "Reject Trainer Share"}
              </div>
              <button className="ta-btn ta-btn--ghost" onClick={close}>
                ✕
              </button>
            </div>

            <div className="ta-modal__body">
              {modal.type === "approve" ? (
                <>
                  <div className="ta-field">
                    <label>Policy</label>

                    {policiesLoading ? (
                      <div className="ta-hint">Đang tải policies...</div>
                    ) : policyOptions.length > 0 ? (
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
                                String(m.payload.commissionSplit || "").trim() !== ""
                                  ? m.payload.commissionSplit
                                  : defaultSplit,
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
                        onChange={(e) =>
                          setModal((m) => ({
                            ...m,
                            payload: { ...m.payload, policyId: e.target.value },
                          }))
                        }
                        placeholder="Nhập policyId (VD: 614)"
                      />
                    )}

                    <div className="ta-hint">
                      Chuẩn nghiệp vụ: dropdown hiển thị policy theo <b>FROM_GYM</b> + fallback <b>SYSTEM</b>.
                    </div>
                  </div>

                  <div className="ta-field">
                    <label>Commission Split (0 → 1)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={modal.payload.commissionSplit}
                      onChange={(e) =>
                        setModal((m) => ({
                          ...m,
                          payload: { ...m.payload, commissionSplit: e.target.value },
                        }))
                      }
                      placeholder="VD: 0.6"
                    />
                    <div
                      className={`ta-hint ${
                        !splitValid && modal.payload.commissionSplit !== "" ? "ta-hint--danger" : ""
                      }`}
                    >
                      Ví dụ 0.6 = 60%. Giá trị hợp lệ: lớn hơn 0 và nhỏ hơn 1.
                    </div>
                  </div>

                  <div className="ta-modal__actions">
                    <button
                      className="ta-btn ta-btn--primary"
                      onClick={doApprove}
                      disabled={!canApprove || loading}
                      title={
                        !hasPolicy
                          ? "Chọn Policy trước"
                          : !splitValid
                          ? "CommissionSplit phải nằm (0,1)"
                          : ""
                      }
                    >
                      Duyệt
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="ta-field">
                    <label>reason</label>
                    <textarea
                      value={modal.payload.reason}
                      onChange={(e) =>
                        setModal((m) => ({
                          ...m,
                          payload: { ...m.payload, reason: e.target.value },
                        }))
                      }
                      placeholder="Nhập lý do từ chối..."
                    />
                  </div>
                  <div className="ta-modal__actions">
                    <button className="ta-btn ta-btn--danger" onClick={doReject} disabled={loading}>
                      Từ chối
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
