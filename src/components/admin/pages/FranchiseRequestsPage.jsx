import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminFranchiseApi } from "../../../services/adminFranchiseApi";
import { franchiseSigningHref } from "../../../utils/franchiseSigning";
import { FRANCHISE_CONTRACT_STATUS_LABEL as CONTRACT_LABEL } from "../../../utils/franchiseContractLabels";
import useAdminRealtimeRefresh from "../../../hooks/useAdminRealtimeRefresh";
import "./FranchiseRequestsPage.css";

const STATUS_LABEL = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối" };

const SHOW_DEV_ACTIONS = false;

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

function buildDecisionMessage(r) {
  if (!r) return "-";
  const note = String(r.rejectionReason || r.reviewNotes || "").trim();
  if (r.status === "approved") {
    return note
      ? `Yêu cầu nhượng quyền #${r.id} đã được duyệt. Ghi chú admin: ${note}`
      : `Yêu cầu nhượng quyền #${r.id} đã được duyệt. Bước tiếp theo: ký hợp đồng nhượng quyền.`;
  }
  if (r.status === "rejected") {
    return note
      ? `Yêu cầu nhượng quyền #${r.id} bị từ chối. Lý do: ${note}`
      : `Yêu cầu nhượng quyền #${r.id} bị từ chối.`;
  }
  return "-";
}

