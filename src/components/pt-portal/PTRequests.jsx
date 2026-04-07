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

import "./PTRequests.css";

const REQUEST_TYPES = [
  { value: "LEAVE", label: "Nghỉ phép" },
  { value: "SHIFT_CHANGE", label: "Đổi ca" },
  { value: "TRANSFER_BRANCH", label: "Chuyển chi nhánh" },
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
  SHIFT_CHANGE: { currentShiftId: "", targetShiftId: "", reason: "" },
  TRANSFER_BRANCH: { toBranchId: "", expectedDate: "", reason: "" },
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

    if (activeType === "SHIFT_CHANGE") {
      if (!f.currentShiftId || !f.targetShiftId) return "Cần nhập mã ca hiện tại và ca đích";
      if (String(f.currentShiftId) === String(f.targetShiftId)) return "Ca đích phải khác ca hiện tại";
      return null;
    }

    if (activeType === "TRANSFER_BRANCH") {
      if (!f.toBranchId) return "Cần nhập mã chi nhánh đích";
      if (!f.expectedDate) return "Cần chọn ngày dự kiến";
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
    if (activeType === "SHIFT_CHANGE") {
      return {
        reason: f.reason,
        data: { currentShiftId: Number(f.currentShiftId), targetShiftId: Number(f.targetShiftId) },
      };
    }
    if (activeType === "TRANSFER_BRANCH") {
      return {
        reason: f.reason,
        data: { toBranchId: Number(f.toBranchId), expectedDate: f.expectedDate },
      };
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

  const handleSubmit = async () => {
    const errMsg = validate();
    if (errMsg) return alert(errMsg);

    try {
      const payload = buildPayload();

      if (activeType === "LEAVE") await createLeaveRequest(payload);
      if (activeType === "SHIFT_CHANGE") await createShiftChangeRequest(payload);
      if (activeType === "TRANSFER_BRANCH") await createTransferBranchRequest(payload);
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

          {activeType === "SHIFT_CHANGE" && (
            <div className="ptr-grid2">
              <div className="ptr-field">
                <label>Mã ca hiện tại</label>
                <input
                  type="number"
                  value={currentForm.currentShiftId}
                  onChange={(e) => updateForm("currentShiftId", e.target.value)}
                  placeholder="Ví dụ: 12"
                />
              </div>

              <div className="ptr-field">
                <label>Mã ca đích</label>
                <input
                  type="number"
                  value={currentForm.targetShiftId}
                  onChange={(e) => updateForm("targetShiftId", e.target.value)}
                  placeholder="Ví dụ: 20"
                />
              </div>

              <div className="ptr-field" style={{ gridColumn: "1 / -1" }}>
                <label>Lý do</label>
                <textarea value={currentForm.reason} onChange={(e) => updateForm("reason", e.target.value)} placeholder="Tuỳ chọn" />
              </div>
            </div>
          )}

           {activeType === "TRANSFER_BRANCH" && (
            <div className="ptr-grid2">
              <div className="ptr-field">
                <label>Mã chi nhánh đích</label>
                <input
                  type="number"
                  value={currentForm.toBranchId}
                  onChange={(e) => updateForm("toBranchId", e.target.value)}
                  placeholder="Ví dụ: 3"
                />
              </div>

              <div className="ptr-field">
                <label>Ngày dự kiến</label>
                <input type="date" value={currentForm.expectedDate} onChange={(e) => updateForm("expectedDate", e.target.value)} />
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
                requests.map((r) => (
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
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
