import React, { useEffect, useMemo, useState } from "react";
import "./OwnerMaintenancePage.css";
import {
  ownerGetMaintenances,
  ownerGetMaintenanceDetail,
  ownerCreateMaintenance,
  ownerCancelMaintenance,
} from "../../../services/ownerMaintenanceService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import { ownerGetEquipments } from "../../../services/ownerEquipmentService";

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

export default function OwnerMaintenancePage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });

  const [filters, setFilters] = useState({ status: "", gymId: "", q: "" });
  const [page, setPage] = useState(1);
  const limit = 10;

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);

  const [myGyms, setMyGyms] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);

  const [modal, setModal] = useState({ open: false, type: "", payload: {} });

  // Fetch gyms for owner
  const fetchMyGyms = async () => {
    try {
      const res = await ownerGetMyGyms();
      setMyGyms(res.data.data || []);
    } catch (e) {
      console.error("Failed to fetch gyms:", e.message);
    }
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await ownerGetMaintenances({ ...filters, page, limit });
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
      const res = await ownerGetMaintenanceDetail(id);
      setDetail(res.data.data || res.data);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyGyms();
  }, []);

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line
  }, [page]);

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
    // eslint-disable-next-line
  }, [selectedId]);

  const fetchEquipmentByGym = async (gymId) => {
    if (!gymId) {
      setEquipmentList([]);
      return;
    }
    try {
      const res = await ownerGetEquipments({ page: 1, limit: 1000, gymId: gymId });
      const data = res?.data?.data ?? [];
      setEquipmentList(data);
    } catch (e) {
      console.error("Failed to fetch equipment:", e.message);
    }
  };

  const openCreateModal = () => {
    setModal({ 
      open: true, 
      type: "create", 
      payload: { gymId: "", equipmentId: "", issueDescription: "" } 
    });
    setEquipmentList([]);
  };

  const closeModal = () => setModal({ open: false, type: "", payload: {} });

  const canCancel = useMemo(() => detail?.status === "pending", [detail]);

  const doCreate = async () => {
    try {
      // Convert string values to numbers
      const payload = {
        gymId: Number(modal.payload.gymId),
        equipmentId: Number(modal.payload.equipmentId),
        issueDescription: modal.payload.issueDescription || "",
      };
      await ownerCreateMaintenance(payload);
      closeModal();
      setSelectedId(null);
      setDetail(null);
      setPage(1);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const doCancel = async () => {
    if (!window.confirm("Hủy yêu cầu bảo trì này?")) return;
    try {
      await ownerCancelMaintenance(selectedId);
      setSelectedId(null);
      setDetail(null);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  return (
    <div className="oma-page">
      <div className="oma-head">
        <div>
          <div className="oma-title">Bảo trì / Sửa chữa</div>
          <div className="oma-sub">Tạo yêu cầu bảo trì thiết bị của gym</div>
        </div>
        <div className="oma-badge">{loading ? "Đang tải..." : "Quản lý"}</div>
      </div>

      <div className="oma-filters">
        <div className="oma-field">
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

        <div className="oma-field">
          <label>GymId</label>
          <input
            value={filters.gymId}
            onChange={(e) => setFilters((s) => ({ ...s, gymId: e.target.value }))}
            placeholder="VD: 1"
          />
        </div>

        <div className="oma-field oma-field--grow">
          <label>Search</label>
          <input
            value={filters.q}
            onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
            placeholder="issueDescription / notes..."
          />
        </div>

        <button
          className="oma-btn oma-btn--primary"
          onClick={() => {
            setPage(1);
            fetchList();
          }}
        >
          Lọc
        </button>

        <button
          className="oma-btn oma-btn--primary"
          onClick={openCreateModal}
        >
          ➕ Tạo mới
        </button>
      </div>

      <div className="oma-grid">
        <div className="oma-card">
          <div className="oma-card__head">
            <div className="oma-card__title">Danh sách yêu cầu</div>
            <div className="oma-card__meta">
              Tổng: <b>{meta.totalItems}</b>
            </div>
          </div>

          <div className="oma-table-wrap">
            <table className="oma-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Gym</th>
                  <th>Equipment</th>
                  <th>Ngày tạo</th>
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
                      <span className={`oma-pill oma-pill--${r.status}`}>{r.status}</span>
                    </td>
                    <td>{r.gymId ?? "-"}</td>
                    <td>{r.equipmentId ?? "-"}</td>
                    <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="oma-empty">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="oma-paging">
            <button className="oma-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ←
            </button>
            <div className="oma-paging__text">
              Page <b>{meta.page}</b> / {meta.totalPages}
            </div>
            <button
              className="oma-btn"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </button>
          </div>
        </div>

        <div className="oma-card">
          <div className="oma-card__head">
            <div className="oma-card__title">Chi tiết</div>
            {!detail ? <div className="oma-card__meta">Chọn 1 request ở bảng</div> : null}
          </div>

          {!detail ? (
            <div className="oma-empty-box">Chưa có maintenance nào được chọn.</div>
          ) : (
            <>
              <div className="oma-detail">
                <div className="oma-kv">
                  <div className="oma-k">ID</div>
                  <div className="oma-v">#{detail.id}</div>
                </div>
                <div className="oma-kv">
                  <div className="oma-k">Status</div>
                  <div className="oma-v">
                    <span className={`oma-pill oma-pill--${detail.status}`}>{detail.status}</span>
                  </div>
                </div>
                <div className="oma-kv">
                  <div className="oma-k">Gym</div>
                  <div className="oma-v">{detail.Gym?.name || detail.gym?.name || "-"}</div>
                </div>
                <div className="oma-kv">
                  <div className="oma-k">Equipment</div>
                  <div className="oma-v">{detail.Equipment?.name || detail.equipment?.name || "-"}</div>
                </div>
                <div className="oma-kv">
                  <div className="oma-k">Vấn đề</div>
                  <div className="oma-v">{detail.issueDescription || "-"}</div>
                </div>
                <div className="oma-kv">
                  <div className="oma-k">Ngày tạo</div>
                  <div className="oma-v">
                    {detail.createdAt ? new Date(detail.createdAt).toLocaleString() : "-"}
                  </div>
                </div>
                <div className="oma-kv">
                  <div className="oma-k">Ngày duyệt</div>
                  <div className="oma-v">
                    {detail.scheduledDate ? new Date(detail.scheduledDate).toLocaleString() : "-"}
                  </div>
                </div>
                <div className="oma-kv">
                  <div className="oma-k">Ước tính</div>
                  <div className="oma-v">{money(detail.estimatedCost)}</div>
                </div>
                <div className="oma-kv">
                  <div className="oma-k">Thực tế</div>
                  <div className="oma-v">{money(detail.actualCost)}</div>
                </div>
                <div className="oma-kv">
                  <div className="oma-k">Ghi chú</div>
                  <div className="oma-v">{detail.notes || "-"}</div>
                </div>
              </div>

              <div className="oma-actions">
                <button className="oma-btn oma-btn--danger" disabled={!canCancel} onClick={doCancel}>
                  Hủy yêu cầu
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {modal.open && (
        <div className="oma-modal__backdrop" onMouseDown={closeModal}>
          <div className="oma-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="oma-modal__head">
              <div className="oma-modal__title">
                {modal.type === "create" && "Tạo yêu cầu bảo trì"}
              </div>
              <button className="oma-btn oma-btn--ghost" onClick={closeModal}>
                ✕
              </button>
            </div>

            {modal.type === "create" && (
              <div className="oma-modal__body">
                <div className="oma-field">
                  <label>Gym</label>
                  <select
                    value={modal.payload.gymId}
                    onChange={(e) => {
                      const newGymId = e.target.value;
                      setModal((m) => ({ ...m, payload: { ...m.payload, gymId: newGymId, equipmentId: "" } }));
                      fetchEquipmentByGym(newGymId);
                    }}
                  >
                    <option value="">-- Chọn gym --</option>
                    {myGyms.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="oma-field">
                  <label>Thiết bị</label>
                  <select
                    value={modal.payload.equipmentId}
                    onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, equipmentId: e.target.value } }))}
                  >
                    <option value="">-- Chọn thiết bị --</option>
                    {equipmentList.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name} (Mã: {eq.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="oma-field">
                  <label>Mô tả vấn đề</label>
                  <textarea
                    value={modal.payload.issueDescription}
                    onChange={(e) => setModal((m) => ({ ...m, payload: { ...m.payload, issueDescription: e.target.value } }))}
                    placeholder="Mô tả chi tiết vấn đề cần bảo trì..."
                  />
                </div>

                <div className="oma-modal__actions">
                  <button className="oma-btn oma-btn--primary" onClick={doCreate}>
                    Tạo yêu cầu
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
