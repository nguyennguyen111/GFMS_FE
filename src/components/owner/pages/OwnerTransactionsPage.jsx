import React, { useCallback, useEffect, useState } from "react";
import ownerTransactionService from "../../../services/ownerTransactionService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import "./OwnerTransactionsPage.css";

const statusLabel = {
  pending: "Chờ thanh toán",
  completed: "Đã thanh toán",
  failed: "Thất bại",
  refunded: "Hoàn tiền",
  cancelled: "Đã hủy",
};

const typeLabel = {
  package_purchase: "Mua gói",
  package_renewal: "Gia hạn gói",
  booking_payment: "Thanh toán PT",
};

const formatMoney = (value) => {
  const num = Number(value || 0);
  return `${num.toLocaleString("vi-VN")}đ`;
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("vi-VN");
};

const OwnerTransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    gymId: "",
    paymentStatus: "",
    transactionType: "",
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);

  const loadGyms = useCallback(async () => {
    try {
      const response = await ownerGetMyGyms();
      setGyms(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error("Lỗi khi tải phòng gym:", error);
      setGyms([]);
    }
  }, []);

  const loadTransactions = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page,
        limit: pagination.limit,
      };
      const result = await ownerTransactionService.getMyTransactions(params);
      setTransactions(Array.isArray(result.data) ? result.data : []);
      setPagination(result.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (error) {
      console.error("Lỗi khi tải giao dịch:", error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  useEffect(() => {
    loadGyms();
    loadTransactions(1);
  }, [loadGyms, loadTransactions]);

  const handleSearch = () => {
    loadTransactions(1);
  };

  const handleOpenDetail = (tx) => {
    setSelectedTransaction(tx);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedTransaction(null);
  };

  return (
    <div className="owner-transactions-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Giao dịch mua gói</h1>
          <div className="page-subtitle">Theo dõi giao dịch học viên mua gói tập tại các phòng gym của bạn</div>
        </div>
        <div className="page-summary">
          Tổng: <strong>{pagination.total || 0}</strong> giao dịch
        </div>
      </div>

      <div className="transactions-search-filters">
        <input
          type="text"
          placeholder="Tìm theo mã GD, tên học viên, email, gói tập..."
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="search-input"
        />
        <select
          value={filters.gymId}
          onChange={(e) => setFilters({ ...filters, gymId: e.target.value })}
          className="filter-select"
        >
          <option value="">Tất cả phòng gym</option>
          {gyms.map((gym) => (
            <option key={gym.id} value={gym.id}>
              {gym.name}
            </option>
          ))}
        </select>
        <select
          value={filters.transactionType}
          onChange={(e) => setFilters({ ...filters, transactionType: e.target.value })}
          className="filter-select"
        >
          <option value="">Tất cả loại</option>
          <option value="package_purchase">Mua gói</option>
          <option value="package_renewal">Gia hạn gói</option>
        </select>
        <select
          value={filters.paymentStatus}
          onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
          className="filter-select"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="completed">Đã thanh toán</option>
          <option value="pending">Chờ thanh toán</option>
          <option value="failed">Thất bại</option>
          <option value="refunded">Hoàn tiền</option>
          <option value="cancelled">Đã hủy</option>
        </select>
        <button onClick={handleSearch} className="search-button">
          Tìm
        </button>
      </div>

      <div className="transactions-table-wrapper">
        <table className="transactions-table">
          <thead>
            <tr>
              <th>Mã GD</th>
              <th>Học viên</th>
              <th>Phòng gym</th>
              <th>Gói tập</th>
              <th>Loại</th>
              <th>Số tiền</th>
              <th>Hình thức</th>
              <th>Trạng thái</th>
              <th>Ngày giao dịch</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="transactions-empty">Đang tải dữ liệu...</td>
              </tr>
            ) : transactions.length > 0 ? (
              transactions.map((tx) => (
                <tr key={tx.id} className="tx-row" onClick={() => handleOpenDetail(tx)}>
                  <td>{tx.transactionCode || `TX-${tx.id}`}</td>
                  <td>
                    <div className="tx-user">
                      <div className="tx-user-name">{tx.Member?.User?.username || "N/A"}</div>
                      <div className="tx-user-email">{tx.Member?.User?.email || "N/A"}</div>
                    </div>
                  </td>
                  <td>{tx.Gym?.name || "N/A"}</td>
                  <td>{tx.Package?.name || "N/A"}</td>
                  <td>
                    <span className="tx-type">
                      {typeLabel[tx.transactionType] || tx.transactionType || "N/A"}
                    </span>
                  </td>
                  <td className="tx-amount">{formatMoney(tx.amount)}</td>
                  <td>{tx.paymentMethod || "N/A"}</td>
                  <td>
                    <span className={`tx-badge tx-badge-${tx.paymentStatus || "pending"}`}>
                      {statusLabel[tx.paymentStatus] || tx.paymentStatus || "N/A"}
                    </span>
                  </td>
                  <td>{formatDate(tx.transactionDate || tx.createdAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="transactions-empty">Không có giao dịch nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          disabled={pagination.page <= 1}
          onClick={() => loadTransactions(pagination.page - 1)}
          className="pagination-btn"
        >
          Trước
        </button>
        <span className="pagination-info">
          Trang {pagination.page || 1} / {pagination.totalPages || 1}
        </span>
        <button
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => loadTransactions(pagination.page + 1)}
          className="pagination-btn"
        >
          Sau
        </button>
      </div>

      {showDetailModal && selectedTransaction && (
        <div className="tx-modal" onClick={handleCloseDetail}>
          <div className="tx-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="tx-modal-header">
              <h2>Chi tiết giao dịch</h2>
              <button className="tx-modal-close" onClick={handleCloseDetail}>×</button>
            </div>
            <div className="tx-modal-body">
              <div className="tx-detail-grid">
                <div className="tx-detail-item">
                  <span className="tx-detail-label">Mã giao dịch</span>
                  <span className="tx-detail-value">
                    {selectedTransaction.transactionCode || `TX-${selectedTransaction.id}`}
                  </span>
                </div>
                <div className="tx-detail-item">
                  <span className="tx-detail-label">Học viên</span>
                  <span className="tx-detail-value">
                    {selectedTransaction.Member?.User?.username || "N/A"}
                  </span>
                </div>
                <div className="tx-detail-item">
                  <span className="tx-detail-label">Email</span>
                  <span className="tx-detail-value">
                    {selectedTransaction.Member?.User?.email || "N/A"}
                  </span>
                </div>
                <div className="tx-detail-item">
                  <span className="tx-detail-label">Số điện thoại</span>
                  <span className="tx-detail-value">
                    {selectedTransaction.Member?.User?.phone || "N/A"}
                  </span>
                </div>
                <div className="tx-detail-item">
                  <span className="tx-detail-label">Phòng gym</span>
                  <span className="tx-detail-value">
                    {selectedTransaction.Gym?.name || "N/A"}
                  </span>
                </div>
                <div className="tx-detail-item">
                  <span className="tx-detail-label">Gói tập</span>
                  <span className="tx-detail-value">
                    {selectedTransaction.Package?.name || "N/A"}
                  </span>
                </div>
                <div className="tx-detail-item">
                  <span className="tx-detail-label">Loại giao dịch</span>
                  <span className="tx-detail-value">
                    {typeLabel[selectedTransaction.transactionType] || selectedTransaction.transactionType || "N/A"}
                  </span>
                </div>
                <div className="tx-detail-item">
                  <span className="tx-detail-label">Số tiền</span>
                  <span className="tx-detail-value tx-amount">
                    {formatMoney(selectedTransaction.amount)}
                  </span>
                </div>
                <div className="tx-detail-item">
                  <span className="tx-detail-label">Hình thức</span>
                  <span className="tx-detail-value">
                    {selectedTransaction.paymentMethod || "N/A"}
                  </span>
                </div>
                <div className="tx-detail-item">
                  <span className="tx-detail-label">Trạng thái</span>
                  <span className={`tx-badge tx-badge-${selectedTransaction.paymentStatus || "pending"}`}>
                    {statusLabel[selectedTransaction.paymentStatus] || selectedTransaction.paymentStatus || "N/A"}
                  </span>
                </div>
                <div className="tx-detail-item">
                  <span className="tx-detail-label">Ngày giao dịch</span>
                  <span className="tx-detail-value">
                    {formatDate(selectedTransaction.transactionDate || selectedTransaction.createdAt)}
                  </span>
                </div>
                <div className="tx-detail-item tx-detail-full">
                  <span className="tx-detail-label">Mô tả</span>
                  <span className="tx-detail-value">
                    {selectedTransaction.description || "N/A"}
                  </span>
                </div>
              </div>
            </div>
            <div className="tx-modal-footer">
              <button className="pagination-btn" onClick={handleCloseDetail}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerTransactionsPage;
