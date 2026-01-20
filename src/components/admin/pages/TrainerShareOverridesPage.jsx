import React, { useEffect, useState } from "react";
import "./TrainerShareOverridesPage.css";
import {
  admGetTrainerShares,
  admGetTrainerShareDetail,
  admOverrideTrainerShare,
} from "../../../services/adminAdminCoreService";

export default function TrainerShareOverridesPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ status: "approved", fromGymId: "", toGymId: "", trainerId: "" });

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [modal, setModal] = useState({ open: false, payload: { policyId: "", commissionSplit: "", notes: "" } });

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

  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (selectedId) fetchDetail(selectedId); /* eslint-disable-next-line */ }, [selectedId]);

  const openOverride = () => {
    if (!detail) return;
    setModal({
      open: true,
      payload: {
        policyId: detail.policyId ?? "",
        commissionSplit: detail.commissionSplit ?? "",
        notes: detail.notes ?? "",
      },
    });
  };

  const close = () => setModal({ open: false, payload: { policyId: "", commissionSplit: "", notes: "" } });

  const doOverride = async () => {
    setLoading(true);
    try {
      await admOverrideTrainerShare(selectedId, modal.payload);
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
          <label>fromGymId</label>
          <input value={filters.fromGymId} onChange={(e) => setFilters((s) => ({ ...s, fromGymId: e.target.value }))} placeholder="VD: 1" />
        </div>
        <div className="to-field">
          <label>toGymId</label>
          <input value={filters.toGymId} onChange={(e) => setFilters((s) => ({ ...s, toGymId: e.target.value }))} placeholder="VD: 2" />
        </div>
        <div className="to-field">
          <label>trainerId</label>
          <input value={filters.trainerId} onChange={(e) => setFilters((s) => ({ ...s, trainerId: e.target.value }))} placeholder="VD: 10" />
        </div>
        <button className="to-btn to-btn--primary" onClick={fetchList} disabled={loading}>Lọc</button>
      </div>

      <div className="to-grid">
        <div className="to-card">
          <div className="to-card__head">
            <div className="to-card__title">Danh sách approved</div>
            <div className="to-card__meta">Tổng: <b>{rows.length}</b></div>
          </div>
          <div className="to-table-wrap">
            <table className="to-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>FromGym</th>
                  <th>ToGym</th>
                  <th>Trainer</th>
                  <th>Policy</th>
                  <th>Split</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={selectedId === r.id ? "is-active" : ""} onClick={() => setSelectedId(r.id)}>
                    <td>#{r.id}</td>
                    <td>{r.fromGymId ?? "-"}</td>
                    <td>{r.toGymId ?? "-"}</td>
                    <td>{r.trainerId ?? "-"}</td>
                    <td>{r.policyId ?? "-"}</td>
                    <td>{r.commissionSplit ?? "-"}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={6} className="to-empty">Không có dữ liệu</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="to-card">
          <div className="to-card__head">
            <div className="to-card__title">Chi tiết</div>
            {!detail ? <div className="to-card__meta">Chọn 1 dòng</div> : null}
          </div>

          {!detail ? (
            <div className="to-empty-box">Chưa chọn trainer share nào.</div>
          ) : (
            <>
              <div className="to-detail">
                <div className="to-kv"><div className="to-k">ID</div><div className="to-v">#{detail.id}</div></div>
                <div className="to-kv"><div className="to-k">FromGym</div><div className="to-v">{detail.fromGymId ?? "-"}</div></div>
                <div className="to-kv"><div className="to-k">ToGym</div><div className="to-v">{detail.toGymId ?? "-"}</div></div>
                <div className="to-kv"><div className="to-k">Trainer</div><div className="to-v">{detail.trainerId ?? "-"}</div></div>
                <div className="to-kv"><div className="to-k">PolicyId</div><div className="to-v">{detail.policyId ?? "-"}</div></div>
                <div className="to-kv"><div className="to-k">Split</div><div className="to-v">{detail.commissionSplit ?? "-"}</div></div>
                <div className="to-kv to-kv--full"><div className="to-k">Notes</div><div className="to-v">{detail.notes || "-"}</div></div>
              </div>

              <div className="to-actions">
                <button className="to-btn to-btn--primary" onClick={openOverride}>Override</button>
              </div>
            </>
          )}
        </div>
      </div>

      {modal.open && (
        <div className="to-modal__backdrop" onMouseDown={close}>
          <div className="to-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="to-modal__head">
              <div className="to-modal__title">Override Trainer Share</div>
              <button className="to-btn to-btn--ghost" onClick={close}>✕</button>
            </div>

            <div className="to-modal__body">
              <div className="to-field">
                <label>policyId</label>
                <input value={modal.payload.policyId} onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, policyId: e.target.value } }))} placeholder="VD: 3" />
              </div>
              <div className="to-field">
                <label>commissionSplit</label>
                <input value={modal.payload.commissionSplit} onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, commissionSplit: e.target.value } }))} placeholder="VD: 0.6" />
              </div>
              <div className="to-field">
                <label>notes</label>
                <textarea value={modal.payload.notes} onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, notes: e.target.value } }))} />
              </div>

              <div className="to-modal__actions">
                <button className="to-btn to-btn--primary" onClick={doOverride} disabled={loading}>Lưu override</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
