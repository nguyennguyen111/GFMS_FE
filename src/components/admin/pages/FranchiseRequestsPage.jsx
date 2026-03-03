import React, { useEffect, useMemo, useState, useRef } from "react";
import { adminFranchiseApi } from "../../../services/adminFranchiseApi";
import "./FranchiseRequestsPage.css";

const STATUS_LABEL = { pending: "Pending", approved: "Approved", rejected: "Rejected" };

const CONTRACT_LABEL = {
  not_sent: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  signed: "Signed",
  completed: "Completed",
  void: "Void",
};

const SHOW_DEV_ACTIONS = process.env.NODE_ENV !== "production";

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
    const ta = a?.createdAt ? new Date(a.createdAt).getTime() : null;
    const tb = b?.createdAt ? new Date(b.createdAt).getTime() : null;
    if (ta !== null && tb !== null && ta !== tb) return tb - ta;
    return (b?.id || 0) - (a?.id || 0);
  });
  return arr;
}

const canApprove = (r) => r.status === "pending";
const canReject = (r) => r.status === "pending";

const canSendContract = (r) => r.status === "approved" && r.contractStatus === "not_sent";
const canResend = (r) =>
  r.status === "approved" && (r.contractStatus === "sent" || r.contractStatus === "viewed");

const canSimulateViewed = (r) => r.status === "approved" && r.contractStatus === "sent";
const canSimulateOwnerSigned = (r) =>
  r.status === "approved" &&
  (r.contractStatus === "sent" || r.contractStatus === "viewed") &&
  !r.contractSigned;

const canCountersign = (r) => r.status === "approved" && r.contractStatus === "signed";
const isCompleted = (r) => r.contractStatus === "completed" && r.gymId;

