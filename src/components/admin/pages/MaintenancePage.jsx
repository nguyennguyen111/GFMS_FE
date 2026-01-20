import React, { useEffect, useMemo, useState } from "react";
import "./MaintenancePage.css";
import {
  admGetMaintenances,
  admGetMaintenanceDetail,
  admApproveMaintenance,
  admRejectMaintenance,
  admAssignMaintenance,
  admStartMaintenance,
  admCompleteMaintenance,
} from "../../../services/adminAdminCoreService";

const statusOptions = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const money = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString("vi-VN");
};

export default function MaintenancePage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });

  const [filters, setFilters] = useState({ status: "", gymId: "", q: "" });
  const [page, setPage] = useState(1);
  const limit = 10;

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);

  const [modal, setModal] = useState({ open: false, type: "", payload: {} });

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await admGetMaintenances({ ...filters, page, limit });
      const data = res?.data?.data ?? res?.data?.rows ?? [];
      const metaFrom = res?.data?.meta;

      // backend của bạn trả {data, meta} theo service mình viết
      setRows(data);
      setMeta(
        metaFrom || {
          page,
          limit,
          totalItems: res?.data?.count || data.length,
          totalPages: metaFrom?.totalPages || 1,
        }
      );
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id) => {
    setLoading(true);
    try {
      const res = await admGetMaintenanceDetail(id);
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

  const openApprove = () => setModal({ open: true, type: "approve", payload: { scheduledDate: "", estimatedCost: "", notes: "" } });
  const openReject = () => setModal({ open: true, type: "reject", payload: { reason: "" } });
  const openAssign = () => setModal({ open: true, type: "assign", payload: { assignedTo: "" } });
  const openComplete = () => setModal({ open: true, type: "complete", payload: { actualCost: "" } });

  const closeModal = () => setModal({ open: false, type: "", payload: {} });

  const canApprove = useMemo(() => detail?.status === "pending", [detail]);
  const canReject = useMemo(() => ["pending", "assigned"].includes(detail?.status), [detail]);
  const canAssign = useMemo(() => ["pending", "assigned"].includes(detail?.status), [detail]);
  const canStart = useMemo(() => detail?.status === "assigned", [detail]);
  const canComplete = useMemo(() => ["assigned", "in_progress"].includes(detail?.status), [detail]);

  const doApprove = async () => {
    try {
      await admApproveMaintenance(selectedId, modal.payload);
      closeModal();
      await fetchDetail(selectedId);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const doReject = async () => {
    try {
      await admRejectMaintenance(selectedId, modal.payload);
      closeModal();
      setSelectedId(null);
      setDetail(null);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const doAssign = async () => {
    try {
      await admAssignMaintenance(selectedId, modal.payload);
      closeModal();
      await fetchDetail(selectedId);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const doStart = async () => {
    if (!window.confirm("Start maintenance này?")) return;
    try {
      await admStartMaintenance(selectedId);
      await fetchDetail(selectedId);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const doComplete = async () => {
    try {
      await admCompleteMaintenance(selectedId, modal.payload);
      closeModal();
      await fetchDetail(selectedId);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  return (
    <div className="ma-page">
      <div className="ma-head">
        <div>
          <div className="ma-title">Bảo trì / Sửa chữa</div>
          <div className="ma-sub">Duyệt – phân công – theo dõi tiến độ – hoàn tất (main flow)</div>
        </div>
        <div className="ma-badge">{loading ? "Đang tải..." : "Module 2"}</div>
      </div>

      <div className="ma-filters">
        <div className="ma-field">
          <label>Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ma-field">
          <label>GymId</label>
          <input
            value={filters.gymId}
            onChange={(e) => setFilters((s) => ({ ...s, gymId: e.target.value }))}
            placeholder="VD: 1"
          />
        </div>

        <div className="ma-field ma-field--grow">
          <label>Search</label>
          <input
            value={filters.q}
            onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
            placeholder="issueDescription / notes..."
          />
        </div>

        <button
          className="ma-btn ma-btn--primary"
          onClick={() => {
            setPage(1);
            fetchList();
          }}
        >
          Lọc
        </button>
      </div>

      <div className="ma-grid">
        <div className="ma-card">
          <div className="ma-card__head">
            <div className="ma-card__title">Danh sách yêu cầu</div>
            <div className="ma-card__meta">
              Tổng: <b>{meta.totalItems}</b>
            </div>
          </div>

          <div className="ma-table-wrap">
            <table className="ma-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Gym</th>
                  <th>Equipment</th>
                  <th>Estimated</th>
                  <th>Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={selectedId === r.id ? "is-active" : ""}
                    onClick={() => setSelectedId(r.id)}
                  >
                    <td>#{r.id}</td>
                    <td>
                      <span className={`ma-pill ma-pill--${r.status}`}>{r.status}</span>
                    </td>
                    <td>{r.gymId ?? "-"}</td>
                    <td>{r.equipmentId ?? "-"}</td>
                    <td>{money(r.estimatedCost)}</td>
                    <td>{r.scheduledDate ? new Date(r.scheduledDate).toLocaleString() : "-"}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="ma-empty">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="ma-paging">
            <button className="ma-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ←
            </button>
            <div className="ma-paging__text">
              Page <b>{meta.page}</b> / {meta.totalPages}
            </div>
            <button
              className="ma-btn"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </button>
          </div>
        </div>

        <div className="ma-card">
          <div className="ma-card__head">
            <div className="ma-card__title">Chi tiết</div>
            {!detail ? <div className="ma-card__meta">Chọn 1 request ở bảng</div> : null}
          </div>

          {!detail ? (
            <div className="ma-empty-box">Chưa có maintenance nào được chọn.</div>
          ) : (
            <>
              <div className="ma-detail">
                <div className="ma-kv">
                  <div className="ma-k">ID</div>
                  <div className="ma-v">#{detail.id}</div>
                </div>
                <div className="ma-kv">
                  <div className="ma-k">Status</div>
                  <div className="ma-v">
                    <span className={`ma-pill ma-pill--${detail.status}`}>{detail.status}</span>
                  </div>
                </div>
                <div className="ma-kv">
                  <div className="ma-k">Gym</div>
                  <div className="ma-v">{detail.gymId ?? "-"}</div>
                </div>
                <div className="ma-kv">
                  <div className="ma-k">Equipment</div>
                  <div className="ma-v">{detail.equipmentId ?? "-"}</div>
                </div>
                <div className="ma-kv">
                  <div className="ma-k">Issue</div>
                  <div className="ma-v">{detail.issueDescription || "-"}</div>
                </div>
                <div className="ma-kv">
                  <div className="ma-k">Scheduled</div>
                  <div className="ma-v">
                    {detail.scheduledDate ? new Date(detail.scheduledDate).toLocaleString() : "-"}
                  </div>
                </div>
                <div className="ma-kv">
                  <div className="ma-k">Estimated</div>
                  <div className="ma-v">{money(detail.estimatedCost)}</div>
                </div>
                <div className="ma-kv">
                  <div className="ma-k">Actual cost</div>
                  <div className="ma-v">{money(detail.actualCost)}</div>
                </div>
                <div className="ma-kv">
                  <div className="ma-k">AssignedTo</div>
                  <div className="ma-v">{detail.assignedTo ?? "-"}</div>
                </div>
              </div>

              <div className="ma-actions">
                <button className="ma-btn" disabled={!canApprove} onClick={openApprove}>
                  Approve
                </button>
                <button className="ma-btn" disabled={!canAssign} onClick={openAssign}>
                  Assign
                </button>
                <button className="ma-btn" disabled={!canStart} onClick={doStart}>
                  Start
                </button>
                <button className="ma-btn" disabled={!canComplete} onClick={openComplete}>
                  Complete
                </button>
                <button className="ma-btn ma-btn--danger" disabled={!canReject} onClick={openReject}>
                  Reject
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {modal.open && (
        <div className="ma-modal__backdrop" onMouseDown={closeModal}>
          <div className="ma-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ma-modal__head">
              <div className="ma-modal__title">
                {modal.type === "approve" && "Approve Maintenance"}
                {modal.type === "reject" && "Reject Maintenance"}
                {modal.type === "assign" && "Assign Technician"}
                {modal.type === "complete" && "Complete Maintenance"}
              </div>
              <button className="ma-btn ma-btn--ghost" onClick={closeModal}>
                ✕
              </button>
            </div>

            {modal.type === "approve" && (
              <div className="ma-modal__body">
                <div className="ma-field">
                  <label>Scheduled Date</label>
                  <input
                    type="datetime-local"
                    value={modal.payload.scheduledDate}
                    onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, scheduledDate: e.target.value } }))}
                  />
                </div>
                <div className="ma-field">
                  <label>Estimated Cost</label>
                  <input
                    value={modal.payload.estimatedCost}
                    onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, estimatedCost: e.target.value } }))}
                    placeholder="VD: 1200000"
                  />
                </div>
                <div className="ma-field">
                  <label>Notes</label>
                  <textarea
                    value={modal.payload.notes}
                    onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, notes: e.target.value } }))}
                    placeholder="Ghi chú SLA, lịch, yêu cầu..."
                  />
                </div>
                <div className="ma-modal__actions">
                  <button className="ma-btn ma-btn--primary" onClick={doApprove}>
                    Duyệt
                  </button>
                </div>
              </div>
            )}

            {modal.type === "reject" && (
              <div className="ma-modal__body">
                <div className="ma-field">
                  <label>Lý do từ chối</label>
                  <textarea
                    value={modal.payload.reason}
                    onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, reason: e.target.value } }))}
                  />
                </div>
                <div className="ma-modal__actions">
                  <button className="ma-btn ma-btn--danger" onClick={doReject}>
                    Từ chối
                  </button>
                </div>
              </div>
            )}

            {modal.type === "assign" && (
              <div className="ma-modal__body">
                <div className="ma-field">
                  <label>assignedTo (UserId kỹ thuật)</label>
                  <input
                    value={modal.payload.assignedTo}
                    onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, assignedTo: e.target.value } }))}
                    placeholder="VD: 12"
                  />
                </div>
                <div className="ma-modal__actions">
                  <button className="ma-btn ma-btn--primary" onClick={doAssign}>
                    Phân công
                  </button>
                </div>
              </div>
            )}

            {modal.type === "complete" && (
              <div className="ma-modal__body">
                <div className="ma-field">
                  <label>Actual Cost</label>
                  <input
                    value={modal.payload.actualCost}
                    onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, actualCost: e.target.value } }))}
                    placeholder="VD: 1500000"
                  />
                </div>
                <div className="ma-modal__actions">
                  <button className="ma-btn ma-btn--primary" onClick={doComplete}>
                    Hoàn tất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
