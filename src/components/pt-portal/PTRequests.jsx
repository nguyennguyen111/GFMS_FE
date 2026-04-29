import React, { useEffect, useMemo, useState } from "react";
import {
  createLeaveRequest,
  createShiftChangeRequest,
  createTransferBranchRequest,
  createOvertimeRequest,
  getMyRequests,
  cancelRequest,
} from "../../services/ptRequestService";
import {
  ptGetAvailableTrainerShareRequests,
  ptClaimTrainerShareRequest,
} from "../../services/ptTrainerShareService";
import { connectSocket } from "../../services/socketClient";
import NiceModal from "../common/NiceModal";

import "./PTRequests.css";

const REQUEST_TYPES = [
  { value: "LEAVE", label: "Nghỉ phép" },
  { value: "OVERTIME", label: "Tăng ca" },
  { value: "BUSY_SLOT", label: "Báo bận khung giờ dạy" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
  { value: "CANCELLED", label: "Đã hủy" },
];

const REQUEST_TYPE_LABELS = {
  LEAVE: "Nghỉ phép",
  OVERTIME: "Tăng ca",
  SHIFT_CHANGE: "Đổi ca",
  TRANSFER_BRANCH: "Chuyển chi nhánh",
  BUSY_SLOT: "Báo bận khung giờ dạy",
};

const emptyForms = {
  LEAVE: { fromDate: "", toDate: "", reason: "" },
  OVERTIME: { date: "", fromTime: "", toTime: "", reason: "" },
};

const normalizeListResponse = (data) => {
  if (Array.isArray(data)) return { items: data, pagination: null };
  if (data && Array.isArray(data.items)) return { items: data.items, pagination: data.pagination || null };
  return { items: [], pagination: null };
};

const statusClass = (status) => String(status || "").toLowerCase(); // pending/approved/rejected/cancelled
const STATUS_VI = {
  pending: "chờ duyệt",
  approved: "đã duyệt",
  rejected: "từ chối",
  cancelled: "đã hủy",
};

const prettyStatus = (s) => STATUS_VI[String(s || "").toLowerCase()] || String(s || "—").toLowerCase();
const getRequestTypeLabel = (requestType) =>
  REQUEST_TYPE_LABELS[String(requestType || "").trim().toUpperCase()] || String(requestType || "—");

const getDecisionMessage = (request) => {
  const status = String(request?.status || "").trim().toLowerCase();
  const typeLabel = getRequestTypeLabel(request?.requestType);
  const note = String(request?.approveNote || "").trim();

  if (status === "approved") {
    return `Đã duyệt đơn ${typeLabel}.`;
  }
  if (status === "rejected") {
    return note ? `Đã từ chối đơn ${typeLabel}. Lý do: ${note}` : `Đã từ chối đơn ${typeLabel}.`;
  }
  if (status === "cancelled") {
    return `Đơn ${typeLabel} đã bị hủy.`;
  }
  return `Đang chờ duyệt đơn ${typeLabel}.`;
};

const formatDateTime = (v) => {
  try {
    if (!v) return "—";
    return new Date(v).toLocaleString("vi-VN");
  } catch {
    return "—";
  }
};

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const minutesNow = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

const hhmmToMin = (v) => {
  const s = String(v || "").trim();
  const m = s.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

export default function PTRequests() {
  const PAGE_SIZE = 8;
  const [activeType, setActiveType] = useState("LEAVE");
  const [forms, setForms] = useState(emptyForms);

  const [filters, setFilters] = useState({
    status: "",
    requestType: "",
  });

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shareRequests, setShareRequests] = useState([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [page, setPage] = useState(1);
  const [modalState, setModalState] = useState(null);

  const showAlert = (message, title = "Thông báo", tone = "info") => {
    setModalState({ kind: "alert", title, message, tone });
  };

  const askConfirm = (message, title = "Xác nhận") =>
    new Promise((resolve) => {
      setModalState({
        kind: "confirm",
        title,
        message,
        tone: "info",
        onConfirm: () => {
          setModalState(null);
          resolve(true);
        },
        onClose: () => {
          setModalState(null);
          resolve(false);
        },
      });
    });

  const currentForm = useMemo(() => forms[activeType], [forms, activeType]);

  const updateForm = (field, value) => {
    setForms((prev) => ({
      ...prev,
      [activeType]: { ...prev[activeType], [field]: value },
    }));
  };

  const resetForm = () => {
    setForms((prev) => ({ ...prev, [activeType]: emptyForms[activeType] }));
  };

  const validate = () => {
    const f = currentForm;
    const today = todayISO();

    if (activeType === "LEAVE") {
      if (!f.fromDate || !f.toDate) return "Vui lòng chọn ngày bắt đầu và kết thúc";
      if (f.fromDate > f.toDate) return "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc";
      if (f.fromDate < today || f.toDate < today) return "Không thể gửi đơn nghỉ phép cho ngày quá khứ";
      if (!String(f.reason || "").trim()) return "Vui lòng nhập lý do";
      return null;
    }

    if (activeType === "OVERTIME") {
      if (!f.date) return "Cần chọn ngày";
      if (!f.fromTime || !f.toTime) return "Cần nhập giờ bắt đầu và kết thúc";
      if (f.fromTime >= f.toTime) return "Giờ bắt đầu phải trước giờ kết thúc";
      if (f.date < today) return "Không thể gửi đơn tăng ca cho ngày quá khứ";
      if (f.date === today) {
        const toMin = hhmmToMin(f.toTime);
        if (toMin != null && toMin <= minutesNow()) return "Không thể gửi đơn tăng ca cho khung giờ đã qua";
      }
      if (!String(f.reason || "").trim()) return "Vui lòng nhập lý do";
      return null;
    }

    return "Loại đơn không hợp lệ";
  };

  const buildPayload = () => {
    const f = currentForm;

    if (activeType === "LEAVE") {
      return { reason: f.reason, data: { fromDate: f.fromDate, toDate: f.toDate } };
    }
    return {
      reason: f.reason,
      data: { date: f.date, fromTime: f.fromTime, toTime: f.toTime },
    };
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await getMyRequests({
        status: filters.status || undefined,
        requestType: filters.requestType || undefined,
      });

      const normalized = normalizeListResponse(data);
      setRequests(normalized.items);
      setPage(1);
    } catch (err) {
      console.error(err);
      showAlert(err?.response?.data?.message || "Không tải được danh sách đơn", "Lỗi", "danger");
    } finally {
      setLoading(false);
    }
  };

  const fetchShareRequests = async () => {
    setLoadingShares(true);
    try {
      const res = await ptGetAvailableTrainerShareRequests({ page: 1, limit: 20 });
      setShareRequests(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingShares(false);
    }
  };

  const shareRowCanClaim = (s) => {
    const st = String(s?.status || "").toLowerCase();
    const tid = s?.trainerId;
    const hasTrainer = tid != null && tid !== "";
    if (st === "open" && !hasTrainer) return true;
    if ((st === "pending_trainer" || st === "waiting_acceptance") && hasTrainer) return true;
    return false;
  };

  useEffect(() => {
    fetchRequests();
    fetchShareRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.requestType]);

  const handleClaimShare = async (id) => {
    if (!(await askConfirm("Bạn muốn nhận khung giờ này?", "Xác nhận nhận khung giờ"))) return;
    try {
      await ptClaimTrainerShareRequest(id);
      showAlert("Nhận khung giờ thành công", "Thành công", "success");
      await fetchShareRequests();
    } catch (err) {
      console.error(err);
      showAlert(err?.response?.data?.message || "Không thể nhận slot", "Lỗi", "danger");
    }
  };

  useEffect(() => {
    const socket = connectSocket();
    const onNewNotification = (payload) => {
      if (String(payload?.notificationType || "").toLowerCase() !== "request_update") return;
      fetchRequests();
    };
    const onTrainerShareChanged = () => {
      fetchShareRequests();
    };
    socket.on("notification:new", onNewNotification);
    socket.on("trainer_share:changed", onTrainerShareChanged);
    return () => {
      socket.off("notification:new", onNewNotification);
      socket.off("trainer_share:changed", onTrainerShareChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.requestType]);

  const handleSubmit = async () => {
    const errMsg = validate();
    if (errMsg) return showAlert(errMsg, "Thiếu thông tin");

    try {
      const payload = buildPayload();

      if (activeType === "LEAVE") await createLeaveRequest(payload);
      if (activeType === "OVERTIME") await createOvertimeRequest(payload);

      showAlert("Đã tạo đơn", "Thành công", "success");
      resetForm();
      await fetchRequests();
    } catch (err) {
      console.error(err);
      showAlert(err?.response?.data?.message || "Tạo đơn thất bại", "Lỗi", "danger");
    }
  };

  const handleCancel = async (id) => {
    if (!(await askConfirm("Hủy đơn này?", "Xác nhận hủy đơn"))) return;
    try {
      await cancelRequest(id);
      await fetchRequests();
    } catch (err) {
      console.error(err);
      showAlert(err?.response?.data?.message || "Hủy đơn thất bại", "Lỗi", "danger");
    }
  };

  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRequests = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return requests.slice(start, start + PAGE_SIZE);
  }, [requests, currentPage]);

  return (
    <div className="ptr-wrap">
      <div className="ptr-toprow">
        <h2 className="ptr-title">Gửi yêu cầu</h2>

        <div className="ptr-field ptr-filter">
          <label>Trạng thái</label>
          <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value || "ALL"} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* CREATE */}
      <div className="ptr-card" style={{ marginBottom: 14 }}>
        <p className="ptr-subtitle">Tạo đơn mới</p>
        <div className="ptr-divider" />

        <div className="ptr-grid2" style={{ marginBottom: 10 }}>
          <div className="ptr-field">
            <label>Loại đơn</label>
            <select value={activeType} onChange={(e) => setActiveType(e.target.value)}>
              {REQUEST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="ptr-field">
            <label>Lọc theo loại</label>
            <select
              value={filters.requestType}
              onChange={(e) => setFilters((p) => ({ ...p, requestType: e.target.value }))}
            >
              <option value="">Tất cả</option>
              {REQUEST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="ptr-form">
          {activeType === "LEAVE" && (
            <div className="ptr-grid2">
              <div className="ptr-field">
                <label>Từ ngày</label>
                <input type="date" value={currentForm.fromDate} onChange={(e) => updateForm("fromDate", e.target.value)} />
              </div>

              <div className="ptr-field">
                <label>Đến ngày</label>
                <input type="date" value={currentForm.toDate} onChange={(e) => updateForm("toDate", e.target.value)} />
              </div>

              <div className="ptr-field" style={{ gridColumn: "1 / -1" }}>
                <label>Lý do</label>
                <textarea value={currentForm.reason} onChange={(e) => updateForm("reason", e.target.value)} placeholder="Nhập lý do" />
              </div>
            </div>
          )}

          {activeType === "OVERTIME" && (
            <div className="ptr-grid2">
              <div className="ptr-field">
                <label>Từ giờ</label>
                <input type="time" value={currentForm.fromTime} onChange={(e) => updateForm("fromTime", e.target.value)} />
              </div>

              <div className="ptr-field">
                <label>Đến giờ</label>
                <input type="time" value={currentForm.toTime} onChange={(e) => updateForm("toTime", e.target.value)} />
              </div>

              <div className="ptr-field" style={{ gridColumn: "1 / -1" }}>
                <label>Ngày</label>
                <input type="date" value={currentForm.date} onChange={(e) => updateForm("date", e.target.value)} />
              </div>

              <div className="ptr-field" style={{ gridColumn: "1 / -1" }}>
                <label>Lý do</label>
                <textarea value={currentForm.reason} onChange={(e) => updateForm("reason", e.target.value)} placeholder="Nhập lý do" />
              </div>
            </div>
          )}

          <div className="ptr-actions">
            <button className="ptr-btn" onClick={resetForm} type="button">
              Đặt lại
            </button>
            <button className="ptr-btn primary" onClick={handleSubmit} type="button">
              Gửi đơn
            </button>
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="ptr-card" style={{ marginBottom: 14 }}>
        <p className="ptr-subtitle">
          Mượn huấn luyện viên 
        </p>
        <div className="ptr-divider" />
        <div className="ptr-tablewrap">
          <table className="ptr-table">
            <thead>
              <tr>
                <th>Gym cho mượn</th>
                <th>Gym cần huấn luyện viên</th>
                <th>Thời gian</th>
                <th>Giá buổi</th>
                <th>Trạng thái</th>
                <th>Ghi chú</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loadingShares ? (
                <tr><td colSpan={7} className="ptr-empty">Đang tải...</td></tr>
              ) : shareRequests.length === 0 ? (
                <tr><td colSpan={7} className="ptr-empty">Không có yêu cầu nào</td></tr>
              ) : (
                shareRequests.map((s) => {
                  const st = String(s?.status || "").toLowerCase();
                  const hasTrainer = s?.trainerId != null && s?.trainerId !== "";
                  const statusLabel =
                    st === "open"
                      ? "Mở — có thể nhận"
                      : st === "pending_trainer" || (st === "waiting_acceptance" && hasTrainer)
                        ? "Chờ bạn nhận lịch"
                        : st === "waiting_acceptance"
                          ? "Chờ chủ phòng duyệt"
                          : st === "approved"
                            ? "Đã duyệt"
                            : st || "—";
                  return (
                  <tr key={s.id}>
                    <td>{s.fromGym?.name || `Gym #${s.fromGymId}`}</td>
                    <td>{s.toGym?.name || `Gym #${s.toGymId}`}</td>
                    <td>{s.startDate ? new Date(s.startDate).toLocaleDateString("vi-VN") : "—"} {s.startTime && s.endTime ? `(${String(s.startTime).slice(0, 5)}-${String(s.endTime).slice(0, 5)})` : ""}</td>
                    <td>{s.sessionPrice != null ? s.sessionPrice.toLocaleString("vi-VN") + " đ" : "—"}</td>
                    <td>{statusLabel}</td>
                    <td title={s.notes || ""}>{s.notes || "-"}</td>
                    <td>
                      {shareRowCanClaim(s) ? (
                        <button className="ptr-btn primary" onClick={() => handleClaimShare(s.id)} type="button">
                          Nhận khung giờ
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.9rem", color: "#64748b" }}>
                          {st === "waiting_acceptance" && !hasTrainer
                            ? "Chờ chủ phòng xác nhận"
                            : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ptr-card">
        <p className="ptr-subtitle">Đơn của tôi</p>
        <div className="ptr-divider" />

        <div className="ptr-tablewrap">
          <table className="ptr-table">
            <thead>
              <tr>
                <th>Loại</th>
                <th>Trạng thái</th>
                <th>Kết quả xử lý</th>
                <th>Lý do</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="ptr-empty">
                    Đang tải...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ptr-empty">
                    Không có đơn nào
                  </td>
                </tr>
              ) : (
                pagedRequests.map((r) => (
                  <tr key={r.id}>
                    <td>{getRequestTypeLabel(r.requestType)}</td>
                    <td>
                      <span className={`ptr-badge ${statusClass(r.status)}`}>{prettyStatus(r.status)}</span>
                    </td>
                    <td title={getDecisionMessage(r)}>{getDecisionMessage(r)}</td>
                    <td title={r.reason || ""}>{r.reason || "-"}</td>
                    <td>{formatDateTime(r.createdAt)}</td>
                    <td>
                      {r.status === "PENDING" ? (
                        <button className="ptr-btn" onClick={() => handleCancel(r.id)} type="button">
                          Hủy đơn
                        </button>
                      ) : (
                        <span className="ptr-actionDone">Hoàn tất</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {requests.length > PAGE_SIZE ? (
          <div className="ptr-pager">
            <button
              type="button"
              className="ptr-btn"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trang trước
            </button>
            <span className="ptr-pagerInfo">
              Trang {currentPage}/{totalPages}
            </span>
            <button
              type="button"
              className="ptr-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Trang sau
            </button>
          </div>
        ) : null}
      </div>

      <NiceModal
        open={Boolean(modalState)}
        onClose={() => {
          if (modalState?.kind === "confirm") {
            modalState?.onClose?.();
            return;
          }
          setModalState(null);
        }}
        tone={modalState?.tone || "info"}
        title={modalState?.title || "Thông báo"}
        footer={
          modalState?.kind === "confirm" ? (
            <>
              <button type="button" className="nice-modal__btn nice-modal__btn--ghost" onClick={modalState?.onClose}>
                Hủy
              </button>
              <button type="button" className="nice-modal__btn nice-modal__btn--primary" onClick={modalState?.onConfirm}>
                Xác nhận
              </button>
            </>
          ) : (
            <button type="button" className="nice-modal__btn nice-modal__btn--primary" onClick={() => setModalState(null)}>
              Đã hiểu
            </button>
          )
        }
      >
        <p>{modalState?.message}</p>
      </NiceModal>
    </div>
  );
}
