import React, { useEffect, useMemo, useState } from "react";
import { adminFranchiseApi } from "../../../services/adminFranchiseApi";
import "./FranchiseRequestsPage.css";

const STATUS_LABEL = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
const CONTRACT_LABEL = {
  not_sent: "Not Sent",
  sent: "Sent",
  viewed: "Viewed",
  signed: "Signed",
  completed: "Completed",
  void: "Void",
};

function formatMoney(v) {
  if (v === null || v === undefined) return "-";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("vi-VN");
}

function normalizeListResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  return [];
}

function sortRowsStable(list) {
  const arr = [...(list || [])];
  arr.sort((a, b) => {
    // ưu tiên createdAt nếu có
    const ta = a?.createdAt ? new Date(a.createdAt).getTime() : null;
    const tb = b?.createdAt ? new Date(b.createdAt).getTime() : null;
    if (ta !== null && tb !== null && ta !== tb) return tb - ta;
    // fallback id desc
    return (b?.id || 0) - (a?.id || 0);
  });
  return arr;
}

// ===== button rules =====
const canApprove = (r) => r.status === "pending";
const canReject = (r) => r.status === "pending";
const canSendContract = (r) => r.status === "approved" && r.contractStatus === "not_sent";

// Waiting owner sign... = sent/viewed nhưng chưa signed
const isWaitingSign = (r) =>
  r.status === "approved" &&
  (r.contractStatus === "sent" || r.contractStatus === "viewed") &&
  !r.contractSigned;

// mock events giống base SignNow
const canMockViewed = (r) => r.status === "approved" && r.contractStatus === "sent";
const canMockSigned = (r) =>
  r.status === "approved" &&
  (r.contractStatus === "sent" || r.contractStatus === "viewed") &&
  !r.contractSigned;

// complete = signed -> completed + create gym
const canComplete = (r) => r.status === "approved" && r.contractStatus === "signed";
const isCompleted = (r) => r.contractStatus === "completed" && r.gymId;

