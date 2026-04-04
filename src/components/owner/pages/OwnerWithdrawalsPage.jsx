import React, { useCallback, useEffect, useState } from "react";
import {
  ownerGetWithdrawals,
  ownerExportWithdrawals,
  ownerApproveWithdrawal,
  ownerRejectWithdrawal,
} from "../../../services/ownerWithdrawalService";
import { connectSocket } from "../../../services/socketClient";
import NiceModal from "../../common/NiceModal";
import "./OwnerWithdrawalsPage.css";

const formatMoney = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

const OwnerWithdrawalsPage = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [filters, setFilters] = useState({ status: "" });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [alertModal, setAlertModal] = useState(null);

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

  const fillActionContext = (id) => {
    const w = withdrawals.find((x) => Number(x.id) === Number(id));
    return {
      id,
      ptName: w?.Trainer?.User?.username || "N/A",
      amountLabel: w ? formatMoney(w.amount) : "",
    };
  };

  const openApproveDialog = (id) => {
    setActionModal({ type: "approve", note: "", ...fillActionContext(id) });
  };

  const openRejectDialog = (id) => {
    setActionModal({ type: "reject", note: "", ...fillActionContext(id) });
  };

  const closeActionModal = () => {
    if (actionSubmitting) return;
    setActionModal(null);
  };

  const submitAction = async () => {
    if (!actionModal) return;
    setActionSubmitting(true);
    try {
      if (actionModal.type === "approve") {
        await ownerApproveWithdrawal(actionModal.id, { notes: actionModal.note.trim() });
      } else {
        await ownerRejectWithdrawal(actionModal.id, actionModal.note.trim());
      }
      setActionModal(null);
      setSelectedRequest(null);
      await loadWithdrawals();
    } catch (e) {
      console.error("Lỗi xử lý yêu cầu:", e);
      setAlertModal({
        title: actionModal.type === "approve" ? "Không duyệt được" : "Không từ chối được",
        message: e.response?.data?.message || "Đã có lỗi xảy ra. Vui lòng thử lại.",
        tone: "danger",
      });
    } finally {
      setActionSubmitting(false);
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
      setAlertModal({
        title: "Xuất file thất bại",
        message: "Không thể tải file Excel. Vui lòng thử lại.",
        tone: "danger",
      });
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
              <th>Huấn luyện viên</th>
              <th>Số tiền</th>
              <th>Tài khoản</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="empty-cell">
                  Đang tải...
                </td>
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
                          <button type="button" className="btn-approve" onClick={() => openApproveDialog(w.id)}>
                            Duyệt
                          </button>
                          <button type="button" className="btn-reject" onClick={() => openRejectDialog(w.id)}>
                            Từ chối
                          </button>
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
                <td colSpan="5" className="empty-cell">
                  Không có yêu cầu
                </td>
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
              <button type="button" onClick={handleCloseDetail}>
                ×
              </button>
            </div>
            {(() => {
              const info = parseAccountInfo(selectedRequest.accountInfo);
              return (
                <div className="withdrawals-modal-body">
                  <div>
                    <strong>Huấn luyện viên:</strong> {selectedRequest.Trainer?.User?.username || "N/A"}
                  </div>
                  <div>
                    <strong>Email:</strong> {selectedRequest.Trainer?.User?.email || "N/A"}
                  </div>
                  <div>
                    <strong>Số tiền:</strong> {formatMoney(selectedRequest.amount)}
                  </div>
                  <div>
                    <strong>Phương thức:</strong> {selectedRequest.withdrawalMethod || "N/A"}
                  </div>
                  <div>
                    <strong>Ngân hàng:</strong> {info.bankName || "N/A"}
                  </div>
                  <div>
                    <strong>Số tài khoản:</strong> {info.accountNumber || "N/A"}
                  </div>
                  <div>
                    <strong>Tên chủ TK:</strong> {info.accountHolder || "N/A"}
                  </div>
                  <div>
                    <strong>Ghi chú:</strong> {selectedRequest.notes || "N/A"}
                  </div>
                  <div>
                    <strong>Trạng thái:</strong> {selectedRequest.status || "pending"}
                  </div>
                </div>
              );
            })()}
            <div className="withdrawals-modal-actions">
              {selectedRequest.status === "pending" ? (
                <>
                  <button type="button" className="btn-approve" onClick={() => openApproveDialog(selectedRequest.id)}>
                    Duyệt
                  </button>
                  <button type="button" className="btn-reject" onClick={() => openRejectDialog(selectedRequest.id)}>
                    Từ chối
                  </button>
                </>
              ) : (
                <button type="button" className="search-button" onClick={handleCloseDetail}>
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <NiceModal
        open={Boolean(actionModal)}
        onClose={closeActionModal}
        zIndex={1100}
        wide
        tone={actionModal?.type === "reject" ? "danger" : "default"}
        title={actionModal?.type === "approve" ? "Duyệt chi trả" : "Từ chối yêu cầu"}
        closeOnOverlay={!actionSubmitting}
        footer={
          <>
            <button type="button" className="nice-modal__btn nice-modal__btn--ghost" onClick={closeActionModal} disabled={actionSubmitting}>
              Huỷ
            </button>
            <button
              type="button"
              className={`nice-modal__btn ${actionModal?.type === "reject" ? "nice-modal__btn--danger" : "nice-modal__btn--primary"}`}
              onClick={submitAction}
              disabled={actionSubmitting}
            >
              {actionSubmitting ? "Đang xử lý…" : actionModal?.type === "approve" ? "Xác nhận duyệt" : "Xác nhận từ chối"}
            </button>
          </>
        }
      >
        {actionModal ? (
          <>
            <div className="nice-modal__meta">
              <div>
                <strong>Huấn luyện viên:</strong> {actionModal.ptName}
              </div>
              {actionModal.amountLabel ? (
                <div style={{ marginTop: 6 }}>
                  <strong>Số tiền:</strong> {actionModal.amountLabel}
                </div>
              ) : null}
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.5 }}>
              {actionModal.type === "approve"
                ? "Xác nhận đã chuyển khoản / chi trả theo thông tin tài khoản huấn luyện viên. Bạn có thể thêm ghi chú nội bộ (huấn luyện viên cũng sẽ thấy trong lịch sử rút tiền)."
                : "Từ chối sẽ hoàn số dư cho huấn luyện viên (nếu đã giữ tiền lúc gửi yêu cầu). Nhập lý do để huấn luyện viên nắm được."}
            </p>
            <label className="nice-modal__label" htmlFor="owner-withdrawal-note">
              {actionModal.type === "approve" ? "Ghi chú khi duyệt (tuỳ chọn)" : "Lý do từ chối (tuỳ chọn)"}
            </label>
            <textarea
              id="owner-withdrawal-note"
              className="nice-modal__textarea"
              value={actionModal.note}
              onChange={(e) => setActionModal((m) => (m ? { ...m, note: e.target.value } : m))}
              disabled={actionSubmitting}
              placeholder={actionModal.type === "approve" ? "VD: Đã CK lúc 15h, mã GD…" : "VD: Sai số tài khoản, vui lòng gửi lại…"}
            />
          </>
        ) : null}
      </NiceModal>

      <NiceModal
        open={Boolean(alertModal)}
        onClose={() => setAlertModal(null)}
        zIndex={1200}
        tone={alertModal?.tone || "danger"}
        title={alertModal?.title || "Thông báo"}
        footer={
          <button type="button" className="nice-modal__btn nice-modal__btn--primary" onClick={() => setAlertModal(null)}>
            Đã hiểu
          </button>
        }
      >
        <p>{alertModal?.message}</p>
      </NiceModal>
    </div>
  );
};

export default OwnerWithdrawalsPage;