export default function FranchiseRequestsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const [openMenuId, setOpenMenuId] = useState(null);
  const [openFilesId, setOpenFilesId] = useState(null);
  const [details, setDetails] = useState({ open: false, id: null });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [contractStatus, setContractStatus] = useState("all");

  const [modal, setModal] = useState({ open: false, type: "", id: null, text: "" });
  const [signModal, setSignModal] = useState({ open: false, id: null, signerName: "Admin" });
  const signPadRef = useRef(null);


  async function load(extraParams) {
    setLoading(true);
    setError("");
    try {
      const res = await adminFranchiseApi.list(extraParams);
      const data = sortRowsStable(normalizeListResponse(res.data));
      setRows(data);
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (openMenuId === null && openFilesId === null) return;

    const onClickOutside = () => {
      setOpenMenuId(null);
      setOpenFilesId(null);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenMenuId(null);
        setOpenFilesId(null);
      }
    };

    document.addEventListener('click', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenuId, openFilesId]);


  async function runAction(id, fn, opts = {}) {
    setBusyId(id);
    setError("");
    try {
      if (opts?.confirmText) {
        const ok = window.confirm(opts.confirmText);
        if (!ok) return;
      }
      await fn();
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || "Action failed");
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

  function openDetails(id) {
    setDetails({ open: true, id });
  }

  function closeDetails() {
    setDetails({ open: false, id: null });
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
    }
  }

  async function copyToClipboard(value) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  
  async function downloadDoc(id, type) {
    try {
      const res = await adminFranchiseApi.downloadDocument(id, type);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FranchiseContract_${id}_${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Download failed");
    }
  }

  function openSignModal(id) {
    setSignModal({ open: true, id, signerName: "Admin" });
    setTimeout(() => {
      signPadRef.current?.clear?.();
    }, 0);
  }

  function closeSignModal() {
    setSignModal({ open: false, id: null, signerName: "Admin" });
  }

  async function submitCountersign() {
    const id = signModal.id;
    const signatureDataUrl = signPadRef.current?.exportPngDataUrl?.();
    if (!signatureDataUrl) {
      alert("Please draw admin signature first.");
      return;
    }

    await runAction(
      id,
      () => adminFranchiseApi.countersign(id, { signerName: signModal.signerName, signatureDataUrl }),
      { confirmText: "Admin countersign and complete? This will create gym + freeze final PDF." }
    );

    closeSignModal();
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
            Approve → Send Invite (Email) → Viewed → Owner Signed → Admin Countersign → Completed → Create Gym
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
            <option value="not_sent">Draft</option>
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
                  <th style={{ width: 240 }}>Contract</th>
                  <th style={{ width: 90 }}>Gym</th>
                  <th style={{ width: 720 }}>Actions</th>
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
                        <div className="fr-contractCol">
                          <div className="fr-contractTop">
                            <span
                              className={`fr-pill fr-pill-contract ${
                                r.contractStatus === "signed" || r.contractStatus === "completed"
                                  ? "fr-pill-signed"
                                  : ""
                              }`}
                            >
                              {CONTRACT_LABEL[r.contractStatus] || r.contractStatus}
                            </span>

                            <span className={`fr-linkBadge ${r.contractUrl ? "" : "fr-linkBadge-off"}`}>
                              {r.contractUrl ? "Link ready" : "No link"}
                            </span>
                          </div>

                          <ContractStepper status={r.contractStatus} />

                          {r.status === "approved" && (r.contractStatus === "sent" || r.contractStatus === "viewed") ? (
                            <div className="fr-muted">Waiting owner sign…</div>
                          ) : null}
                        </div>
                      </td>

                      <td>{r.gymId ? <span className="fr-mono">#{r.gymId}</span> : "-"}</td>

                                            <td>
                        <div className="fr-actionsCell" onClick={(e) => e.stopPropagation()}>
                          <div className="fr-btnRow">
                            {/* Primary actions */}
                            {canApprove(r) ? (
                              <>
                                <button
                                  className="fr-btn fr-btn-primary"
                                  disabled={busy}
                                  onClick={() => openModal("approve", r.id)}
                                >
                                  Approve
                                </button>

                                <button
                                  className="fr-btn fr-btn-danger"
                                  disabled={busy}
                                  onClick={() => openModal("reject", r.id)}
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <>
                                {canSendContract(r) ? (
                                  <button
                                    className="fr-btn fr-btn-primary"
                                    disabled={busy}
                                    onClick={() =>
                                      runAction(r.id, () => adminFranchiseApi.sendContract(r.id), {
                                        confirmText: "Send signing invite to owner?",
                                      })
                                    }
                                  >
                                    Send Invite
                                  </button>
                                ) : canCountersign(r) ? (
                                  <button
                                    className="fr-btn fr-btn-warning"
                                    disabled={busy}
                                    onClick={() => openSignModal(r.id)}
                                  >
                                    Countersign
                                  </button>
                                ) : canResend(r) ? (
                                  <button
                                    className="fr-btn fr-btn-secondary"
                                    disabled={busy}
                                    onClick={() =>
                                      runAction(r.id, () => adminFranchiseApi.resendInvite(r.id), {
                                        confirmText: "Resend signing invite (new link)?",
                                      })
                                    }
                                  >
                                    Resend
                                  </button>
                                ) : (
                                  <button className="fr-btn fr-btn-ghost" disabled>
                                    —
                                  </button>
                                )}
                              </>
                            )}

                            <button className="fr-btn fr-btn-ghost" disabled={busy} onClick={() => openDetails(r.id)}>
                              Details
                            </button>

                            {/* Files menu */}
                            <div className="fr-menuWrap" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="fr-btn fr-btn-ghost fr-menuBtn"
                                disabled={busy}
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setOpenFilesId((cur) => (cur === r.id ? null : r.id));
                                }}
                              >
                                Files ▾
                              </button>

                              {openFilesId === r.id ? (
                                <div className="fr-menu" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    className="fr-menuItem"
                                    disabled={busy}
                                    onClick={() => {
                                      setOpenFilesId(null);
                                      downloadDoc(r.id, "original");
                                    }}
                                  >
                                    Download original PDF
                                  </button>

                                  <button
                                    className={`fr-menuItem ${
                                      !(r.contractStatus === "signed" || r.contractStatus === "completed") ? "disabled" : ""
                                    }`}
                                    disabled={busy || !(r.contractStatus === "signed" || r.contractStatus === "completed")}
                                    onClick={() => {
                                      setOpenFilesId(null);
                                      downloadDoc(r.id, "owner_signed");
                                    }}
                                  >
                                    Download owner-signed PDF
                                  </button>

                                  <button
                                    className={`fr-menuItem ${r.contractStatus !== "completed" ? "disabled" : ""}`}
                                    disabled={busy || r.contractStatus !== "completed"}
                                    onClick={() => {
                                      setOpenFilesId(null);
                                      downloadDoc(r.id, "final");
                                    }}
                                  >
                                    Download final PDF
                                  </button>

                                  <button
                                    className={`fr-menuItem ${r.contractStatus !== "completed" ? "disabled" : ""}`}
                                    disabled={busy || r.contractStatus !== "completed"}
                                    onClick={() => {
                                      setOpenFilesId(null);
                                      downloadDoc(r.id, "certificate");
                                    }}
                                  >
                                    Download certificate
                                  </button>
                                </div>
                              ) : null}
                            </div>

                            {/* More menu */}
                            <div className="fr-menuWrap" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="fr-btn fr-btn-ghost fr-menuBtn"
                                disabled={busy}
                                onClick={() => {
                                  setOpenFilesId(null);
                                  setOpenMenuId((cur) => (cur === r.id ? null : r.id));
                                }}
                              >
                                More ▾
                              </button>

                              {openMenuId === r.id ? (
                                <div className="fr-menu" onClick={(e) => e.stopPropagation()}>
                                  {r.contractUrl ? (
                                    <>
                                      <button
                                        className="fr-menuItem"
                                        disabled={busy}
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          window.open(r.contractUrl, "_blank", "noopener,noreferrer");
                                        }}
                                      >
                                        Open signing link
                                      </button>
                                      <button
                                        className="fr-menuItem"
                                        disabled={busy}
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          copyToClipboard(r.contractUrl);
                                        }}
                                      >
                                        Copy signing link
                                      </button>
                                      <div className="fr-menuSep" />
                                    </>
                                  ) : null}

                                  <button
                                    className="fr-menuItem"
                                    disabled={busy}
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      runAction(r.id, () => adminFranchiseApi.getContractStatus(r.id));
                                    }}
                                  >
                                    Refresh status
                                  </button>

                                  {SHOW_DEV_ACTIONS ? (
                                    <>
                                      <div className="fr-menuSep" />
                                      <button
                                        className={`fr-menuItem ${!canSimulateViewed(r) ? "disabled" : ""}`}
                                        disabled={busy || !canSimulateViewed(r)}
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          runAction(r.id, () => adminFranchiseApi.simulateEvent(r.id, "viewed"));
                                        }}
                                      >
                                        Simulate: viewed
                                      </button>
                                      <button
                                        className={`fr-menuItem ${!canSimulateOwnerSigned(r) ? "disabled" : ""}`}
                                        disabled={busy || !canSimulateOwnerSigned(r)}
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          runAction(r.id, () => adminFranchiseApi.simulateEvent(r.id, "owner_signed"));
                                        }}
                                      >
                                        Simulate: owner signed
                                      </button>
                                    </>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>

                            {isCompleted(r) ? <span className="fr-done">✅ Completed</span> : null}
                          </div>
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


      {details.open ? (
        <div className="fr-modalOverlay" onClick={closeDetails}>
          <div className="fr-modal fr-modalWide" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const r = rows.find((x) => x.id === details.id);
              if (!r) return <div className="fr-empty">Not found.</div>;

              return (
                <>
                  <div className="fr-modalTitle">Franchise Request #{r.id}</div>

                  <div className="fr-detailGrid">
                    <div className="fr-detailCard">
                      <div className="fr-detailLabel">Business</div>
                      <div className="fr-detailValue">{r.businessName || "-"}</div>
                      <div className="fr-detailMuted">{r.location || "-"}</div>
                    </div>

                    <div className="fr-detailCard">
                      <div className="fr-detailLabel">Contact</div>
                      <div className="fr-detailValue">{r.contactPerson || "-"}</div>
                      <div className="fr-detailMuted">{r.contactEmail || "-"}</div>
                    </div>

                    <div className="fr-detailCard">
                      <div className="fr-detailLabel">Investment</div>
                      <div className="fr-detailValue fr-mono">{formatMoney(r.investmentAmount)}</div>
                      <div className="fr-detailMuted">Created: {r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</div>
                    </div>

                    <div className="fr-detailCard">
                      <div className="fr-detailLabel">Contract</div>
                      <div className="fr-detailValue">{CONTRACT_LABEL[r.contractStatus] || r.contractStatus}</div>
                      <div className="fr-detailMuted">Gym: {r.gymId ? `#${r.gymId}` : "-"}</div>
                    </div>
                  </div>

                  {r.contractUrl ? (
                    <div className="fr-detailLink">
                      <div className="fr-muted" style={{ marginBottom: 6 }}>
                        Signing link
                      </div>
                      <div className="fr-linkRow">
                        <div className="fr-linkText fr-mono">{r.contractUrl}</div>
                        <button className="fr-btn fr-btn-ghost" onClick={() => copyToClipboard(r.contractUrl)}>
                          Copy
                        </button>
                        <button
                          className="fr-btn fr-btn-secondary"
                          onClick={() => window.open(r.contractUrl, "_blank", "noopener,noreferrer")}
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="fr-modalActions">
                    <div className="fr-btnRow">
                      {SHOW_DEV_ACTIONS ? (
                        <button
                          className="fr-btn fr-btn-secondary"
                          onClick={() =>
                            runAction(
                              r.id,
                              async () => {
                                // Reset contract state then re-issue invite (so PDF is regenerated with latest VN template)
                                await adminFranchiseApi.simulateEvent(r.id, "reset");
                                return adminFranchiseApi.sendContract(r.id);
                              },
                              {
                                confirmText: "Re-issue contract (RESET + Send Invite)? Owner will need to sign again.",
                              }
                            )
                          }
                        >
                          Re-issue (VN)
                        </button>
                      ) : null}

                      {canSendContract(r) ? (
                        <button
                          className="fr-btn fr-btn-primary"
                          onClick={() =>
                            runAction(r.id, () => adminFranchiseApi.sendContract(r.id), {
                              confirmText: "Send signing invite to owner?",
                            })
                          }
                        >
                          Send Invite
                        </button>
                      ) : null}

                      {canResend(r) ? (
                        <button
                          className="fr-btn fr-btn-secondary"
                          onClick={() =>
                            runAction(r.id, () => adminFranchiseApi.resendInvite(r.id), {
                              confirmText: "Resend signing invite (new link)?",
                            })
                          }
                        >
                          Resend
                        </button>
                      ) : null}

                      {canCountersign(r) ? (
                        <button className="fr-btn fr-btn-warning" onClick={() => openSignModal(r.id)}>
                          Countersign
                        </button>
                      ) : null}

                      <button className="fr-btn fr-btn-ghost" onClick={() => downloadDoc(r.id, "original")}>
                        Download Original
                      </button>

                      <button className="fr-btn fr-btn-ghost" onClick={closeDetails}>
                        Close
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}
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

      {signModal.open ? (
        <div className="fr-modalOverlay" onClick={closeSignModal}>
          <div className="fr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fr-modalTitle">Admin Countersign</div>

            <div className="fr-muted" style={{ marginBottom: 10 }}>
              Draw admin signature to embed into PDF and complete the contract.
            </div>

            <label className="fr-muted" style={{ display: "block", marginBottom: 6 }}>
              Signer name
            </label>
            <input
              className="fr-input"
              value={signModal.signerName}
              onChange={(e) => setSignModal((m) => ({ ...m, signerName: e.target.value }))}
              placeholder="Admin"
            />

            <div style={{ height: 10 }} />

            <SignaturePad ref={signPadRef} />

            <div className="fr-btnRow" style={{ marginTop: 12, justifyContent: "flex-end" }}>
              <button className="fr-btn fr-btn-ghost" onClick={() => signPadRef.current?.clear?.()}>
                Clear
              </button>
              <button className="fr-btn fr-btn-ghost" onClick={closeSignModal}>
                Cancel
              </button>
              <button className="fr-btn fr-btn-warning" onClick={submitCountersign} disabled={busyId !== null}>
                Countersign & Complete
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}


// ===== Signature Pad (no external libs) =====
function contractStepIndex(status) {
  const s = String(status || "not_sent");
  const map = { not_sent: 0, sent: 1, viewed: 2, signed: 3, completed: 4 };
  if (s === "void") return -1;
  return map[s] ?? 0;
}

function ContractStepper({ status }) {
  const idx = contractStepIndex(status);
  const steps = ["Draft", "Sent", "Viewed", "Signed", "Completed"];

  if (String(status) === "void") {
    return <div className="fr-stepperVoid">Voided</div>;
  }

  return (
    <div className="fr-stepper" title={`Contract status: ${String(status || "-")}`}> 
      {steps.map((label, i) => (
        <div key={label} className={`fr-step ${i <= idx ? "active" : ""}`}>
          <span className="fr-dot" />
          <span className="fr-stepLabel">{label}</span>
          {i < steps.length - 1 ? <span className={`fr-line ${i < idx ? "active" : ""}`} /> : null}
        </div>
      ))}
    </div>
  );
}

const SignaturePad = React.forwardRef(function SignaturePad(_, ref) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const pts = useRef([]);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  function getCtx() {
    const c = canvasRef.current;
    if (!c) return null;
    if (!ctxRef.current) ctxRef.current = c.getContext("2d");
    return ctxRef.current;
  }

  function setupCtx() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = getCtx();
    if (!ctx) return;

    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sizeRef.current = { w: rect.width, h: rect.height, dpr };

    c.width = Math.max(1, Math.floor(rect.width * dpr));
    c.height = Math.max(1, Math.floor(rect.height * dpr));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,0.95)";
    ctx.lineWidth = 3.4;
  }

  function resizeCanvas() {
    setupCtx();
  }

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  function posFromEvent(e) {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : null;
    const clientX = t ? t.clientX : e.clientX;
    const clientY = t ? t.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top, t: Date.now() };
  }

  function mid(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function drawSmooth() {
    const ctx = getCtx();
    if (!ctx) return;
    const p = pts.current;
    if (p.length < 2) return;

    const last = p[p.length - 1];
    const prev = p[p.length - 2];
    const dt = Math.max(1, (last.t || 0) - (prev.t || 0));
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const v = dist / dt;
    const w = Math.max(2.6, Math.min(4.6, 4.4 - v * 6));
    ctx.lineWidth = w;

    if (p.length === 2) {
      ctx.beginPath();
      ctx.moveTo(p[0].x, p[0].y);
      ctx.lineTo(p[1].x, p[1].y);
      ctx.stroke();
      return;
    }

    const p0 = p[p.length - 3];
    const p1 = p[p.length - 2];
    const p2 = p[p.length - 1];
    const m1 = mid(p0, p1);
    const m2 = mid(p1, p2);

    ctx.beginPath();
    ctx.moveTo(m1.x, m1.y);
    ctx.quadraticCurveTo(p1.x, p1.y, m2.x, m2.y);
    ctx.stroke();
  }

  function start(e) {
    e.preventDefault();
    drawing.current = true;
    pts.current = [];
    const p = posFromEvent(e);
    pts.current.push(p);

    const ctx = getCtx();
    if (ctx) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.95)";
      ctx.fill();
    }
  }

  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const p = posFromEvent(e);
    const prev = pts.current[pts.current.length - 1];
    if (prev) {
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      if (dx * dx + dy * dy < 0.5) return;
    }
    pts.current.push(p);
    drawSmooth();
  }

  function end(e) {
    e.preventDefault();
    drawing.current = false;
    pts.current = [];
  }

  function clear() {
    const ctx = getCtx();
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    ctx.clearRect(0, 0, w, h);
  }

  function exportPngDataUrl() {
    const c = canvasRef.current;
    if (!c) return null;

    const ctx = c.getContext("2d");
    const img = ctx.getImageData(0, 0, c.width, c.height).data;
    let nonEmpty = false;
    for (let i = 3; i < img.length; i += 4) {
      if (img[i] !== 0) {
        nonEmpty = true;
        break;
      }
    }
    if (!nonEmpty) return null;

    // force solid black pixels
    const off = document.createElement("canvas");
    off.width = c.width;
    off.height = c.height;
    const octx = off.getContext("2d");
    octx.drawImage(c, 0, 0);

    const data = octx.getImageData(0, 0, off.width, off.height);
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a !== 0) {
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
        if (a < 250) d[i + 3] = 255;
      }
    }
    octx.putImageData(data, 0, 0);

    return off.toDataURL("image/png");
  }

  React.useImperativeHandle(ref, () => ({ clear, exportPngDataUrl }));

  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.15)", overflow: "hidden", background: "#fff" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: 170, display: "block", touchAction: "none" }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
    </div>
  );
});
