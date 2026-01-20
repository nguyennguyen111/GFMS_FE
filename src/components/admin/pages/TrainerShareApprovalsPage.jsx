import React, { useEffect, useState } from "react";
import "./TrainerShareApprovalsPage.css";
import {
  admGetTrainerShares,
  admGetTrainerShareDetail,
  admApproveTrainerShare,
  admRejectTrainerShare,
} from "../../../services/adminAdminCoreService";

export default function TrainerShareApprovalsPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ status: "pending", fromGymId: "", toGymId: "", trainerId: "" });

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [modal, setModal] = useState({ open: false, type: "", payload: {} });

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

  const openApprove = () => setModal({ open: true, type: "approve", payload: { policyId: "", commissionSplit: "" } });
  const openReject = () => setModal({ open: true, type: "reject", payload: { reason: "" } });
  const close = () => setModal({ open: false, type: "", payload: {} });

  const doApprove = async () => {
    setLoading(true);
    try {
      await admApproveTrainerShare(selectedId, modal.payload);
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
          <select value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
        </div>
        <div className="ta-field">
          <label>fromGymId</label>
          <input value={filters.fromGymId} onChange={(e) => setFilters((s) => ({ ...s, fromGymId: e.target.value }))} placeholder="VD: 1" />
        </div>
        <div className="ta-field">
          <label>toGymId</label>
          <input value={filters.toGymId} onChange={(e) => setFilters((s) => ({ ...s, toGymId: e.target.value }))} placeholder="VD: 2" />
        </div>
        <div className="ta-field">
          <label>trainerId</label>
          <input value={filters.trainerId} onChange={(e) => setFilters((s) => ({ ...s, trainerId: e.target.value }))} placeholder="VD: 10" />
        </div>
        <button className="ta-btn ta-btn--primary" onClick={fetchList} disabled={loading}>Lọc</button>
      </div>

      <div className="ta-grid">
        <div className="ta-card">
          <div className="ta-card__head">
            <div className="ta-card__title">Danh sách</div>
            <div className="ta-card__meta">Tổng: <b>{rows.length}</b></div>
          </div>
          <div className="ta-table-wrap">
            <table className="ta-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>FromGym</th>
                  <th>ToGym</th>
                  <th>Trainer</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={selectedId === r.id ? "is-active" : ""} onClick={() => setSelectedId(r.id)}>
                    <td>#{r.id}</td>
                    <td><span className={`ta-pill ta-pill--${r.status}`}>{r.status}</span></td>
                    <td>{r.fromGymId ?? "-"}</td>
                    <td>{r.toGymId ?? "-"}</td>
                    <td>{r.trainerId ?? "-"}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="ta-empty">Không có dữ liệu</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ta-card">
          <div className="ta-card__head">
            <div className="ta-card__title">Chi tiết</div>
            {!detail ? <div className="ta-card__meta">Chọn 1 request</div> : null}
          </div>

          {!detail ? (
            <div className="ta-empty-box">Chưa chọn trainer share nào.</div>
          ) : (
            <>
              <div className="ta-detail">
                <div className="ta-kv"><div className="ta-k">ID</div><div className="ta-v">#{detail.id}</div></div>
                <div className="ta-kv"><div className="ta-k">Status</div><div className="ta-v"><span className={`ta-pill ta-pill--${detail.status}`}>{detail.status}</span></div></div>
                <div className="ta-kv"><div className="ta-k">FromGym</div><div className="ta-v">{detail.fromGymId ?? "-"}</div></div>
                <div className="ta-kv"><div className="ta-k">ToGym</div><div className="ta-v">{detail.toGymId ?? "-"}</div></div>
                <div className="ta-kv"><div className="ta-k">Trainer</div><div className="ta-v">{detail.trainerId ?? "-"}</div></div>
                <div className="ta-kv"><div className="ta-k">PolicyId</div><div className="ta-v">{detail.policyId ?? "-"}</div></div>
                <div className="ta-kv"><div className="ta-k">CommissionSplit</div><div className="ta-v">{detail.commissionSplit ?? "-"}</div></div>
                <div className="ta-kv ta-kv--full"><div className="ta-k">Notes</div><div className="ta-v">{detail.notes || "-"}</div></div>
              </div>

              <div className="ta-actions">
                <button className="ta-btn" disabled={detail.status !== "pending"} onClick={openApprove}>Approve</button>
                <button className="ta-btn ta-btn--danger" disabled={detail.status !== "pending"} onClick={openReject}>Reject</button>
              </div>
            </>
          )}
        </div>
      </div>

      {modal.open && (
        <div className="ta-modal__backdrop" onMouseDown={close}>
          <div className="ta-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ta-modal__head">
              <div className="ta-modal__title">{modal.type === "approve" ? "Approve Trainer Share" : "Reject Trainer Share"}</div>
              <button className="ta-btn ta-btn--ghost" onClick={close}>✕</button>
            </div>

            <div className="ta-modal__body">
              {modal.type === "approve" ? (
                <>
                  <div className="ta-field">
                    <label>policyId</label>
                    <input value={modal.payload.policyId} onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, policyId: e.target.value } }))} placeholder="VD: 3" />
                  </div>
                  <div className="ta-field">
                    <label>commissionSplit</label>
                    <input value={modal.payload.commissionSplit} onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, commissionSplit: e.target.value } }))} placeholder="VD: 0.6" />
                  </div>
                  <div className="ta-modal__actions">
                    <button className="ta-btn ta-btn--primary" onClick={doApprove} disabled={loading}>Duyệt</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="ta-field">
                    <label>reason</label>
                    <textarea value={modal.payload.reason} onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, reason: e.target.value } }))} />
                  </div>
                  <div className="ta-modal__actions">
                    <button className="ta-btn ta-btn--danger" onClick={doReject} disabled={loading}>Từ chối</button>
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
