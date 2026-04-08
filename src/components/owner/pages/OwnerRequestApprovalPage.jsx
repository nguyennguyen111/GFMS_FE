import React, { useCallback, useEffect, useRef, useState } from "react";
import "./OwnerRequestApprovalPage.css";
import { approveRequest, rejectRequest, getRequests } from "../../../services/ownerRequestService";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import useSelectedGym from "../../../hooks/useSelectedGym";

const OwnerRequestApprovalPage = () => {
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const REQUEST_TYPE_LABELS = {
    LEAVE: "Nghỉ phép",
    SHIFT_CHANGE: "Đổi ca",
    TRANSFER_BRANCH: "Chuyển chi nhánh",
    OVERTIME: "Tăng ca",
    BECOME_TRAINER: "Đăng ký trở thành huấn luyện viên",
    BUSY_SLOT: "Xin nghỉ đột xuất",
  };

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [rejectModal, setRejectModal] = useState({ open: false, requestId: null, reason: "" });
  const latestRequestTotalRef = useRef(0);

  const getRequestGymIds = (request) => {
    const candidateIds = [
      request?.gymId,
      request?.Gym?.id,
      request?.gym?.id,
      request?.requestApplication?.gymId,
      request?.requestData?.gymId,
      request?.requestData?.application?.gymId,
      request?.requestData?.fromGymId,
      request?.requestData?.toGymId,
      request?.requestData?.targetGymId,
    ];

    return [...new Set(
      candidateIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )];
  };

  const getRequestTypeLabel = (requestType) => {
    const key = String(requestType || "").trim().toUpperCase();
    return REQUEST_TYPE_LABELS[key] || String(requestType || "Không xác định");
  };

  const fetchRequests = useCallback(async (page = 1, options = {}) => {
    const { silent = false, autoRefresh = false } = options;
    if (!silent) setLoading(true);
    try {
      const response = await getRequests({
        page,
        limit: pagination.limit,
        gymId: selectedGymId ? String(selectedGymId) : undefined,
      });
      const nextData = Array.isArray(response.data) ? response.data : [];
      const filteredData = selectedGymId
        ? nextData.filter((request) => getRequestGymIds(request).includes(Number(selectedGymId)))
        : nextData;
      const nextPagination = response.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };
      const hasNewIncomingRequest =
        latestRequestTotalRef.current > 0 && Number(nextPagination.total) > Number(latestRequestTotalRef.current);

      latestRequestTotalRef.current = Number(nextPagination.total) || 0;

      if (autoRefresh && hasNewIncomingRequest && page !== 1) {
        await fetchRequests(1, { silent: true, autoRefresh: false });
        return;
      }

      setRequests(filteredData);
      setPagination(nextPagination);
    } catch (error) {
      console.error("Error fetching requests:", error);
      setRequests([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [pagination.limit, selectedGymId]);

  useEffect(() => {
    fetchRequests(1);
  }, [fetchRequests]);

  useOwnerRealtimeRefresh({
    onRefresh: async () => {
      await fetchRequests(pagination.page || 1, { silent: true, autoRefresh: true });
    },
    events: ["notification:new", "request:changed"],
    notificationTypes: ["trainer_request"],
  });

  const handleApprove = async (requestId) => {
    try {
      await approveRequest(requestId, "Approved by Gym Owner");
      await fetchRequests(pagination.page);
    } catch (error) {
      console.error("Error approving request:", error);
    }
  };

  const handleReject = async (requestId) => {
    setRejectModal({ open: true, requestId, reason: "" });
  };

  const submitReject = async () => {
    const reason = String(rejectModal.reason || "").trim();
    if (!reason) {
      alert("Vui lòng nhập lý do từ chối.");
      return;
    }
    try {
      await rejectRequest(rejectModal.requestId, reason);
      await fetchRequests(pagination.page);
      setRejectModal({ open: false, requestId: null, reason: "" });
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };

  return (
  <div className="owner-request-approval">
    <div className="od2-main">
      <div className="od2-topbar">
        <div>
          <h1 className="od2-h1">Duyệt yêu cầu Huấn luyện viên {selectedGymName ? `- ${selectedGymName}` : ""}</h1>
          {selectedGymName ? <div className="page-subtitle">Chi nhánh đang quản lý: {selectedGymName}</div> : null}
        </div>
      </div>
      <div className="od2-content">
        {loading ? (
          <p className="loading-text">Đang tải...</p>
        ) : requests.length === 0 ? (
          <p className="empty-text">Không có yêu cầu nào</p>
        ) : (
          <>
            <div className="table-container">
              <table className="approval-table">
                <thead>
                  <tr>
                    <th>Người yêu cầu</th>
                    <th>Loại yêu cầu</th>
                    <th>Người duyệt</th>
                    <th>Lý do / Nội dung</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => {
                    const st = String(request.status || "").toLowerCase();
                    return (
                      <tr key={request.id}>
                        <td>{request.requesterUsername}</td>
                        <td>
                          <button type="button" className="type-badge type-badge-btn" disabled>
                            {getRequestTypeLabel(request.requestType)}
                          </button>
                        </td>
                        <td>{request.approverUsername || "—"}</td>
                        <td className="reason-cell">
                          <div className="request-content-wrap">
                            <div><b>Lý do:</b> {request.reason || "N/A"}</div>
                            <div><b>Nội dung:</b> {request.requestContent || "N/A"}</div>
                          </div>
                        </td>
                        <td>
                          {st === "pending" && <span className="status-pending">Chờ duyệt</span>}
                          {st === "approved" && <span className="status-approved">Đã duyệt</span>}
                          {st === "rejected" && <span className="status-rejected">Đã từ chối</span>}
                        </td>
                        <td>
                          <div className="action-buttons">
                            {st === "pending" ? (
                              <>
                                <button className="btn-approve" onClick={() => handleApprove(request.id)}>Duyệt</button>
                                <button className="btn-reject" onClick={() => handleReject(request.id)}>Từ chối</button>
                              </>
                            ) : (
                              <span className="action-done">Hoàn tất</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchRequests(pagination.page - 1)}
                  className="pagination-btn"
                >
                  Trước
                </button>
                <span className="pagination-info">Trang {pagination.page} / {pagination.totalPages}</span>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchRequests(pagination.page + 1)}
                  className="pagination-btn"
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {rejectModal.open ? (
        <div className="owner-request-modal__backdrop" onClick={() => setRejectModal({ open: false, requestId: null, reason: "" })}>
          <div className="owner-request-modal__card" onClick={(e) => e.stopPropagation()}>
            <h3>Lý do từ chối</h3>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((p) => ({ ...p, reason: e.target.value }))}
              placeholder="Nhập lý do từ chối để huấn luyện viên nắm rõ..."
              rows={4}
            />
            <div className="owner-request-modal__actions">
              <button type="button" className="btn-cancel" onClick={() => setRejectModal({ open: false, requestId: null, reason: "" })}>
                Hủy
              </button>
              <button type="button" className="btn-confirm" onClick={submitReject}>
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  </div>
);
};

export default OwnerRequestApprovalPage;