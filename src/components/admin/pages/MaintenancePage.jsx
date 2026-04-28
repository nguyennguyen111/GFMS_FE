import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useAdminRealtimeRefresh from "../../../hooks/useAdminRealtimeRefresh";
import "./MaintenancePage.css";
import {
  admGetMaintenances,
  admGetMaintenanceDetail,
  admApproveMaintenance,
  admRejectMaintenance,
  admStartMaintenance,
  admCompleteMaintenance,
  admGetGyms,
} from "../../../services/adminAdminCoreService";
import NiceModal from "../../common/NiceModal";

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

const formatDateTime = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "-");

const getMaintenanceCode = (id) => `MT-${String(Number(id || 0)).padStart(6, "0")}`;

const pad2 = (n) => String(n).padStart(2, "0");
const toDatetimeLocalValue = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const minFutureDateTimeLocal = () => toDatetimeLocalValue(new Date(Date.now() + 5 * 60 * 1000));
const parseLocalDateTime = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Prefer displaying names (from included relations) instead of raw IDs
const gymLabel = (m) => m?.gym?.name || m?.Gym?.name || m?.gymName || m?.gymId || "-";
const equipmentLabel = (m) =>
  m?.equipment?.name || m?.Equipment?.name || m?.equipmentName || m?.equipmentId || "-";
