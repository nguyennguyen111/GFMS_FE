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

const formatDateTime = (v) => {
  try {
    if (!v) return "—";
    return new Date(v).toLocaleString("vi-VN");
  } catch {
    return "—";
  }
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

    if (activeType === "LEAVE") {
      if (!f.fromDate || !f.toDate) return "Vui lòng chọn ngày bắt đầu và kết thúc";
      if (f.fromDate > f.toDate) return "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc";
      return null;
    }

    if (activeType === "OVERTIME") {
      if (!f.date) return "Cần chọn ngày";
      if (!f.fromTime || !f.toTime) return "Cần nhập giờ bắt đầu và kết thúc";
      if (f.fromTime >= f.toTime) return "Giờ bắt đầu phải trước giờ kết thúc";
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
      alert(err?.response?.data?.message || "Không tải được danh sách đơn");
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

  useEffect(() => {
    fetchRequests();
    fetchShareRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.requestType]);

  const handleClaimShare = async (id) => {
    if (!window.confirm("Bạn muốn nhận khung giờ này?")) return;
    try {
      await ptClaimTrainerShareRequest(id);
      alert("Nhận khung giờ thành công");
      await fetchShareRequests();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Không thể nhận slot");
    }
  };

  useEffect(() => {
    const socket = connectSocket();
    const onNewNotification = (payload) => {
      if (String(payload?.notificationType || "").toLowerCase() !== "request_update") return;
      fetchRequests();
    };
    socket.on("notification:new", onNewNotification);
    return () => {
      socket.off("notification:new", onNewNotification);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.requestType]);

  const handleSubmit = async () => {
    const errMsg = validate();
    if (errMsg) return alert(errMsg);

    try {
      const payload = buildPayload();

      if (activeType === "LEAVE") await createLeaveRequest(payload);
      if (activeType === "OVERTIME") await createOvertimeRequest(payload);

      alert("Đã tạo đơn");
      resetForm();
      await fetchRequests();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Tạo đơn thất bại");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Hủy đơn này?")) return;
    try {
      await cancelRequest(id);
      await fetchRequests();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Hủy đơn thất bại");
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
                <textarea value={currentForm.reason} onChange={(e) => updateForm("reason", e.target.value)} placeholder="Tuỳ chọn" />
              </div>
            </div>
          )}

          {activeType === "OVERTIME" && (
            <div className="ptr-grid2">
              <div className="ptr-field">
                <label>Ngày</label>
                <input type="date" value={currentForm.date} onChange={(e) => updateForm("date", e.target.value)} />
              </div>

              <div className="ptr-field">
                <label>Từ giờ</label>
                <input type="time" value={currentForm.fromTime} onChange={(e) => updateForm("fromTime", e.target.value)} />
              </div>

              <div className="ptr-field">
                <label>Đến giờ</label>
                <input type="time" value={currentForm.toTime} onChange={(e) => updateForm("toTime", e.target.value)} />
              </div>

              <div className="ptr-field" style={{ gridColumn: "1 / -1" }}>
                <label>Lý do</label>
                <textarea value={currentForm.reason} onChange={(e) => updateForm("reason", e.target.value)} placeholder="Tuỳ chọn" />
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
        <p className="ptr-subtitle">Khung giờ mượn huấn luyện viên đang mở</p>
        <div className="ptr-divider" />
        <div className="ptr-tablewrap">
          <table className="ptr-table">
            <thead>
              <tr>
                <th>Gym cho mượn</th>
                <th>Gym cần huấn luyện viên</th>
                <th>Thời gian</th>
                <th>Ghi chú</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loadingShares ? (
                <tr><td colSpan={5} className="ptr-empty">Đang tải...</td></tr>
              ) : shareRequests.length === 0 ? (
                <tr><td colSpan={5} className="ptr-empty">Không có khung giờ mở</td></tr>
              ) : (
                shareRequests.map((s) => (
                  <tr key={s.id}>
                    <td>{s.fromGym?.name || `Gym #${s.fromGymId}`}</td>
                    <td>{s.toGym?.name || `Gym #${s.toGymId}`}</td>
                    <td>{s.startDate ? new Date(s.startDate).toLocaleDateString("vi-VN") : "—"} {s.startTime && s.endTime ? `(${s.startTime}-${s.endTime})` : ""}</td>
                    <td title={s.notes || ""}>{s.notes || "-"}</td>
                    <td>
                      <button className="ptr-btn primary" onClick={() => handleClaimShare(s.id)} type="button">
                        Nhận khung giờ
                      </button>
                    </td>
                  </tr>
                ))
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
                <th>Lý do</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="ptr-empty">
                    Đang tải...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="ptr-empty">
                    Không có đơn nào
                  </td>
                </tr>
              ) : (
                pagedRequests.map((r) => (
                  <tr key={r.id}>
                    <td>{REQUEST_TYPES.find((x) => x.value === r.requestType)?.label || r.requestType}</td>
                    <td>
                      <span className={`ptr-badge ${statusClass(r.status)}`}>{prettyStatus(r.status)}</span>
                    </td>
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
    </div>
  );
}
