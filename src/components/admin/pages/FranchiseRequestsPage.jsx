import React, { useEffect, useState } from "react";
import "./FranchiseRequestsPage.css";
import {
  admGetFranchiseRequests,
  admGetFranchiseRequestDetail,
  admApproveFranchiseRequest,
  admRejectFranchiseRequest,
} from "../../../services/adminAdminCoreService";

export default function FranchiseRequestsPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ status: "", q: "" });
  const [page, setPage] = useState(1);
  const limit = 10;

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [modal, setModal] = useState({ open: false, type: "", payload: {} });

  const fmtDateTime = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  };

  const renderUser = (u) => {
    if (!u) return "-";
    return u.username || u.email || `#${u.id}`;
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await admGetFranchiseRequests({ ...filters, page, limit });
      setRows(res?.data?.data || []);
      setMeta(res?.data?.meta || { page, limit, totalItems: 0, totalPages: 1 });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id) => {
    setLoading(true);
    try {
      const res = await admGetFranchiseRequestDetail(id);
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
  }, [page]);

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
    // eslint-disable-next-line
  }, [selectedId]);

  const openReject = () => setModal({ open: true, type: "reject", payload: { reviewNotes: "" } });
  const closeModal = () => setModal({ open: false, type: "", payload: {} });

  const doApprove = async () => {
    if (!window.confirm("Duyệt yêu cầu nhượng quyền này và tạo Gym mới?")) return;
    try {
      await admApproveFranchiseRequest(selectedId);
      await fetchDetail(selectedId);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const doReject = async () => {
    try {
      await admRejectFranchiseRequest(selectedId, modal.payload);
      closeModal();
      setSelectedId(null);
      setDetail(null);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  return (
    <div className="fr-page">
      <div className="fr-head">
        <div>
          <div className="fr-title">Yêu cầu nhượng quyền</div>
          <div className="fr-sub">Admin duyệt / từ chối, tạo Gym khi approve (module 3)</div>
        </div>
        <div className="fr-badge">{loading ? "Đang tải..." : "Module 3"}</div>
      </div>

      <div className="fr-filters">
        <div className="fr-field">
          <label>Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
          >
            <option value="">Tất cả</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="fr-field fr-field--grow">
          <label>Search</label>
          <input
            value={filters.q}
            onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
            placeholder="businessName / location / contact..."
          />
        </div>

        <button
          className="fr-btn fr-btn--primary"
          onClick={() => {
            setPage(1);
            fetchList();
          }}
        >
          Lọc
        </button>
      </div>

      <div className="fr-grid">
        {/* LIST */}
        <div className="fr-card">
          <div className="fr-card__head">
            <div className="fr-card__title">Danh sách</div>
            <div className="fr-card__meta">
              Tổng: <b>{meta.totalItems}</b>
            </div>
          </div>

          <div className="fr-table-wrap">
            <table className="fr-table fr-table--compact">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>ID</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th style={{ width: 130 }}>Contract</th>
                  <th>Business</th>
                  <th style={{ width: 120 }}>Location</th>
                  <th style={{ width: 160 }}>Requester</th>
                  <th style={{ width: 190 }}>Created</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={selectedId === r.id ? "is-active" : ""}
                    onClick={() => setSelectedId(r.id)}
                    title="Click để xem chi tiết"
                  >
                    <td>#{r.id}</td>
                    <td>
                      <span className={`fr-pill fr-pill--${r.status}`}>{r.status}</span>
                    </td>
                    <td>
                      {r.contractSigned ? (
                        <span className="fr-pill fr-pill--signed">signed</span>
                      ) : (
                        <span className="fr-pill fr-pill--unsigned">not signed</span>
                      )}
                    </td>
                    <td className="fr-td-strong">{r.businessName || "-"}</td>
                    <td>{r.location || "-"}</td>
                    <td>{renderUser(r.requester)}</td>
                    <td>{fmtDateTime(r.createdAt)}</td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="fr-empty">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="fr-paging">
            <button className="fr-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ←
            </button>
            <div className="fr-paging__text">
              Page <b>{meta.page}</b> / {meta.totalPages}
            </div>
            <button
              className="fr-btn"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </button>
          </div>
        </div>

        {/* DETAIL */}
        <div className="fr-card">
          <div className="fr-card__head">
            <div className="fr-card__title">Chi tiết</div>
            {!detail ? <div className="fr-card__meta">Chọn 1 request</div> : null}
          </div>

          {!detail ? (
            <div className="fr-empty-box">Chưa chọn yêu cầu nhượng quyền nào.</div>
          ) : (
            <>
              <div className="fr-detail">
                <div className="fr-kv">
                  <div className="fr-k">ID</div>
                  <div className="fr-v">#{detail.id}</div>
                </div>

                <div className="fr-kv">
                  <div className="fr-k">Status</div>
                  <div className="fr-v">
                    <span className={`fr-pill fr-pill--${detail.status}`}>{detail.status}</span>
                  </div>
                </div>

                <div className="fr-kv">
                  <div className="fr-k">Contract</div>
                  <div className="fr-v">
                    {detail.contractSigned ? (
                      <span className="fr-pill fr-pill--signed">signed</span>
                    ) : (
                      <span className="fr-pill fr-pill--unsigned">not signed</span>
                    )}
                  </div>
                </div>

                <div className="fr-kv">
                  <div className="fr-k">Created at</div>
                  <div className="fr-v">{fmtDateTime(detail.createdAt)}</div>
                </div>

                <div className="fr-kv">
                  <div className="fr-k">Business</div>
                  <div className="fr-v">{detail.businessName || "-"}</div>
                </div>

                <div className="fr-kv">
                  <div className="fr-k">Location</div>
                  <div className="fr-v">{detail.location || "-"}</div>
                </div>

                <div className="fr-kv">
                  <div className="fr-k">Requester</div>
                  <div className="fr-v">{renderUser(detail.requester)}</div>
                </div>

                <div className="fr-kv">
                  <div className="fr-k">Reviewed by</div>
                  <div className="fr-v">{renderUser(detail.reviewer)}</div>
                </div>

                <div className="fr-kv">
                  <div className="fr-k">Approved date</div>
                  <div className="fr-v">{fmtDateTime(detail.approvedDate)}</div>
                </div>

                <div className="fr-kv">
                  <div className="fr-k">Gym created</div>
                  <div className="fr-v">
                    {detail.createdGym?.name
                      ? `${detail.createdGym.name} (#${detail.createdGym.id})`
                      : "-"}
                  </div>
                </div>

                <div className="fr-kv">
                  <div className="fr-k">Contact</div>
                  <div className="fr-v">
                    {detail.contactPerson || "-"} • {detail.contactPhone || "-"}
                  </div>
                </div>

                <div className="fr-kv">
                  <div className="fr-k">Email</div>
                  <div className="fr-v">{detail.contactEmail || "-"}</div>
                </div>

                <div className="fr-kv">
                  <div className="fr-k">ReviewNotes</div>
                  <div className="fr-v">{detail.reviewNotes || "-"}</div>
                </div>
              </div>

              <div className="fr-actions">
                <button className="fr-btn" disabled={detail.status !== "pending"} onClick={doApprove}>
                  Approve
                </button>
                <button
                  className="fr-btn fr-btn--danger"
                  disabled={detail.status !== "pending"}
                  onClick={openReject}
                >
                  Reject
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL reject */}
      {modal.open && (
        <div className="fr-modal__backdrop" onMouseDown={closeModal}>
          <div className="fr-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="fr-modal__head">
              <div className="fr-modal__title">Reject Franchise Request</div>
              <button className="fr-btn fr-btn--ghost" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="fr-modal__body">
              <div className="fr-field">
                <label>Review Notes</label>
                <textarea
                  value={modal.payload.reviewNotes}
                  onChange={(e) =>
                    setModal((m) => ({
                      ...m,
                      payload: { ...m.payload, reviewNotes: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="fr-modal__actions">
                <button className="fr-btn fr-btn--danger" onClick={doReject}>
                  Từ chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