export default function MaintenancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });

  const [filters, setFilters] = useState({ status: "", gymId: "", q: "", overdue: "", overdueDays: "" });
  const [page, setPage] = useState(1);
  const limit = 10;

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);

  const [modal, setModal] = useState({ open: false, type: "", payload: {} });
  const [noticeModal, setNoticeModal] = useState({ open: false, tone: "error", title: "", message: "" });
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const openNotice = (tone, title, message) => {
    setNoticeModal({
      open: true,
      tone: tone || "error",
      title: title || "Thông báo",
      message: message || "Đã xảy ra lỗi.",
    });
  };


  // ✅ gyms dropdown
  const [gymLoading, setGymLoading] = useState(false);
  const [gyms, setGyms] = useState([]);

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
      openNotice("error", "Tải danh sách thất bại", e?.response?.data?.message || e?.message);
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
      openNotice("error", "Tải chi tiết thất bại", e?.response?.data?.message || e?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line
  }, [page]);

  useEffect(() => {
    const overdue = searchParams.get("overdue") || "";
    const overdueDays = searchParams.get("overdueDays") || "";
    if (!overdue && !overdueDays) return;
    setFilters((prev) => ({
      ...prev,
      overdue: overdue ? String(overdue) : "1",
      overdueDays: overdueDays ? String(overdueDays) : "7",
    }));
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
    // eslint-disable-next-line
  }, [selectedId]);

  useEffect(() => {
    // ✅ load dropdown data once
    fetchGyms();
    // eslint-disable-next-line
  }, []);

  useAdminRealtimeRefresh({
    onRefresh: async () => {
      await fetchList();
      if (selectedId) await fetchDetail(selectedId);
    },
    events: ["notification:new", "maintenance:changed"],
    notificationTypes: ["admin_maintenance_request_submitted", "admin_maintenance_cancelled_by_owner"],
  });

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
      payload: {
        scheduledDate: minFutureDateTimeLocal(),
        targetCompletionDate: toDatetimeLocalValue(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
        notes: "",
      },
    });

  const openReject = () =>
    setModal({
      open: true,
      type: "reject",
      payload: { reason: "" },
    });

  const openComplete = () =>
    setModal({
      open: true,
      type: "complete",
      payload: {},
    });

  const openStart = () =>
    setModal({
      open: true,
      type: "start",
      payload: {},
    });

  const closeModal = () => setModal({ open: false, type: "", payload: {} });

  // ---------------- BUSINESS RULES (CHUẨN FLOW ĐỒ ÁN) ----------------
  // pending -> approve -> assigned -> in_progress -> completed
  const canApprove = useMemo(() => detail?.status === "pending", [detail]);

  // start sau khi duyệt
  const canStart = useMemo(() => ["approve", "assigned"].includes(detail?.status), [detail]);

  // ✅ chuẩn nghiệp vụ: complete CHỈ khi in_progress
  const canComplete = useMemo(() => detail?.status === "in_progress", [detail]);

  // reject cho phép ở pending / approve / assigned
  const canReject = useMemo(() => ["pending", "approve", "assigned"].includes(detail?.status), [detail]);

  // ---------------- ACTIONS ----------------
  const doApprove = async () => {
    if (actionSubmitting) return;
    setActionSubmitting(true);
    try {
      const payload = { ...(modal.payload || {}) };

      const minTime = Date.now() + 60 * 1000;
      const scheduledAt = parseLocalDateTime(payload.scheduledDate);
      const targetAt = parseLocalDateTime(payload.targetCompletionDate);

      if (!scheduledAt) {
        openNotice("warning", "Thiếu dữ liệu", "Bạn chưa chọn ngày giờ hẹn kiểm tra hợp lệ.");
        return;
      }
      if (scheduledAt.getTime() < minTime) {
        openNotice("warning", "Thời gian không hợp lệ", "Ngày giờ hẹn kiểm tra phải nằm trong tương lai.");
        return;
      }
      if (payload.targetCompletionDate && !targetAt) {
        openNotice("warning", "Thời gian không hợp lệ", "Hạn hoàn tất dự kiến không hợp lệ.");
        return;
      }
      if (targetAt && targetAt.getTime() <= scheduledAt.getTime()) {
        openNotice("warning", "Thời gian không hợp lệ", "Hạn hoàn tất dự kiến phải sau ngày giờ hẹn kiểm tra.");
        return;
      }

      await admApproveMaintenance(selectedId, payload);
      closeModal();
      await fetchDetail(selectedId);
      await fetchList();
      openNotice("success", "Duyệt thành công", "Yêu cầu bảo trì đã được duyệt.");
    } catch (e) {
      openNotice("error", "Duyệt thất bại", e?.response?.data?.message || e?.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  const doReject = async () => {
    if (actionSubmitting) return;
    setActionSubmitting(true);
    try {
      const reason = modal?.payload?.reason;
      if (!reason || !String(reason).trim()) {
        openNotice("warning", "Thiếu dữ liệu", "Bạn chưa nhập lý do từ chối.");
        return;
      }

      await admRejectMaintenance(selectedId, { reason });
      closeModal();
      setSelectedId(null);
      setDetail(null);
      await fetchList();
      openNotice("success", "Đã từ chối", "Yêu cầu bảo trì đã được từ chối.");
    } catch (e) {
      openNotice("error", "Từ chối thất bại", e?.response?.data?.message || e?.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  const doStart = async () => {
    if (actionSubmitting) return;
    setActionSubmitting(true);
    try {
      await admStartMaintenance(selectedId);
      closeModal();
      await fetchDetail(selectedId);
      await fetchList();
      openNotice("success", "Đã bắt đầu", "Yêu cầu bảo trì đã chuyển sang trạng thái đang thực hiện.");
    } catch (e) {
      openNotice("error", "Bắt đầu thất bại", e?.response?.data?.message || e?.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  const doComplete = async () => {
    if (actionSubmitting) return;
    setActionSubmitting(true);
    try {
      await admCompleteMaintenance(selectedId, {});
      closeModal();
      await fetchDetail(selectedId);
      await fetchList();
      openNotice("success", "Hoàn tất thành công", "Yêu cầu bảo trì đã được hoàn tất.");
    } catch (e) {
      openNotice("error", "Hoàn tất thất bại", e?.response?.data?.message || e?.message);
    } finally {
      setActionSubmitting(false);
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
                    <td>{getMaintenanceCode(r.id)}</td>
                    <td>
                      <span className={`ma-pill ma-pill--${r.status}`}>
                        {MAINTENANCE_STATUS_VI[r.status] || r.status}
                      </span>
                    </td>
                    <td>{gymLabel(r)}</td>
                    <td>{equipmentLabel(r)}</td>
                    <td>{formatDateTime(r.scheduledDate)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="ma-empty">
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
                  <div className="ma-v">{getMaintenanceCode(detail.id)}</div>
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
                    {formatDateTime(detail.scheduledDate)}
                  </div>
                </div>
                <div className="ma-kv">
                  <div className="ma-k">Hạn hoàn tất dự kiến</div>
                  <div className="ma-v">{formatDateTime(detail.targetCompletionDate)}</div>
                </div>
              </div>

              <div className="ma-actions">
                <button className="ma-btn" disabled={!canApprove || actionSubmitting} onClick={openApprove}>
                  Duyệt
                </button>
                <button className="ma-btn" disabled={!canStart || actionSubmitting} onClick={openStart}>
                  Bắt đầu
                </button>
                <button className="ma-btn" disabled={!canComplete || actionSubmitting} onClick={openComplete}>
                  Hoàn tất
                </button>
                <button className="ma-btn ma-btn--danger" disabled={!canReject || actionSubmitting} onClick={openReject}>
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
                {modal.type === "start" && "Bắt đầu bảo trì"}
                {modal.type === "complete" && "Hoàn tất bảo trì"}
              </div>
              <button className="ma-btn ma-btn--ghost" onClick={closeModal} disabled={actionSubmitting}>
                ✕
              </button>
            </div>

            {modal.type === "approve" && (
              <div className="ma-modal__body">
                <div className="ma-field">
                  <label>Ngày giờ hẹn kiểm tra</label>
                  <input
                    type="datetime-local"
                    min={minFutureDateTimeLocal()}
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
                  <label>Hạn hoàn tất dự kiến</label>
                  <input
                    type="datetime-local"
                    min={modal.payload.scheduledDate || minFutureDateTimeLocal()}
                    value={modal.payload.targetCompletionDate}
                    onChange={(e) =>
                      setModal((m) => ({
                        ...m,
                        payload: { ...m.payload, targetCompletionDate: e.target.value },
                      }))
                    }
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
                  <button className="ma-btn ma-btn--primary" onClick={doApprove} disabled={actionSubmitting}>
                    {actionSubmitting ? "Đang xử lý..." : "Duyệt"}
                  </button>
                </div>
              </div>
            )}

            {modal.type === "complete" && (
              <div className="ma-modal__body">
                <div className="ma-modal__actions">
                  <button className="ma-btn ma-btn--primary" onClick={doComplete} disabled={actionSubmitting}>
                    {actionSubmitting ? "Đang xử lý..." : "Hoàn tất"}
                  </button>
                </div>
              </div>
            )}

            {modal.type === "start" && (
              <div className="ma-modal__body">
                <div>Bạn có chắc muốn bắt đầu bảo trì yêu cầu này?</div>
                <div className="ma-modal__actions">
                  <button className="ma-btn" onClick={closeModal} disabled={actionSubmitting}>
                    Hủy
                  </button>
                  <button className="ma-btn ma-btn--primary" onClick={doStart} disabled={actionSubmitting}>
                    {actionSubmitting ? "Đang xử lý..." : "Bắt đầu"}
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
                  <button className="ma-btn ma-btn--danger" onClick={doReject} disabled={actionSubmitting}>
                    {actionSubmitting ? "Đang xử lý..." : "Từ chối"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <NiceModal
        open={Boolean(noticeModal.open)}
        onClose={() => setNoticeModal({ open: false, tone: "error", title: "", message: "" })}
        title={noticeModal.title || "Thông báo"}
        tone={noticeModal.tone || "error"}
        footer={
          <button
            type="button"
            className="nice-modal__btn nice-modal__btn--primary"
            onClick={() => setNoticeModal({ open: false, tone: "error", title: "", message: "" })}
          >
            Đã hiểu
          </button>
        }
      >
        <p>{noticeModal.message}</p>
      </NiceModal>
    </div>
  );
}
