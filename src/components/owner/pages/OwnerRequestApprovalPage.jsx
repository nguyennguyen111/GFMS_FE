import React, { useState, useEffect } from "react";
import "./OwnerRequestApprovalPage.css";
import { approveRequest, rejectRequest, getRequests } from "../../../services/ownerRequestService";

const OwnerRequestApprovalPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await getRequests();
        setRequests(response);
      } catch (error) {
        console.error("Error fetching requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleApprove = async (requestId) => {
    try {
      await approveRequest(requestId, "Approved by Gym Owner");
      setRequests((prevRequests) =>
        prevRequests.map((request) =>
          request.id === requestId ? { ...request, status: "approved" } : request
        )
      );
    } catch (error) {
      console.error("Error approving request:", error);
    }
  };

  const handleReject = async (requestId) => {
    try {
      await rejectRequest(requestId, "Rejected by Gym Owner");
      setRequests((prevRequests) =>
        prevRequests.map((request) =>
          request.id === requestId ? { ...request, status: "rejected" } : request
        )
      );
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };

  return (
  <div className="owner-request-approval">
    <div className="od2-main">
      <div className="od2-topbar">
        <h1 className="od2-h1">Duyệt yêu cầu Huấn luyện viên</h1>
      </div>
      <div className="od2-content">
        {loading ? (
          <p className="loading-text">Đang tải...</p>
        ) : requests.length === 0 ? (
          <p className="empty-text">Không có yêu cầu nào</p>
        ) : (
          <div className="table-container">
            <table className="approval-table">
              <thead>
                <tr>
                  <th>Người yêu cầu</th>
                  <th>Loại yêu cầu</th>
                  <th>Người duyệt</th>
                  <th>Lý do</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.requesterUsername}</td>
                    <td><span className="type-badge">{request.requestType.toLowerCase()}</span></td>
                    <td>{request.approverUsername || '—'}</td>
                    <td className="reason-cell">{request.reason || 'N/A'}</td>
                    <td>
                      {request.status === 'PENDING' && <span className="status-pending">Chờ duyệt</span>}
                      {request.status === 'APPROVED' && <span className="status-approved">Đã duyệt</span>}
                      {request.status === 'REJECTED' && <span className="status-rejected">Đã từ chối</span>}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {request.status === 'PENDING' ? (
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default OwnerRequestApprovalPage;