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
  admGetTechnicians,
  admGetGyms,
} from "../../../services/adminAdminCoreService";

const statusOptions = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Pending" },
  { value: "approve", label: "Approved" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const money = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString("vi-VN");
};

// Prefer displaying names (from included relations) instead of raw IDs
const gymLabel = (m) => m?.gym?.name || m?.Gym?.name || m?.gymName || m?.gymId || "-";
const equipmentLabel = (m) =>
  m?.equipment?.name || m?.Equipment?.name || m?.equipmentName || m?.equipmentId || "-";
const technicianLabel = (m) =>
  m?.technician?.username || m?.technician?.email || m?.technician?.id || m?.assignedTo || "-";

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

  // ✅ technicians dropdown
  const [techLoading, setTechLoading] = useState(false);
  const [technicians, setTechnicians] = useState([]);

  // ✅ gyms dropdown
  const [gymLoading, setGymLoading] = useState(false);
  const [gyms, setGyms] = useState([]);

  const fetchTechnicians = async () => {
    setTechLoading(true);
    try {
      const res = await admGetTechnicians();
      setTechnicians(res?.data?.data || []);
    } catch (e) {
      console.warn("fetchTechnicians error:", e);
      setTechnicians([]);
    } finally {
      setTechLoading(false);
    }
  };

  const fetchGyms = async () => {
    setGymLoading(true);
    try {
      // Nếu BE có hỗ trợ lite=1 thì càng tốt; không có cũng không sao
      const res = await admGetGyms({ lite: 1 });
      // Tuỳ controller trả {data} hoặc trả array trực tiếp — handle cả 2
      const data = res?.data?.data ?? res?.data ?? [];
      setGyms(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("fetchGyms error:", e);
      setGyms([]);
    } finally {
      setGymLoading(false);
    }
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await admGetMaintenances({ ...filters, page, limit });
      const data = res?.data?.data ?? res?.data?.rows ?? [];
      const metaFrom = res?.data?.meta;

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

  useEffect(() => {
    // ✅ load dropdown data once
    fetchTechnicians();
    fetchGyms();
    // eslint-disable-next-line
  }, []);

  // ---------------- MODALS ----------------
  const openApprove = () =>
    setModal({
      open: true,
      type: "approve",
      payload: { scheduledDate: "", estimatedCost: "", notes: "" },
    });

  const openReject = () =>
    setModal({
      open: true,
      type: "reject",
      payload: { reason: "" },
    });

  const openAssign = () =>
    setModal({
      open: true,
      type: "assign",
      payload: { assignedTo: detail?.assignedTo ? String(detail.assignedTo) : "" },
    });

  const openComplete = () =>
    setModal({
      open: true,
      type: "complete",
      payload: { actualCost: "" },
    });

  const closeModal = () => setModal({ open: false, type: "", payload: {} });

  // ---------------- BUSINESS RULES (CHUẨN FLOW ĐỒ ÁN) ----------------
  // pending -> approve -> assigned -> in_progress -> completed
  const canApprove = useMemo(() => detail?.status === "pending", [detail]);

  // ✅ chuẩn nghiệp vụ: approve xong assign được; assigned có thể re-assign (đổi kỹ thuật)
  const canAssign = useMemo(() => ["approve", "assigned"].includes(detail?.status), [detail]);

  // start chỉ khi assigned
  const canStart = useMemo(() => detail?.status === "assigned", [detail]);

  // ✅ chuẩn nghiệp vụ: complete CHỈ khi in_progress
  const canComplete = useMemo(() => detail?.status === "in_progress", [detail]);

  // reject cho phép ở pending / approve / assigned
  const canReject = useMemo(() => ["pending", "approve", "assigned"].includes(detail?.status), [detail]);

  // ---------------- ACTIONS ----------------
  const doApprove = async () => {
    try {
      const payload = { ...(modal.payload || {}) };

      if (!payload.scheduledDate) {
        alert("Bạn chưa chọn Scheduled Date");
        return;
      }

      // ✅ ép number
      if (payload.estimatedCost !== "" && payload.estimatedCost !== null && payload.estimatedCost !== undefined) {
        const n = Number(payload.estimatedCost);
        if (Number.isNaN(n) || n < 0) {
          alert("Estimated Cost phải là số hợp lệ");
          return;
        }
        payload.estimatedCost = n;
      } else {
        delete payload.estimatedCost;
      }

      await admApproveMaintenance(selectedId, payload);
      closeModal();
      await fetchDetail(selectedId);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const doReject = async () => {
    try {
      const reason = modal?.payload?.reason;
      if (!reason || !String(reason).trim()) {
        alert("Bạn chưa nhập lý do từ chối");
        return;
      }

      await admRejectMaintenance(selectedId, { reason });
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
      const assignedTo = modal?.payload?.assignedTo;
      if (!assignedTo) {
        alert("Bạn chưa chọn Technician");
        return;
      }

      await admAssignMaintenance(selectedId, { assignedTo: Number(assignedTo) });
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
      const payload = { ...(modal.payload || {}) };

      const n = Number(payload.actualCost);
      if (Number.isNaN(n) || n < 0) {
        alert("Actual Cost phải là số hợp lệ");
        return;
      }
      payload.actualCost = n;

      await admCompleteMaintenance(selectedId, payload);
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
          <div className="ma-sub">Duyệt → Phân công → Bắt đầu → Hoàn tất (chuẩn nghiệp vụ)</div>
        </div>
        <div className="ma-badge">{loading ? "Đang tải..." : "Module 2"}</div>
      </div>

      <div className="ma-filters">
        <div className="ma-field">
          <label>Status</label>
          <select value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* ✅ FIX: Gym dropdown */}
        <div className="ma-field">
          <label>Phòng gym</label>
          <select
            value={filters.gymId}
            onChange={(e) => setFilters((s) => ({ ...s, gymId: e.target.value }))}
          >
            <option value="">{gymLoading ? "Đang tải..." : "Tất cả"}</option>
            {gyms.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.name} (#{g.id})
              </option>
            ))}
          </select>
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
                    <td>{gymLabel(r)}</td>
                    <td>{equipmentLabel(r)}</td>
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
            <button className="ma-btn" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
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
                  <div className="ma-v">{gymLabel(detail)}</div>
                </div>
                <div className="ma-kv">
                  <div className="ma-k">Equipment</div>
                  <div className="ma-v">{equipmentLabel(detail)}</div>
                </div>
                <div className="ma-kv">
                  <div className="ma-k">Issue</div>
                  <div className="ma-v">{detail.issueDescription || "-"}</div>
                </div>

                <div className="ma-kv">
                  <div className="ma-k">Notes</div>
                  <div className="ma-v" style={{ whiteSpace: "pre-wrap" }}>
                    {detail.notes || "-"}
                  </div>
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
                  <div className="ma-v">{technicianLabel(detail)}</div>
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
                    onChange={(e) =>
                      setModal((m) => ({
                        ...m,
                        payload: { ...m.payload, scheduledDate: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="ma-field">
                  <label>Estimated Cost</label>
                  <input
                    value={modal.payload.estimatedCost}
                    onChange={(e) =>
                      setModal((m) => ({
                        ...m,
                        payload: { ...m.payload, estimatedCost: e.target.value },
                      }))
                    }
                    placeholder="VD: 1200000"
                  />
                </div>
                <div className="ma-field">
                  <label>Notes</label>
                  <textarea
                    value={modal.payload.notes}
                    onChange={(e) =>
                      setModal((m) => ({
                        ...m,
                        payload: { ...m.payload, notes: e.target.value },
                      }))
                    }
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

            {modal.type === "assign" && (
              <div className="ma-modal__body">
                <div className="ma-field">
                  <label>Technician</label>
                  <select
                    value={modal.payload.assignedTo}
                    onChange={(e) =>
                      setModal((m) => ({
                        ...m,
                        payload: { ...m.payload, assignedTo: e.target.value },
                      }))
                    }
                  >
                    <option value="">{techLoading ? "Đang tải..." : "-- Chọn technician --"}</option>
                    {technicians.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.username || u.email} (#{u.id})
                      </option>
                    ))}
                  </select>
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
                    onChange={(e) =>
                      setModal((m) => ({
                        ...m,
                        payload: { ...m.payload, actualCost: e.target.value },
                      }))
                    }
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

            {modal.type === "reject" && (
              <div className="ma-modal__body">
                <div className="ma-field">
                  <label>Lý do từ chối</label>
                  <textarea
                    value={modal.payload.reason}
                    onChange={(e) =>
                      setModal((m) => ({
                        ...m,
                        payload: { ...m.payload, reason: e.target.value },
                      }))
                    }
                    placeholder="VD: Không đủ thông tin / Không thuộc phạm vi..."
                  />
                </div>
                <div className="ma-modal__actions">
                  <button className="ma-btn ma-btn--danger" onClick={doReject}>
                    Từ chối
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
