import React, { useCallback, useEffect, useState } from "react";
import {
  ownerGetWithdrawals,
  ownerExportWithdrawals,
  ownerApproveWithdrawal,
  ownerRejectWithdrawal,
} from "../../../services/ownerWithdrawalService";
import { connectSocket } from "../../../services/socketClient";
import "./OwnerWithdrawalsPage.css";

const formatMoney = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

const OwnerWithdrawalsPage = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [filters, setFilters] = useState({ status: "" });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);

  const loadWithdrawals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ownerGetWithdrawals(filters);
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setWithdrawals(list);
    } catch (e) {
      console.error("Lỗi khi tải yêu cầu chi trả:", e);
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  useEffect(() => {
    const socket = connectSocket();
    const handleUpdate = () => {
      setNotice("Có yêu cầu chi trả mới/cập nhật.");
      loadWithdrawals();
    };
    socket.on("withdrawal:created", handleUpdate);
    socket.on("withdrawal:approved", handleUpdate);
    socket.on("withdrawal:rejected", handleUpdate);
    return () => {
      socket.off("withdrawal:created", handleUpdate);
      socket.off("withdrawal:approved", handleUpdate);
      socket.off("withdrawal:rejected", handleUpdate);
    };
  }, [loadWithdrawals]);

  const handleApprove = async (id) => {
    if (!window.confirm("Duyệt chi trả yêu cầu này?")) return;
    try {
      await ownerApproveWithdrawal(id);
      loadWithdrawals();
    } catch (e) {
      console.error("Lỗi khi duyệt:", e);
      alert(e.response?.data?.message || "Không thể duyệt yêu cầu");
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Nhập lý do từ chối (tùy chọn):");
    try {
      await ownerRejectWithdrawal(id, reason || "");
      loadWithdrawals();
    } catch (e) {
      console.error("Lỗi khi từ chối:", e);
      alert(e.response?.data?.message || "Không thể từ chối yêu cầu");
    }
  };

  const handleExport = async () => {
    try {
      const res = await ownerExportWithdrawals(filters);
      const contentType = res.headers?.["content-type"] || "";
      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "withdrawals.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Lỗi khi export:", e);
      alert("Không thể xuất file");
    }
  };

  const handleOpenDetail = (request) => {
    setSelectedRequest(request);
  };

  const handleCloseDetail = () => {
    setSelectedRequest(null);
  };

  const parseAccountInfo = (value) => {
    if (!value) return {};
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  };

  const pendingRequests = withdrawals.filter((w) => w.status === "pending");

  return (
    <div className="owner-withdrawals-page">
      <div className="page-header">
        <h1 className="page-title">Duyệt yêu cầu rút tiền</h1>
      </div>

      <div className="withdrawals-filters">
        <select
          className="filter-select"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="completed">Đã chi trả</option>
          <option value="rejected">Từ chối</option>
        </select>
        <button className="search-button" onClick={loadWithdrawals}>
          Lọc
        </button>
        <button className="search-button" onClick={handleExport}>
          Xuất Excel
        </button>
      </div>

      {notice && (
        <div className="withdrawals-notice" onClick={() => setNotice("")}>
          {notice}
        </div>
      )}

      <div className="withdrawals-queue">
        <div className="queue-title">Yêu cầu cần duyệt</div>
        <div className="queue-grid">
          {pendingRequests.length > 0 ? (
            pendingRequests.map((w) => {
              const info = parseAccountInfo(w.accountInfo);
              return (
                <div className="queue-card" key={w.id} onClick={() => handleOpenDetail(w)}>
                  <div className="queue-row">
                    <div className="queue-name">{w.Trainer?.User?.username || "N/A"}</div>
                    <span className="tx-badge tx-badge-pending">Chờ duyệt</span>
                  </div>
                  <div className="queue-amount">{formatMoney(w.amount)}</div>
                  <div className="queue-meta">
                    {w.withdrawalMethod === "bank_transfer"
                      ? `${info.bankName || ""} ${info.accountNumber || ""}`.trim()
                      : w.withdrawalMethod || "N/A"}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="queue-empty">Không có yêu cầu mới</div>
          )}
        </div>
      </div>

      <div className="withdrawals-table-wrapper">
        <table className="withdrawals-table">
          <thead>
            <tr>
              <th>PT</th>
              <th>Số tiền</th>
              <th>Tài khoản</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="empty-cell">Đang tải...</td>
              </tr>
            ) : withdrawals.length > 0 ? (
              withdrawals.map((w) => {
                const info = parseAccountInfo(w.accountInfo);
                return (
                  <tr key={w.id}>
                    <td>
                      <div className="tx-user">
                        <div className="tx-user-name">{w.Trainer?.User?.username || "N/A"}</div>
                        <div className="tx-user-email">{w.Trainer?.User?.email || "N/A"}</div>
                      </div>
                    </td>
                    <td className="tx-amount">{formatMoney(w.amount)}</td>
                    <td>
                      {w.withdrawalMethod === "bank_transfer"
                        ? `${info.bankName || ""} ${info.accountNumber || ""} ${info.accountHolder || ""}`.trim()
                        : w.withdrawalMethod || "N/A"}
                    </td>
                    <td>
                      <span className={`tx-badge tx-badge-${w.status || "pending"}`}>
                        {w.status || "pending"}
                      </span>
                    </td>
                    <td>
                      {w.status === "pending" ? (
                        <>
                          <button className="btn-approve" onClick={() => handleApprove(w.id)}>Duyệt</button>
                          <button className="btn-reject" onClick={() => handleReject(w.id)}>Từ chối</button>
                        </>
                      ) : (
                        <span className="paid-text">Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="empty-cell">Không có yêu cầu</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedRequest && (
        <div className="withdrawals-modal" onClick={handleCloseDetail}>
          <div className="withdrawals-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="withdrawals-modal-header">
              <h3>Chi tiết yêu cầu</h3>
              <button onClick={handleCloseDetail}>×</button>
            </div>
            {(() => {
              const info = parseAccountInfo(selectedRequest.accountInfo);
              return (
                <div className="withdrawals-modal-body">
                  <div><strong>PT:</strong> {selectedRequest.Trainer?.User?.username || "N/A"}</div>
                  <div><strong>Email:</strong> {selectedRequest.Trainer?.User?.email || "N/A"}</div>
                  <div><strong>Số tiền:</strong> {formatMoney(selectedRequest.amount)}</div>
                  <div><strong>Phương thức:</strong> {selectedRequest.withdrawalMethod || "N/A"}</div>
                  <div><strong>Ngân hàng:</strong> {info.bankName || "N/A"}</div>
                  <div><strong>Số tài khoản:</strong> {info.accountNumber || "N/A"}</div>
                  <div><strong>Tên chủ TK:</strong> {info.accountHolder || "N/A"}</div>
                  <div><strong>Ghi chú:</strong> {selectedRequest.notes || "N/A"}</div>
                  <div><strong>Trạng thái:</strong> {selectedRequest.status || "pending"}</div>
                </div>
              );
            })()}
            <div className="withdrawals-modal-actions">
              {selectedRequest.status === "pending" ? (
                <>
                  <button className="btn-approve" onClick={() => { handleApprove(selectedRequest.id); handleCloseDetail(); }}>
                    Duyệt
                  </button>
                  <button className="btn-reject" onClick={() => { handleReject(selectedRequest.id); handleCloseDetail(); }}>
                    Từ chối
                  </button>
                </>
              ) : (
                <button className="search-button" onClick={handleCloseDetail}>Đóng</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerWithdrawalsPage;