export default function FranchiseRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [detailRowOverride, setDetailRowOverride] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const [actionMenuId, setActionMenuId] = useState(null);
  const [details, setDetails] = useState({ open: false, id: null });

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const qDebounceInit = useRef(true);
  const [status, setStatus] = useState("all");
  const [contractStatus, setContractStatus] = useState("all");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [meta, setMeta] = useState({ totalItems: 0, totalPages: 1 });

  const [modal, setModal] = useState({ open: false, type: "", id: null, text: "" });
  const [signModal, setSignModal] = useState({ open: false, id: null, signerName: "Admin" });
  const [confirmModal, setConfirmModal] = useState({ open: false, title: "", message: "", detail: "", confirmLabel: "Xác nhận" });
  const confirmResolverRef = useRef(null);
  const signPadRef = useRef(null);


  const loadFranchises = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page,
        limit: pageSize,
        ...(status !== "all" ? { status } : {}),
        ...(contractStatus !== "all" ? { contractStatus } : {}),
        ...(q.trim() ? { q: q.trim() } : {}),
      };
      const res = await adminFranchiseApi.list(params);
      const payload = res.data;
      const data = sortRowsStable(normalizeListResponse(payload));
      setRows(data);
      const m = payload?.meta;
      const total = Number(m?.totalItems);
      const pages = Number(m?.totalPages);
      setMeta({
        totalItems: Number.isFinite(total) ? total : data.length,
        totalPages: Number.isFinite(pages) && pages > 0 ? pages : 1,
      });
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || "Tải dữ liệu thất bại");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, contractStatus, q]);

  useEffect(() => {
    if (qDebounceInit.current) {
      qDebounceInit.current = false;
      return undefined;
    }
    const t = setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    loadFranchises();
  }, [loadFranchises]);

  useAdminRealtimeRefresh({
    onRefresh: loadFranchises,
    events: ["notification:new", "franchise:changed"],
    notificationTypes: ["admin_franchise_request_submitted", "franchise"],
  });

  useEffect(() => {
    if (loading) return;
    const tp = Math.max(1, meta.totalPages || 1);
    if (page > tp) setPage(tp);
  }, [loading, page, meta.totalPages]);

  useLayoutEffect(() => {
    const h = Number(searchParams.get("highlight"));
    if (!Number.isFinite(h) || h <= 0) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFranchiseApi.detail(h);
        const r = res.data?.data ?? res.data;
        if (!cancelled && r?.id) {
          setDetailRowOverride(r);
          setDetails({ open: true, id: r.id });
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setSearchParams({}, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (actionMenuId === null) return undefined;

    const onClickOutside = () => setActionMenuId(null);
    const onKeyDown = (e) => {
      if (e.key === "Escape") setActionMenuId(null);
    };

    document.addEventListener("click", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [actionMenuId]);


  function askEnterpriseConfirm(opts = {}) {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmModal({
        open: true,
        title: opts.title || "Xác nhận thao tác",
        message: opts.message || opts.confirmText || "Bạn có chắc chắn muốn tiếp tục?",
        detail: opts.detail || "",
        confirmLabel: opts.confirmLabel || "Xác nhận",
      });
    });
  }

  function closeEnterpriseConfirm(ok) {
    const resolver = confirmResolverRef.current;
    confirmResolverRef.current = null;
    setConfirmModal({ open: false, title: "", message: "", detail: "", confirmLabel: "Xác nhận" });
    resolver?.(Boolean(ok));
  }

  async function runAction(id, fn, opts = {}) {
    setBusyId(id);
    setError("");
    try {
      if (opts?.confirmText || opts?.message) {
        const ok = await askEnterpriseConfirm(opts);
        if (!ok) return;
      }
      await fn();
      await loadFranchises();
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || "Thao tác thất bại");
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
    setDetailRowOverride(null);
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
        setError("Vui lòng nhập lý do từ chối");
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
      alert(e?.response?.data?.message || e?.message || "Tải xuống thất bại");
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
      alert("Vui lòng ký tay chữ ký quản trị viên trước.");
      return;
    }

    await runAction(
      id,
      () => adminFranchiseApi.countersign(id, { signerName: signModal.signerName, signatureDataUrl }),
      {
        title: "Hoàn tất đối chiếu hợp đồng",
        confirmText: "Xác nhận ký đối chiếu và hoàn tất?",
        detail: "Hệ thống sẽ tạo phòng gym, khóa bản PDF cuối và phát hành chứng nhận hoàn tất cho đối tác.",
        confirmLabel: "Ký đối chiếu & hoàn tất",
      }
    );

    closeSignModal();
  }

  const totalPages = Math.max(1, meta.totalPages || 1);
  const fromIdx = meta.totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const toIdx = Math.min(page * pageSize, meta.totalItems);

  return (
    <div className="fr-page fr-page--enterprise">
      <div className="fr-header">
        <div>
          <div className="fr-title">Yêu cầu nhượng quyền</div>
          <div className="fr-subtitle">
            Duyệt → Gửi lời mời (email) → Đã xem → Chủ ký → Quản trị đối chiếu → Hoàn tất → Tạo phòng gym
          </div>
        </div>

        <div className="fr-actions">
          <button className="fr-btn fr-btn-ghost" type="button" onClick={() => loadFranchises()} disabled={loading}>
            Làm mới
          </button>
        </div>
      </div>

      <div className="fr-summary">
        <div className="fr-summary__item">
          <span className="fr-summary__label">Tổng bản ghi</span>
          <span className="fr-summary__value">{meta.totalItems.toLocaleString("vi-VN")}</span>
        </div>
        <div className="fr-summary__item">
          <span className="fr-summary__label">Trang hiển thị</span>
          <span className="fr-summary__value">
            {meta.totalItems === 0 ? "0" : `${fromIdx}–${toIdx}`}
          </span>
        </div>
      </div>

      <div className="fr-toolbar fr-toolbar--enterprise">
        <div className="fr-search">
          <label className="fr-fieldLabel" htmlFor="fr-search-q">
            Tìm kiếm
          </label>
          <input
            id="fr-search-q"
            className="fr-input"
            placeholder="Doanh nghiệp, địa điểm, liên hệ, URL hợp đồng…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            autoComplete="off"
          />
          <div className="fr-fieldHint">Có hiệu lực sau khi gõ xong (~0,4s)</div>
        </div>

        <div className="fr-toolbar__right">
          <div className="fr-field">
            <label className="fr-fieldLabel" htmlFor="fr-filter-status">
              Trạng thái duyệt
            </label>
            <select
              id="fr-filter-status"
              className="fr-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>

          <div className="fr-field">
            <label className="fr-fieldLabel" htmlFor="fr-filter-contract">
              Hợp đồng
            </label>
            <select
              id="fr-filter-contract"
              className="fr-select"
              value={contractStatus}
              onChange={(e) => {
                setContractStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Tất cả</option>
              <option value="not_sent">Bản nháp</option>
              <option value="sent">Đã gửi</option>
              <option value="viewed">Đã xem</option>
              <option value="signed">Đã ký</option>
              <option value="completed">Hoàn tất</option>
              <option value="void">Vô hiệu</option>
            </select>
          </div>

          <div className="fr-field fr-field--narrow">
            <label className="fr-fieldLabel" htmlFor="fr-page-size">
              / trang
            </label>
            <select
              id="fr-page-size"
              className="fr-select"
              value={String(pageSize)}
              disabled
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value="5">5</option>
            </select>
          </div>
        </div>
      </div>

      {error ? <div className="fr-alert">{error}</div> : null}

      <div className="fr-card fr-card--enterprise">
        {loading ? (
          <div className="fr-empty fr-empty--loading">Đang tải dữ liệu…</div>
        ) : rows.length === 0 ? (
          <div className="fr-empty">Không có yêu cầu phù hợp bộ lọc.</div>
        ) : (
          <>
            <div className="fr-tableWrap">
            <table className="fr-table fr-table--enterprise">
              <thead>
                <tr>
                  <th className="fr-th--id">Mã</th>
                  <th>Doanh nghiệp</th>
                  <th className="fr-th--hideSm">Địa điểm</th>
                  <th>Liên hệ</th>
                  <th className="fr-th--num">Đầu tư</th>
                  <th className="fr-th--status">Trạng thái</th>
                  <th className="fr-th--contract">Hợp đồng</th>
                  <th className="fr-th--gym">Gym</th>
                  <th className="fr-th--actions">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => {
                  const busy = busyId === r.id;

                  return (
                    <tr key={r.id} className={busy ? "fr-rowBusy" : ""}>
                      <td className="fr-mono">#{r.id}</td>

                      <td>
                        <div className="fr-main">{r.businessName || "-"}</div>
                        <div className="fr-muted">{r.businessPlan || ""}</div>
                      </td>

                      <td className="fr-td--hideSm">{r.location || "-"}</td>

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
                              {r.contractUrl ? "Đã có liên kết" : "Chưa có liên kết"}
                            </span>
                          </div>

                          <ContractStepper compact status={r.contractStatus} />

                          {r.status === "approved" && (r.contractStatus === "sent" || r.contractStatus === "viewed") ? (
                            <div className="fr-muted">Đang chờ chủ phòng ký…</div>
                          ) : null}
                        </div>
                      </td>

                      <td>{r.gymId ? <span className="fr-mono">#{r.gymId}</span> : "-"}</td>

                      <td>
                        <div className="fr-actionsCell" onClick={(e) => e.stopPropagation()}>
                          <div className="fr-btnRow fr-btnRow--enterprise">
                            {canApprove(r) ? (
                              <>
                                <button
                                  type="button"
                                  className="fr-btn fr-btn-primary fr-btn--sm"
                                  disabled={busy}
                                  onClick={() => openModal("approve", r.id)}
                                >
                                  Duyệt
                                </button>
                                <button
                                  type="button"
                                  className="fr-btn fr-btn-danger fr-btn--sm"
                                  disabled={busy}
                                  onClick={() => openModal("reject", r.id)}
                                >
                                  Từ chối
                                </button>
                              </>
                            ) : (
                              <>
                                {canSendContract(r) ? (
                                  <button
                                    type="button"
                                    className="fr-btn fr-btn-primary fr-btn--sm"
                                    disabled={busy}
                                    onClick={() =>
                                      runAction(r.id, () => adminFranchiseApi.sendContract(r.id), {
                                        confirmText: "Gửi lời mời ký hợp đồng tới chủ phòng?",
                                      })
                                    }
                                  >
                                    Gửi lời mời
                                  </button>
                                ) : canCountersign(r) ? (
                                  <button
                                    type="button"
                                    className="fr-btn fr-btn-warning fr-btn--sm"
                                    disabled={busy}
                                    onClick={() => openSignModal(r.id)}
                                  >
                                    Ký đối chiếu
                                  </button>
                                ) : canResend(r) ? (
                                  <button
                                    type="button"
                                    className="fr-btn fr-btn-secondary fr-btn--sm"
                                    disabled={busy}
                                    onClick={() =>
                                      runAction(r.id, () => adminFranchiseApi.resendInvite(r.id), {
                                        confirmText: "Gửi lại lời mời (liên kết mới)?",
                                      })
                                    }
                                  >
                                    Gửi lại
                                  </button>
                                ) : (
                                  <button type="button" className="fr-btn fr-btn-ghost fr-btn--sm" disabled>
                                    —
                                  </button>
                                )}
                              </>
                            )}

                            <button
                              type="button"
                              className="fr-btn fr-btn-ghost fr-btn--sm"
                              disabled={busy}
                              onClick={() => openDetails(r.id)}
                            >
                              Chi tiết
                            </button>

                            {isCompleted(r) ? <span className="fr-done fr-done--inline">Hoàn tất</span> : null}

                            <div className="fr-menuWrap" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="fr-btn fr-btn-ghost fr-menuBtn fr-btn--sm"
                                disabled={busy}
                                onClick={() => setActionMenuId((cur) => (cur === r.id ? null : r.id))}
                              >
                                Menu ▾
                              </button>

                              {actionMenuId === r.id ? (
                                <div className="fr-menu fr-menu--wide" onClick={(e) => e.stopPropagation()}>
                                  <div className="fr-menuHeading">Tệp PDF</div>
                                  <button
                                    type="button"
                                    className="fr-menuItem"
                                    disabled={busy}
                                    onClick={() => {
                                      setActionMenuId(null);
                                      downloadDoc(r.id, "original");
                                    }}
                                  >
                                    Tải PDF gốc
                                  </button>
                                  <button
                                    type="button"
                                    className={`fr-menuItem ${
                                      !(r.contractStatus === "signed" || r.contractStatus === "completed")
                                        ? "disabled"
                                        : ""
                                    }`}
                                    disabled={busy || !(r.contractStatus === "signed" || r.contractStatus === "completed")}
                                    onClick={() => {
                                      setActionMenuId(null);
                                      downloadDoc(r.id, "owner_signed");
                                    }}
                                  >
                                    Tải PDF đã ký (chủ phòng)
                                  </button>
                                  <button
                                    type="button"
                                    className={`fr-menuItem ${r.contractStatus !== "completed" ? "disabled" : ""}`}
                                    disabled={busy || r.contractStatus !== "completed"}
                                    onClick={() => {
                                      setActionMenuId(null);
                                      downloadDoc(r.id, "final");
                                    }}
                                  >
                                    Tải PDF bản chính thức
                                  </button>
                                  <button
                                    type="button"
                                    className={`fr-menuItem ${r.contractStatus !== "completed" ? "disabled" : ""}`}
                                    disabled={busy || r.contractStatus !== "completed"}
                                    onClick={() => {
                                      setActionMenuId(null);
                                      downloadDoc(r.id, "certificate");
                                    }}
                                  >
                                    Tải chứng nhận
                                  </button>

                                  <div className="fr-menuHeading">Liên kết &amp; hệ thống</div>
                                  {r.contractUrl ? (
                                    <>
                                      <button
                                        type="button"
                                        className="fr-menuItem"
                                        disabled={busy}
                                        onClick={() => {
                                          setActionMenuId(null);
                                          window.open(franchiseSigningHref(r.contractUrl), "_blank", "noopener,noreferrer");
                                        }}
                                      >
                                        Mở liên kết ký
                                      </button>
                                      <button
                                        type="button"
                                        className="fr-menuItem"
                                        disabled={busy}
                                        onClick={() => {
                                          setActionMenuId(null);
                                          copyToClipboard(franchiseSigningHref(r.contractUrl));
                                        }}
                                      >
                                        Sao chép liên kết ký
                                      </button>
                                    </>
                                  ) : null}
                                  <button
                                    type="button"
                                    className="fr-menuItem"
                                    disabled={busy}
                                    onClick={() => {
                                      setActionMenuId(null);
                                      runAction(r.id, () => adminFranchiseApi.getContractStatus(r.id));
                                    }}
                                  >
                                    Làm mới trạng thái
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>

            <footer className="fr-paginationBar" aria-label="Phân trang">
              <div className="fr-paginationBar__info">
                Trang <strong>{page}</strong> / {totalPages}
                <span className="fr-paginationBar__dot">·</span>
                {meta.totalItems.toLocaleString("vi-VN")} bản ghi
              </div>
              <div className="fr-paginationBar__nav">
                <button
                  type="button"
                  className="fr-btn fr-btn-ghost fr-btn--sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(1)}
                >
                  « Đầu
                </button>
                <button
                  type="button"
                  className="fr-btn fr-btn-ghost fr-btn--sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ‹ Trước
                </button>
                <button
                  type="button"
                  className="fr-btn fr-btn-ghost fr-btn--sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Sau ›
                </button>
                <button
                  type="button"
                  className="fr-btn fr-btn-ghost fr-btn--sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage(totalPages)}
                >
                  Cuối »
                </button>
              </div>
            </footer>
          </>
        )}
      </div>


      {details.open ? (
        <div className="fr-modalOverlay" onClick={closeDetails}>
          <div className="fr-modal fr-modalWide" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const r =
                rows.find((x) => x.id === details.id) ||
                (detailRowOverride && detailRowOverride.id === details.id ? detailRowOverride : null);
              if (!r) return <div className="fr-empty">Không tìm thấy.</div>;

              return (
                <>
                  <div className="fr-modalTitle">Yêu cầu nhượng quyền #{r.id}</div>

                  <div className="fr-detailGrid">
                    <div className="fr-detailCard">
                      <div className="fr-detailLabel">Doanh nghiệp</div>
                      <div className="fr-detailValue">{r.businessName || "-"}</div>
                      <div className="fr-detailMuted">{r.location || "-"}</div>
                    </div>

                    <div className="fr-detailCard">
                      <div className="fr-detailLabel">Liên hệ</div>
                      <div className="fr-detailValue">{r.contactPerson || "-"}</div>
                      <div className="fr-detailMuted">{r.contactEmail || "-"}</div>
                    </div>

                    <div className="fr-detailCard">
                      <div className="fr-detailLabel">Đầu tư</div>
                      <div className="fr-detailValue fr-mono">{formatMoney(r.investmentAmount)}</div>
                      <div className="fr-detailMuted">Tạo lúc: {r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</div>
                    </div>

                    <div className="fr-detailCard">
                      <div className="fr-detailLabel">Hợp đồng</div>
                      <div className="fr-detailValue">{CONTRACT_LABEL[r.contractStatus] || r.contractStatus}</div>
                      <div className="fr-detailMuted">Phòng gym: {r.gymId ? `#${r.gymId}` : "-"}</div>
                    </div>
                  </div>

                  {r.contractUrl ? (
                    <div className="fr-detailLink">
                      <div className="fr-muted" style={{ marginBottom: 6 }}>
                        Liên kết ký
                      </div>
                      <div className="fr-linkRow">
                        <div className="fr-linkText fr-mono">{franchiseSigningHref(r.contractUrl)}</div>
                        <button className="fr-btn fr-btn-ghost" onClick={() => copyToClipboard(franchiseSigningHref(r.contractUrl))}>
                          Sao chép
                        </button>
                        <button
                          className="fr-btn fr-btn-secondary"
                          onClick={() => window.open(franchiseSigningHref(r.contractUrl), "_blank", "noopener,noreferrer")}
                        >
                          Mở
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {(r.status === "approved" || r.status === "rejected") ? (
                    <div className="fr-detailLink">
                      <div className="fr-muted" style={{ marginBottom: 6 }}>Phản hồi xử lý</div>
                      <div className="fr-detailGrid">
                        <div className="fr-detailCard">
                          <div className="fr-detailLabel">Lý do / ghi chú</div>
                          <div className="fr-detailValue">{r.rejectionReason || r.reviewNotes || "-"}</div>
                          <div className="fr-detailMuted">Người xử lý: {r.reviewer?.username || r.reviewer?.email || "-"}</div>
                        </div>
                        <div className="fr-detailCard">
                          <div className="fr-detailLabel">Tin nhắn đã gửi owner</div>
                          <div className="fr-detailValue">{buildDecisionMessage(r)}</div>
                          <div className="fr-detailMuted">Trạng thái: {STATUS_LABEL[r.status] || r.status}</div>
                        </div>
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
                                confirmText:
                                  "Phát hành lại hợp đồng (đặt lại + gửi lời mời)? Chủ phòng cần ký lại.",
                              }
                            )
                          }
                        >
                          Phát hành lại (VN)
                        </button>
                      ) : null}

                      {canSendContract(r) ? (
                        <button
                          className="fr-btn fr-btn-primary"
                          onClick={() =>
                            runAction(r.id, () => adminFranchiseApi.sendContract(r.id), {
                              confirmText: "Gửi lời mời ký hợp đồng tới chủ phòng?",
                            })
                          }
                        >
                          Gửi lời mời
                        </button>
                      ) : null}

                      {canResend(r) ? (
                        <button
                          className="fr-btn fr-btn-secondary"
                          onClick={() =>
                            runAction(r.id, () => adminFranchiseApi.resendInvite(r.id), {
                              confirmText: "Gửi lại lời mời (liên kết mới)?",
                            })
                          }
                        >
                          Gửi lại
                        </button>
                      ) : null}

                      {canCountersign(r) ? (
                        <button className="fr-btn fr-btn-warning" onClick={() => openSignModal(r.id)}>
                          Ký đối chiếu
                        </button>
                      ) : null}

                      <button className="fr-btn fr-btn-ghost" onClick={() => downloadDoc(r.id, "original")}>
                        Tải bản gốc
                      </button>

                      <button className="fr-btn fr-btn-ghost" onClick={closeDetails}>
                        Đóng
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
              {modal.type === "approve" ? "Duyệt yêu cầu" : "Từ chối yêu cầu"}
            </div>

            <textarea
              className="fr-textarea"
              rows={5}
              placeholder={
                modal.type === "approve"
                  ? "Ghi chú duyệt (không bắt buộc)..."
                  : "Lý do từ chối (bắt buộc)..."
              }
              value={modal.text}
              onChange={(e) => setModal((m) => ({ ...m, text: e.target.value }))}
            />

            <div className="fr-modalActions">
              <button className="fr-btn fr-btn-ghost" onClick={closeModal} disabled={busyId !== null}>
                Hủy
              </button>

              <button className="fr-btn fr-btn-primary" onClick={submitModal} disabled={busyId !== null}>
                Gửi
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmModal.open ? (
        <div className="fr-confirmBackdrop" role="presentation" onMouseDown={() => closeEnterpriseConfirm(false)}>
          <div className="fr-confirmCard" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="fr-confirmIcon">✓</div>
            <div className="fr-confirmContent">
              <div className="fr-confirmEyebrow">GFMS Enterprise Workflow</div>
              <h3>{confirmModal.title}</h3>
              <p>{confirmModal.message}</p>
              {confirmModal.detail ? <div className="fr-confirmDetail">{confirmModal.detail}</div> : null}
            </div>
            <div className="fr-confirmActions">
              <button className="fr-btn fr-btn-ghost" type="button" onClick={() => closeEnterpriseConfirm(false)}>
                Hủy
              </button>
              <button className="fr-btn fr-btn-warning" type="button" onClick={() => closeEnterpriseConfirm(true)}>
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {signModal.open ? (
        <div className="fr-modalOverlay" onClick={closeSignModal}>
          <div className="fr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fr-modalTitle">Ký đối chiếu (quản trị)</div>

            <div className="fr-muted" style={{ marginBottom: 10 }}>
              Ký tay để nhúng vào PDF và hoàn tất hợp đồng.
            </div>

            <label className="fr-muted" style={{ display: "block", marginBottom: 6 }}>
              Tên người ký
            </label>
            <input
              className="fr-input"
              value={signModal.signerName}
              onChange={(e) => setSignModal((m) => ({ ...m, signerName: e.target.value }))}
              placeholder="Quản trị viên"
            />

            <div style={{ height: 10 }} />

            <SignaturePad ref={signPadRef} />

            <div className="fr-btnRow" style={{ marginTop: 12, justifyContent: "flex-end" }}>
              <button className="fr-btn fr-btn-ghost" onClick={() => signPadRef.current?.clear?.()}>
                Xóa nét
              </button>
              <button className="fr-btn fr-btn-ghost" onClick={closeSignModal}>
                Hủy
              </button>
              <button className="fr-btn fr-btn-warning" onClick={submitCountersign} disabled={busyId !== null}>
                Ký đối chiếu & hoàn tất
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

function ContractStepper({ status, compact }) {
  const idx = contractStepIndex(status);
  const steps = ["Nháp", "Đã gửi", "Đã xem", "Đã ký", "Hoàn tất"];

  if (String(status) === "void") {
    return <div className="fr-stepperVoid">Đã vô hiệu</div>;
  }

  return (
    <div
      className={`fr-stepper ${compact ? "fr-stepper--compact" : ""}`}
      title={`Trạng thái hợp đồng: ${String(status || "-")}`}
    >
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
