import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  { value: "pending", label: "Chờ xử lý" },
  { value: "approve", label: "Đã duyệt" },
  { value: "assigned", label: "Đã phân công" },
  { value: "in_progress", label: "Đang thực hiện" },
  { value: "completed", label: "Hoàn tất" },
  { value: "cancelled", label: "Đã huỷ" },
];

const MAINTENANCE_STATUS_VI = {
  pending: "Chờ xử lý",
  approve: "Đã duyệt",
  assigned: "Đã phân công",
  in_progress: "Đang thực hiện",
  completed: "Hoàn tất",
  cancelled: "Đã huỷ",
};

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
  const [searchParams, setSearchParams] = useSearchParams();
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

  useLayoutEffect(() => {
    const h = Number(searchParams.get("highlight"));
    if (!Number.isFinite(h) || h <= 0) return;
    setSelectedId(h);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

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
        alert("Bạn chưa chọn ngày giờ hẹn");
        return;
      }

      // ✅ ép number
      if (payload.estimatedCost !== "" && payload.estimatedCost !== null && payload.estimatedCost !== undefined) {
        const n = Number(payload.estimatedCost);
        if (Number.isNaN(n) || n < 0) {
          alert("Chi phí ước tính phải là số hợp lệ");
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
        alert("Bạn chưa chọn kỹ thuật viên");
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
    if (!window.confirm("Bắt đầu bảo trì này?")) return;
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
        alert("Chi phí thực tế phải là số hợp lệ");
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
          <div className="ma-title">Bảo trì thiết bị</div>
          <div className="ma-sub">Duyệt → Phân công → Bắt đầu → Hoàn tất (chuẩn nghiệp vụ)</div>
        </div>
        <div className="ma-badge">{loading ? "Đang tải..." : "Mô-đun 2"}</div>
      </div>

      <div className="ma-filters">
        <div className="ma-field">
          <label>Trạng thái</label>
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
          <label>Tìm kiếm</label>
          <input
            value={filters.q}
            onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
            placeholder="Mô tả sự cố / ghi chú..."
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
                  <th>Mã</th>
                  <th>Trạng thái</th>
                  <th>Phòng gym</th>
                  <th>Thiết bị</th>
                  <th>Ước tính</th>
                  <th>Lịch hẹn</th>
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
                      <span className={`ma-pill ma-pill--${r.status}`}>
                        {MAINTENANCE_STATUS_VI[r.status] || r.status}
                      </span>
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
              Trang <b>{meta.page}</b> / {meta.totalPages}
            </div>
            <button className="ma-btn" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              →
            </button>
          </div>
        </div>

        <div className="ma-card">
          <div className="ma-card__head">
            <div className="ma-card__title">Chi tiết</div>
            {!detail ? <div className="ma-card__meta">Chọn một yêu cầu trong bảng</div> : null}
          </div>

          {!detail ? (
            <div className="ma-empty-box">Chưa chọn yêu cầu bảo trì nào.</div>
          ) : (
            <>
              <div className="ma-detail">
                <div className="ma-kv">
                  <div className="ma-k">Mã</div>
                  <div className="ma-v">#{detail.id}</div>
                </div>
                <div className="ma-kv">
                  <div className="ma-k">Trạng thái</div>
                  <div className="ma-v">
                    <span className={`ma-pill ma-pill--${detail.status}`}>
                      {MAINTENANCE_STATUS_VI[detail.status] || detail.status}
                    </span>
                  </div>
                </div>
                <div className="ma-kv">
                  <div className="ma-k">Phòng gym</div>
                  <div className="ma-v">{gymLabel(detail)}</div>
                </div>
                <div className="ma-kv">
                  <div className="ma-k">Thiết bị</div>
                  <div className="ma-v">{equipmentLabel(detail)}</div>
                </div>
                <div className="ma-kv">
                  <div className="ma-k">Mô tả sự cố</div>
                  <div className="ma-v">{detail.issueDescription || "-"}</div>
                </div>

                <div className="ma-kv">
                  <div className="ma-k">Ghi chú</div>
                  <div className="ma-v" style={{ whiteSpace: "pre-wrap" }}>
                    {detail.notes || "-"}
                  </div>
                </div>

                <div className="ma-kv">
                  <div className="ma-k">Lịch hẹn</div>
                  <div className="ma-v">
                    {detail.scheduledDate ? new Date(detail.scheduledDate).toLocaleString() : "-"}
                  </div>
                </div>
                <div className="ma-kv">
                  <div className="ma-k">Chi phí ước tính</div>
                  <div className="ma-v">{money(detail.estimatedCost)}</div>
                </div>
                <div className="ma-kv">
                  <div className="ma-k">Chi phí thực tế</div>
                  <div className="ma-v">{money(detail.actualCost)}</div>
                </div>
                <div className="ma-kv">
                  <div className="ma-k">Kỹ thuật viên</div>
                  <div className="ma-v">{technicianLabel(detail)}</div>
                </div>
              </div>

              <div className="ma-actions">
                <button className="ma-btn" disabled={!canApprove} onClick={openApprove}>
                  Duyệt
                </button>
                <button className="ma-btn" disabled={!canAssign} onClick={openAssign}>
                  Phân công
                </button>
                <button className="ma-btn" disabled={!canStart} onClick={doStart}>
                  Bắt đầu
                </button>
                <button className="ma-btn" disabled={!canComplete} onClick={openComplete}>
                  Hoàn tất
                </button>
                <button className="ma-btn ma-btn--danger" disabled={!canReject} onClick={openReject}>
                  Từ chối
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
                {modal.type === "approve" && "Duyệt yêu cầu bảo trì"}
                {modal.type === "reject" && "Từ chối bảo trì"}
                {modal.type === "assign" && "Phân công kỹ thuật viên"}
                {modal.type === "complete" && "Hoàn tất bảo trì"}
              </div>
              <button className="ma-btn ma-btn--ghost" onClick={closeModal}>
                ✕
              </button>
            </div>

            {modal.type === "approve" && (
              <div className="ma-modal__body">
                <div className="ma-field">
                  <label>Ngày giờ hẹn</label>
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
                  <label>Chi phí ước tính</label>
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
                  <label>Ghi chú</label>
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
                  <label>Kỹ thuật viên</label>
                  <select
                    value={modal.payload.assignedTo}
                    onChange={(e) =>
                      setModal((m) => ({
                        ...m,
                        payload: { ...m.payload, assignedTo: e.target.value },
                      }))
                    }
                  >
                    <option value="">{techLoading ? "Đang tải..." : "-- Chọn kỹ thuật viên --"}</option>
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
                  <label>Chi phí thực tế</label>
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
