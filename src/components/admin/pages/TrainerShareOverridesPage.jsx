// src/components/admin/pages/TrainerShareOverridesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./TrainerShareOverridesPage.css";

import {
  admListTrainerShares,
  admListTrainerShareOverrides,
  admCreateTrainerShareOverrideRequest,
  admApproveTrainerShareOverride,
  admRevokeTrainerShareOverride,
  admToggleTrainerShareOverride,
  admResolveTrainerShareConfig,
  admListTrainerShareOverrideAudits,
} from "../../../services/adminTrainerShareOverrideService";

/**
 * Enterprise behavior:
 * - User chọn 1 TrainerShare (base policy) bên trái
 * - Override request tạo cho policy đó → policyId không nên gõ tay
 * - "Không overlap khi approve" phải do BE enforce; FE chỉ hỗ trợ UX cảnh báo
 */

const STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
};

function toISODateTimeLocalInputValue(date = new Date()) {
  // yyyy-MM-ddTHH:mm for input type="datetime-local"
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function parseSplit(value) {
  const v = String(value ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return n;
}

function isValidSplit(n) {
  return typeof n === "number" && n > 0 && n < 1;
}

function normalizeStatus(s) {
  const v = String(s || "").toUpperCase();
  return v;
}

export default function TrainerShareOverridesPage() {
  // ====== Filters (left list trainershare)
  const [filterStatus, setFilterStatus] = useState("approved");
  const [filterFromGym, setFilterFromGym] = useState("all");
  const [filterToGym, setFilterToGym] = useState("all");
  const [filterPt, setFilterPt] = useState("all");

  // ====== Data
  const [trainerShares, setTrainerShares] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [audits, setAudits] = useState([]);

  const [openRowMenu, setOpenRowMenu] = useState(null);
  const [notesModal, setNotesModal] = useState({ open: false, title: "", text: "" });
  const [applied, setApplied] = useState(null);

  // ====== UI state
  const [loadingLeft, setLoadingLeft] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);
  const [loadingApplied, setLoadingApplied] = useState(false);
  const [loadingAudits, setLoadingAudits] = useState(false);

  const [selectedTrainerShare, setSelectedTrainerShare] = useState(null);

  // modal create/update
  const [openCreate, setOpenCreate] = useState(false);
  const [formPolicyId, setFormPolicyId] = useState("");
  const [formSplit, setFormSplit] = useState("");
  const [formFrom, setFormFrom] = useState("");
  const [formTo, setFormTo] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");

  // enterprise toggle: nếu bạn MUỐN dropdown policyId
  const ENABLE_POLICYID_DROPDOWN = false;

  // ====== Load left list (trainerShares)
  const loadTrainerShares = async () => {
    setLoadingLeft(true);
    try {
      // Bạn có thể map filters theo BE của bạn.
      // Ở đây gửi params phổ biến.
      const params = {
        status: filterStatus === "all" ? undefined : filterStatus,
        fromGymId: filterFromGym === "all" ? undefined : filterFromGym,
        toGymId: filterToGym === "all" ? undefined : filterToGym,
        ptId: filterPt === "all" ? undefined : filterPt,
      };

      const res = await admListTrainerShares(params);
      const rows = res?.data?.data ?? res?.data ?? [];
      setTrainerShares(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      setTrainerShares([]);
    } finally {
      setLoadingLeft(false);
    }
  };

  // ====== Load overrides for selected policy
  const loadOverrides = async (trainerShareId) => {
    if (!trainerShareId) {
      setOverrides([]);
      return;
    }
    setLoadingRight(true);
    try {
      const res = await admListTrainerShareOverrides({ trainerShareId });
      const rows = res?.data?.data ?? res?.data ?? [];
      setOverrides(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      setOverrides([]);
    } finally {
      setLoadingRight(false);
    }
  };

  // ====== Load applied config
  const loadApplied = async (trainerShareId) => {
    if (!trainerShareId) {
      setApplied(null);
      return;
    }
    setLoadingApplied(true);
    try {
      const res = await admResolveTrainerShareConfig({ trainerShareId });
      setApplied(res?.data?.data ?? res?.data ?? null);
    } catch (e) {
      console.error(e);
      setApplied(null);
    } finally {
      setLoadingApplied(false);
    }
  };

  // ====== Load audits
  const loadAudits = async (trainerShareId) => {
    if (!trainerShareId) {
      setAudits([]);
      return;
    }
    setLoadingAudits(true);
    try {
      const res = await admListTrainerShareOverrideAudits({ trainerShareId });
      const rows = res?.data?.data ?? res?.data ?? [];
      setAudits(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      setAudits([]);
    } finally {
      setLoadingAudits(false);
    }
  };

  useEffect(() => {
    loadTrainerShares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterFromGym, filterToGym, filterPt]);

  useEffect(() => {
    if (!selectedTrainerShare?.id) return;
    loadOverrides(selectedTrainerShare.id);
    loadApplied(selectedTrainerShare.id);
    loadAudits(selectedTrainerShare.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrainerShare?.id]);

  // ====== Derived dropdown options from trainerShares list (nếu bạn muốn)
  const policyIdOptions = useMemo(() => {
    return trainerShares.map((x) => ({
      id: x.id,
      label: `#${x.id} • ${x?.ptName || x?.pt?.name || "PT"} • ${x?.fromGymName || x?.fromGym?.name || "From"} → ${
        x?.toGymName || x?.toGym?.name || "To"
      }`,
    }));
  }, [trainerShares]);

  // ====== Open create modal: auto-fill policyId from selected row (enterprise chuẩn)
  const openCreateModal = () => {
    if (!selectedTrainerShare?.id) {
      alert("Bạn cần chọn 1 dòng TrainerShare (base policy) bên trái trước.");
      return;
    }
    setFormError("");
    setFormPolicyId(String(selectedTrainerShare.id));
    setFormSplit("");
    setFormFrom(toISODateTimeLocalInputValue(new Date()));
    // default end + 30 days
    const end = new Date();
    end.setDate(end.getDate() + 30);
    setFormTo(toISODateTimeLocalInputValue(end));
    setFormNotes("");
    setOpenCreate(true);
  };

  const closeCreateModal = () => setOpenCreate(false);

  const validateCreateForm = () => {
    const pid = String(formPolicyId || "").trim();
    if (!pid) return "Thiếu policyId.";
    const split = parseSplit(formSplit);
    if (!isValidSplit(split)) return "Commission split phải hợp lệ (0 < split < 1).";
    if (!formFrom || !formTo) return "Thiếu Effective From/To.";
    const from = new Date(formFrom);
    const to = new Date(formTo);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "Ngày giờ không hợp lệ.";
    if (from.getTime() >= to.getTime()) return "Effective To phải lớn hơn Effective From.";
    return "";
  };

  const onCreateRequest = async () => {
    const err = validateCreateForm();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError("");
    try {
      const payload = {
        trainerShareId: Number(formPolicyId),
        commissionSplit: Number(formSplit),
        effectiveFrom: new Date(formFrom).toISOString(),
        effectiveTo: new Date(formTo).toISOString(),
        notes: formNotes?.trim() || null,
      };

      await admCreateTrainerShareOverrideRequest(payload);

      closeCreateModal();
      await loadOverrides(selectedTrainerShare.id);
      await loadApplied(selectedTrainerShare.id);
      await loadAudits(selectedTrainerShare.id);
    } catch (e) {
      console.error(e);
      setFormError(e?.response?.data?.message || "Tạo request thất bại. Kiểm tra BE validate/overlap.");
    }
  };

  const onApprove = async (overrideId) => {
    if (!overrideId) return;
    if (!window.confirm("Approve override này? (BE sẽ chặn nếu overlap)")) return;
    try {
      await admApproveTrainerShareOverride(overrideId);
      await loadOverrides(selectedTrainerShare.id);
      await loadApplied(selectedTrainerShare.id);
      await loadAudits(selectedTrainerShare.id);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Approve thất bại.");
    }
  };

  const onRevoke = async (overrideId) => {
    if (!overrideId) return;
    if (!window.confirm("Revoke override này (revert về base)?")) return;
    try {
      await admRevokeTrainerShareOverride(overrideId);
      await loadOverrides(selectedTrainerShare.id);
      await loadApplied(selectedTrainerShare.id);
      await loadAudits(selectedTrainerShare.id);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Revoke thất bại.");
    }
  };

  const onToggle = async (overrideId, nextActive) => {
    try {
      await admToggleTrainerShareOverride(overrideId, { isActive: !!nextActive });
      await loadOverrides(selectedTrainerShare.id);
      await loadApplied(selectedTrainerShare.id);
      await loadAudits(selectedTrainerShare.id);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Toggle thất bại.");
    }
  };

  // ====== Render helpers
  const fmtDate = (s) => {
    if (!s) return "—";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return String(s);
    return d.toLocaleString();
  };

  const badgeClass = (s) => {
    const st = normalizeStatus(s);
    if (st === STATUS.APPROVED) return "tso-badge tso-badge--approved";
    if (st === STATUS.PENDING) return "tso-badge tso-badge--pending";
    if (st === STATUS.REVOKED) return "tso-badge tso-badge--revoked";
    if (st === STATUS.EXPIRED) return "tso-badge tso-badge--expired";
    if (st === STATUS.REJECTED) return "tso-badge tso-badge--rejected";
    return "tso-badge";
  };

  return (
    <div className="tso-page">
      <div className="tso-header">
        <div>
          <div className="tso-title">Trainer Share Overrides (Enterprise)</div>
          <div className="tso-subtitle">
            PENDING → APPROVED/REVOKED/EXPIRED, có hiệu lực theo thời gian, audit log, revert về base
          </div>
        </div>
        <button className="tso-btn tso-btn--primary" onClick={openCreateModal} disabled={!selectedTrainerShare?.id}>
          Tạo Override Request
        </button>
      </div>

      <div className="tso-grid">
        {/* LEFT: TrainerShares list */}
        <div className="tso-card">
          <div className="tso-card__head">
            <div className="tso-card__title">TrainerShare (chọn 1 dòng)</div>
            <div className="tso-card__meta">Tổng: {trainerShares.length}</div>
          </div>

          <div className="tso-filters">
            <div className="tso-field">
              <label>Status (TrainerShare)</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">Tất cả</option>
                <option value="approved">approved</option>
                <option value="pending">pending</option>
                <option value="revoked">revoked</option>
              </select>
            </div>

            <div className="tso-field">
              <label>Từ gym</label>
              <select value={filterFromGym} onChange={(e) => setFilterFromGym(e.target.value)}>
                <option value="all">Tất cả</option>
                {/* nếu bạn có gyms list riêng thì thay options ở đây */}
              </select>
            </div>

            <div className="tso-field">
              <label>Đến gym</label>
              <select value={filterToGym} onChange={(e) => setFilterToGym(e.target.value)}>
                <option value="all">Tất cả</option>
              </select>
            </div>

            <div className="tso-field">
              <label>PT</label>
              <select value={filterPt} onChange={(e) => setFilterPt(e.target.value)}>
                <option value="all">Tất cả</option>
              </select>
            </div>

            <button className="tso-btn" onClick={loadTrainerShares} disabled={loadingLeft}>
              {loadingLeft ? "Đang tải..." : "Lọc TrainerShare"}
            </button>
          </div>

          <div className="tso-table">
            <div className="tso-table__row tso-table__head">
              <div>STATUS</div>
              <div>PT</div>
              <div>TỪ</div>
              <div>ĐẾN</div>
            </div>

            {loadingLeft ? (
              <div className="tso-empty">Đang tải...</div>
            ) : trainerShares.length === 0 ? (
              <div className="tso-empty">Không có dữ liệu.</div>
            ) : (
              trainerShares.map((row) => {
                const active = selectedTrainerShare?.id === row.id;
                return (
                  <div
                    key={row.id}
                    className={`tso-table__row ${active ? "tso-table__row--active" : ""}`}
                    onClick={() => setSelectedTrainerShare(row)}
                    role="button"
                    tabIndex={0}
                  >
                    <div>
                      <span className={`tso-pill ${String(row.status || "").toLowerCase() === "approved" ? "ok" : ""}`}>
                        {row.status || "—"}
                      </span>
                    </div>
                    <div>{row?.ptName || row?.pt?.name || "—"}</div>
                    <div>{row?.fromGymName || row?.fromGym?.name || "—"}</div>
                    <div>{row?.toGymName || row?.toGym?.name || "—"}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: Overrides + Applied + Audits */}
        <div className="tso-right">
          {/* Applied */}
          <div className="tso-card">
            <div className="tso-card__head">
              <div className="tso-card__title">Applied config (hiện tại)</div>
              <div className="tso-card__meta">{loadingApplied ? "Đang resolve..." : ""}</div>
            </div>

            {!selectedTrainerShare?.id ? (
              <div className="tso-empty">Chọn 1 TrainerShare để xem cấu hình áp dụng.</div>
            ) : loadingApplied ? (
              <div className="tso-empty">Đang tải...</div>
            ) : !applied ? (
              <div className="tso-empty">Chưa resolve được.</div>
            ) : (
              <div className="tso-applied">
                <div className="tso-applied__row">
                  <span className="k">Policy</span>
                  <span className="v">#{selectedTrainerShare.id}</span>
                </div>
                <div className="tso-applied__row">
                  <span className="k">Split</span>
                  <span className="v">{applied?.commissionSplit ?? applied?.split ?? "—"}</span>
                </div>
                <div className="tso-applied__row">
                  <span className="k">Source</span>
                  <span className="v">{applied?.source || applied?.type || "base/override"}</span>
                </div>
                <div className="tso-applied__row">
                  <span className="k">Effective</span>
                  <span className="v">
                    {fmtDate(applied?.effectiveFrom)} → {fmtDate(applied?.effectiveTo)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Overrides list */}
          <div className="tso-card">
            <div className="tso-card__head">
              <div className="tso-card__title">Overrides (theo giai đoạn)</div>
              <div className="tso-card__meta">
                <button
                  className="tso-btn tso-btn--ghost"
                  onClick={() => selectedTrainerShare?.id && loadOverrides(selectedTrainerShare.id)}
                  disabled={!selectedTrainerShare?.id || loadingRight}
                >
                  {loadingRight ? "Đang tải..." : "Refresh overrides"}
                </button>
              </div>
            </div>

            {!selectedTrainerShare?.id ? (
              <div className="tso-empty">Chọn 1 TrainerShare để xem overrides.</div>
            ) : loadingRight ? (
              <div className="tso-empty">Đang tải...</div>
            ) : overrides.length === 0 ? (
              <div className="tso-empty">Chưa có override nào.</div>
            ) : (
              <div className="tso-table tso-table--overrides">
                <div className="tso-table__row tso-table__head">
                  <div>STATUS</div>
                  <div>SPLIT</div>
                  <div>TỪ</div>
                  <div>ĐẾN</div>
                  <div>ACTIVE</div>
                  <div>ACTIONS</div>
                </div>

                {overrides.map((o) => {
                  const st = normalizeStatus(o.status);
                  const isApproved = st === STATUS.APPROVED;
                  return (
                    <div key={o.id} className="tso-table__row">
                      <div>
                        <span className={badgeClass(st)}>{st || "—"}</span>
                      </div>
                      <div>{o.commissionSplit ?? "—"}</div>
                      <div>{fmtDate(o.effectiveFrom)}</div>
                      <div>{fmtDate(o.effectiveTo)}</div>
                      <div>
                        <label className={`tso-switch ${!isApproved ? "disabled" : ""}`}>
                          <input
                            type="checkbox"
                            checked={!!o.isActive}
                            disabled={!isApproved}
                            onChange={(e) => onToggle(o.id, e.target.checked)}
                          />
                          <span className="tso-switch__ui" />
                        </label>
                      </div>
                      <div className="tso-actions" onClick={(e) => e.stopPropagation()}>
                        {st === STATUS.PENDING && (
                          <button className="tso-btn tso-btn--primary" onClick={() => onApprove(o.id)}>
                            Approve
                          </button>
                        )}
                        {st === STATUS.APPROVED && (
                          <button className="tso-btn tso-btn--danger" onClick={() => onRevoke(o.id)}>
                            Revoke
                          </button>
                        )}

                        <div className="tso-menuWrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="tso-btn tso-btn--ghost tso-menuBtn"
                            onClick={() => setOpenRowMenu((cur) => (cur === o.id ? null : o.id))}
                            title="More"
                          >
                            ⋯
                          </button>

                          {openRowMenu === o.id ? (
                            <div className="tso-menu">
                              <button
                                className="tso-menuItem"
                                onClick={() => {
                                  setOpenRowMenu(null);
                                  setNotesModal({
                                    open: true,
                                    title: `Notes (Override #${o.id})`,
                                    text: o.notes || "",
                                  });
                                }}
                              >
                                View notes
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="tso-hint">* Không cho overlap khi APPROVE (BE phải enforce). Toggle chỉ hoạt động khi APPROVED.</div>
          </div>

          {/* Audits */}
          <div className="tso-card">
            <div className="tso-card__head">
              <div className="tso-card__title">Audit Logs</div>
              <div className="tso-card__meta">
                <button
                  className="tso-btn tso-btn--ghost"
                  onClick={() => selectedTrainerShare?.id && loadAudits(selectedTrainerShare.id)}
                  disabled={!selectedTrainerShare?.id || loadingAudits}
                >
                  {loadingAudits ? "Đang tải..." : "Refresh audit"}
                </button>
              </div>
            </div>

            {!selectedTrainerShare?.id ? (
              <div className="tso-empty">Chọn 1 TrainerShare để xem audit.</div>
            ) : loadingAudits ? (
              <div className="tso-empty">Đang tải...</div>
            ) : audits.length === 0 ? (
              <div className="tso-empty">Chưa có audit logs.</div>
            ) : (
              <div className="tso-audit">
                {audits.slice(0, 30).map((a) => (
                  <div key={a.id} className="tso-audit__row">
                    <div className="tso-audit__left">
                      <div className="tso-audit__action">{a.action || "—"}</div>
                      <div className="tso-audit__meta">
                        {fmtDate(a.createdAt)} • actor: {a.actorId || "—"} • {a.actorRole || "—"}
                      </div>
                    </div>
                    <div className="tso-audit__right">
                      <div className="tso-audit__diff">
                        <span className="k">old</span>: {a.oldValue ? JSON.stringify(a.oldValue) : "—"}
                      </div>
                      <div className="tso-audit__diff">
                        <span className="k">new</span>: {a.newValue ? JSON.stringify(a.newValue) : "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes Modal */}
      {notesModal.open && (
        <div
          className="tso-modal__backdrop"
          onMouseDown={() => setNotesModal({ open: false, title: "", text: "" })}
        >
          <div className="tso-modal tso-modal--compact" onMouseDown={(e) => e.stopPropagation()}>
            <div className="tso-modal__head">
              <div className="tso-modal__title">{notesModal.title || "Notes"}</div>
              <button
                className="tso-btn tso-btn--ghost"
                onClick={() => setNotesModal({ open: false, title: "", text: "" })}
              >
                ✕
              </button>
            </div>
            <div className="tso-modal__body">
              <textarea value={notesModal.text || ""} readOnly />
              <div className="tso-help">* Notes chỉ đọc (compliance/audit). Nếu cần edit pending, mở thêm UI sửa request.</div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {openCreate && (
        <div className="tso-modal__backdrop" onMouseDown={closeCreateModal}>
          <div className="tso-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="tso-modal__head">
              <div className="tso-modal__title">Tạo Override Request (PENDING)</div>
              <button className="tso-btn tso-btn--ghost" onClick={closeCreateModal}>
                ✕
              </button>
            </div>

            <div className="tso-modal__body">
              <div className="tso-row">
                <div className="tso-field">
                  <label>POLICYID</label>

                  {ENABLE_POLICYID_DROPDOWN ? (
                    <select value={formPolicyId} onChange={(e) => setFormPolicyId(e.target.value)}>
                      <option value="">Chọn policy...</option>
                      {policyIdOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input value={formPolicyId} readOnly />
                  )}

                  <div className="tso-help">PolicyId auto-fill theo dòng TrainerShare bạn chọn (chuẩn enterprise).</div>
                </div>

                <div className="tso-field">
                  <label>COMMISSION SPLIT (0→1)</label>
                  <input
                    value={formSplit}
                    onChange={(e) => setFormSplit(e.target.value)}
                    placeholder="VD: 0.6"
                    inputMode="decimal"
                  />
                  <div className="tso-help">Bắt buộc: 0 &lt; split &lt; 1</div>
                </div>
              </div>

              <div className="tso-row">
                <div className="tso-field">
                  <label>EFFECTIVE FROM</label>
                  <input type="datetime-local" value={formFrom} onChange={(e) => setFormFrom(e.target.value)} />
                </div>
                <div className="tso-field">
                  <label>EFFECTIVE TO</label>
                  <input type="datetime-local" value={formTo} onChange={(e) => setFormTo(e.target.value)} />
                </div>
              </div>

              <div className="tso-field">
                <label>NOTES</label>
                <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Lý do override..." />
              </div>

              {formError && <div className="tso-error">{formError}</div>}

              <div className="tso-modal__foot">
                <button className="tso-btn" onClick={closeCreateModal}>
                  Hủy
                </button>
                <button className="tso-btn tso-btn--primary" onClick={onCreateRequest}>
                  Tạo request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