export default function FranchiseRequestsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [contractStatus, setContractStatus] = useState("all");

  const [modal, setModal] = useState({ open: false, type: "", id: null, text: "" });

  async function load(extraParams) {
    setLoading(true);
    setError("");
    try {
      // Nếu BE support filter server-side thì params sẽ giúp.
      // Nếu không support, vẫn ok vì FE filter client-side.
      const res = await adminFranchiseApi.list(extraParams);
      const data = sortRowsStable(normalizeListResponse(res.data));
      setRows(data);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Load failed"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function runAction(id, fn, opts = {}) {
    setBusyId(id);
    setError("");
    try {
      if (opts?.confirmText) {
        const ok = window.confirm(opts.confirmText);
        if (!ok) return;
      }
      await fn();
      await load(); // reload để lấy state mới nhất từ BE
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Action failed"
      );
    } finally {
      setBusyId(null);
    }
  }

  function openModal(type, id) {
    setModal({ open: true, type, id, text: "" });
  }
  function closeModal() {
    setModal({ open: false, type: "", id: null, text: "" });
  }

  async function submitModal() {
    const { type, id, text } = modal;
    if (!id) return;

    if (type === "approve") {
      await runAction(id, () => adminFranchiseApi.approve(id, { reviewNotes: text }));
      closeModal();
      return;
    }
    if (type === "reject") {
      if (!text.trim()) {
        setError("Rejection reason is required");
        return;
      }
      await runAction(id, () => adminFranchiseApi.reject(id, { rejectionReason: text }));
      closeModal();
      return;
    }
  }

  async function copyToClipboard(value) {
    try {
      await navigator.clipboard.writeText(value);
      // không cần toast, UI đơn giản
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      const okStatus = status === "all" ? true : r.status === status;
      const okContract = contractStatus === "all" ? true : r.contractStatus === contractStatus;

      const text = `${r.businessName || ""} ${r.location || ""} ${r.contactPerson || ""} ${
        r.contactEmail || ""
      } ${r.contractUrl || ""}`.toLowerCase();

      const okQ = !qq ? true : text.includes(qq);
      return okStatus && okContract && okQ;
    });
  }, [rows, q, status, contractStatus]);

  return (
    <div className="fr-page">
      <div className="fr-header">
        <div>
          <div className="fr-title">Franchise Requests</div>
          <div className="fr-subtitle">
            Approve → Send Contract → Viewed → Signed → Completed → Create Gym (mock SignNow base)
          </div>
        </div>

        <div className="fr-actions">
          <button className="fr-btn fr-btn-ghost" onClick={() => load()} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div className="fr-toolbar">
        <div className="fr-search">
          <input
            className="fr-input"
            placeholder="Search business / location / contact / contract url..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="fr-filters">
          <select className="fr-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            className="fr-select"
            value={contractStatus}
            onChange={(e) => setContractStatus(e.target.value)}
          >
            <option value="all">All Contract</option>
            <option value="not_sent">Not Sent</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="signed">Signed</option>
            <option value="completed">Completed</option>
            <option value="void">Void</option>
          </select>
        </div>
      </div>

      {error ? <div className="fr-alert">{error}</div> : null}

      <div className="fr-card">
        {loading ? (
          <div className="fr-empty">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="fr-empty">No requests found.</div>
        ) : (
          <div className="fr-tableWrap">
            <table className="fr-table">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>ID</th>
                  <th>Business</th>
                  <th>Location</th>
                  <th>Contact</th>
                  <th style={{ width: 150 }}>Investment</th>
                  <th style={{ width: 140 }}>Status</th>
                  <th style={{ width: 200 }}>Contract</th>
                  <th style={{ width: 90 }}>Gym</th>
                  <th style={{ width: 650 }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((r) => {
                  const busy = busyId === r.id;

                  return (
                    <tr key={r.id} className={busy ? "fr-rowBusy" : ""}>
                      <td className="fr-mono">#{r.id}</td>

                      <td>
                        <div className="fr-main">{r.businessName || "-"}</div>
                        <div className="fr-muted">{r.businessPlan || ""}</div>
                      </td>

                      <td>{r.location || "-"}</td>

                      <td>
                        <div className="fr-main">{r.contactPerson || "-"}</div>
                        <div className="fr-muted">{r.contactEmail || ""}</div>
                      </td>

                      <td className="fr-mono">{formatMoney(r.investmentAmount)}</td>

                      <td>
                        <span className={`fr-pill fr-pill-${r.status}`}>
                          {STATUS_LABEL[r.status] || r.status}
                        </span>
                      </td>

                      <td>
                        <div className="fr-contract">
                          <span
                            className={`fr-pill fr-pill-contract ${
                              r.contractStatus === "signed" || r.contractStatus === "completed"
                                ? "fr-pill-signed"
                                : ""
                            }`}
                          >
                            {CONTRACT_LABEL[r.contractStatus] || r.contractStatus}
                          </span>

                          {r.contractUrl ? (
                            <button
                              className="fr-linkBtn"
                              onClick={() => window.open(r.contractUrl, "_blank", "noopener,noreferrer")}
                              disabled={busy}
                              title="Open contract link (mock SignNow)"
                            >
                              Open
                            </button>
                          ) : null}

                          {r.contractUrl ? (
                            <button
                              className="fr-linkBtn fr-linkBtn-ghost"
                              onClick={() => copyToClipboard(r.contractUrl)}
                              disabled={busy}
                              title="Copy contract URL"
                            >
                              Copy
                            </button>
                          ) : null}
                        </div>

                        {isWaitingSign(r) ? <div className="fr-muted">Waiting owner sign…</div> : null}
                      </td>

                      <td>{r.gymId ? <span className="fr-mono">#{r.gymId}</span> : "-"}</td>

                      <td>
                        <div className="fr-btnRow">
                          <button
                            className="fr-btn fr-btn-primary"
                            disabled={busy || !canApprove(r)}
                            onClick={() => openModal("approve", r.id)}
                          >
                            Approve
                          </button>

                          <button
                            className="fr-btn fr-btn-danger"
                            disabled={busy || !canReject(r)}
                            onClick={() => openModal("reject", r.id)}
                          >
                            Reject
                          </button>

                          <button
                            className="fr-btn fr-btn-secondary"
                            disabled={busy || !canSendContract(r)}
                            onClick={() =>
                              runAction(r.id, () => adminFranchiseApi.sendContract(r.id), {
                                confirmText: "Send contract to owner (mock SignNow)?",
                              })
                            }
                          >
                            Send Contract
                          </button>

                          <button
                            className="fr-btn fr-btn-ghost"
                            disabled={busy || !canMockViewed(r)}
                            onClick={() => runAction(r.id, () => adminFranchiseApi.mockViewed(r.id))}
                            title="Mock: owner opened the contract link"
                          >
                            Mock Viewed
                          </button>

                          <button
                            className="fr-btn fr-btn-ghost"
                            disabled={busy || !canMockSigned(r)}
                            onClick={() => runAction(r.id, () => adminFranchiseApi.mockSigned(r.id))}
                            title="Mock: owner signed the contract"
                          >
                            Mock Signed
                          </button>

                          <button
                            className="fr-btn fr-btn-ghost"
                            disabled={busy}
                            onClick={() => runAction(r.id, () => adminFranchiseApi.getContractStatus(r.id))}
                            title="Poll contract status (like SignNow status check)"
                          >
                            Refresh Status
                          </button>

                          <button
                            className="fr-btn fr-btn-warning"
                            disabled={busy || !canComplete(r)}
                            onClick={() =>
                              runAction(r.id, () => adminFranchiseApi.mockCompleted(r.id), {
                                confirmText: "Complete contract and create Gym now?",
                              })
                            }
                            title="Mock: complete workflow and create gym"
                          >
                            Complete
                          </button>

                          {isCompleted(r) ? <span className="fr-done">✅ Completed</span> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.open ? (
        <div className="fr-modalOverlay" onClick={closeModal}>
          <div className="fr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fr-modalTitle">
              {modal.type === "approve" ? "Approve Request" : "Reject Request"}
            </div>

            <textarea
              className="fr-textarea"
              rows={5}
              placeholder={modal.type === "approve" ? "Review notes (optional)..." : "Rejection reason (required)..."}
              value={modal.text}
              onChange={(e) => setModal((m) => ({ ...m, text: e.target.value }))}
            />

            <div className="fr-modalActions">
              <button className="fr-btn fr-btn-ghost" onClick={closeModal} disabled={busyId !== null}>
                Cancel
              </button>

              <button className="fr-btn fr-btn-primary" onClick={submitModal} disabled={busyId !== null}>
                Submit
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
