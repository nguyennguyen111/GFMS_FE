import React, { useEffect, useState } from "react";
import "./OwnerPurchaseOrdersPage.css";
import { ownerGetPurchaseOrders, ownerGetPurchaseOrderDetail } from "../../../services/ownerPurchaseService";

const statusBadge = (status) => {
  const map = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Bị từ chối",
    received: "Đã nhận",
  };
  return map[status] || status;
};

export default function OwnerPurchaseOrdersPage() {
  const PAGE_SIZE = 10;
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detail, setDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchOrders = async (targetPage = page, targetSearch = searchTerm, targetStatus = statusFilter) => {
    setLoading(true);
    try {
      const params = {
        page: targetPage,
        limit: PAGE_SIZE,
        q: targetSearch || undefined,
        status: targetStatus !== "all" ? targetStatus : undefined,
      };

      const res = await ownerGetPurchaseOrders(params);
      setOrders(res?.data?.data ?? []);
      setMeta(res?.data?.meta ?? { page: targetPage, limit: PAGE_SIZE, totalItems: 0, totalPages: 1 });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const applySearch = () => {
    const nextSearch = searchInput.trim();
    setSearchTerm(nextSearch);
    if (page === 1) {
      fetchOrders(1, nextSearch, statusFilter);
      return;
    }
    setPage(1);
  };

  const resetSearch = () => {
    setSearchInput("");
    setSearchTerm("");
    setStatusFilter("all");
    if (page === 1) {
      fetchOrders(1, "", "all");
      return;
    }
    setPage(1);
  };

  const fetchDetail = async (orderId) => {
    try {
      const res = await ownerGetPurchaseOrderDetail(orderId);
      setDetail(res?.data?.data);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line
  }, [page, searchTerm, statusFilter]);

  return (
    <div className="opo-page">
      <div className="opo-head">
        <div>
          <h2>Đơn mua hàng</h2>
          <p>Quản lý đơn mua hàng từ nhà cung cấp</p>
        </div>
      </div>

      <div className="opo-filters">
        <input
          className="opo-search-input"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applySearch();
          }}
          placeholder="Tìm theo mã đơn hoặc nhà cung cấp"
        />
        <select
          className="opo-status-select"
          value={statusFilter}
          onChange={(e) => {
            const nextStatus = e.target.value;
            setStatusFilter(nextStatus);
            if (page === 1) {
              fetchOrders(1, searchTerm, nextStatus);
            } else {
              setPage(1);
            }
          }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Bị từ chối</option>
          <option value="received">Đã nhận</option>
        </select>
        <button className="opo-filter-btn" onClick={applySearch}>Tìm kiếm</button>
        <button className="opo-filter-btn opo-filter-btn-reset" onClick={resetSearch}>Đặt lại</button>
      </div>

      <div className="opo-container">
        {/* List */}
        <div className="opo-list">
          {loading && <div className="opo-loading">Đang tải...</div>}
          
          <div className="opo-table-wrap">
            <table className="opo-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Nhà cung cấp</th>
                  <th>Phòng tập</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => {
                      fetchDetail(order.id);
                      setShowDetailModal(true);
                    }}
                  >
                    <td>{order.code || `#${order.id}`}</td>
                    <td>{order.supplier?.name || "-"}</td>
                    <td>{order.gym?.name || "-"}</td>
                    <td>
                      <span className={`opo-badge opo-badge-${order.status}`}>
                        {statusBadge(order.status)}
                      </span>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString("vi-VN")}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="opo-empty">
                      Không có đơn mua
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={meta.page <= 1}
              className="pagination-btn"
            >
              Trước
            </button>
            <span className="pagination-info">
              Trang {meta.page || 1} / {meta.totalPages || 1}
            </span>
            <button
              onClick={() => setPage(Math.min(meta.totalPages || 1, page + 1))}
              disabled={(meta.page || 1) >= (meta.totalPages || 1)}
              className="pagination-btn"
            >
              Sau
            </button>
          </div>
        </div>

        {/* Detail Modal */}
        {showDetailModal && detail && (
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Chi tiết đơn mua #{detail.id}</h3>
                <button className="modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="detail-grid">
                  <div className="detail-row">
                    <span className="detail-label">Mã đơn</span>
                    <span className="detail-value">{detail.code || `#${detail.id}`}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Nhà cung cấp</span>
                    <span className="detail-value">{detail.supplier?.name || "-"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phòng tập</span>
                    <span className="detail-value">{detail.gym?.name || "-"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Báo giá</span>
                    <span className="detail-value">{detail.quotation?.code || (detail.quotation?.id ? `#${detail.quotation.id}` : "-")}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Trạng thái</span>
                    <span className="detail-value">
                      <span className={`opo-badge opo-badge-${detail.status}`}>
                        {statusBadge(detail.status)}
                      </span>
                    </span>
                  </div>
                  <div className="detail-row detail-row--full">
                    <span className="detail-label">Ghi chú</span>
                    <span className="detail-value">{detail.notes || "-"}</span>
                  </div>
                </div>

                <h4 style={{ marginTop: "20px", marginBottom: "12px", color: "#f1f5f9" }}>Danh sách thiết bị</h4>
                <div className="opo-items-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Thiết bị</th>
                        <th>Số lượng</th>
                        <th>Đơn giá</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.equipment?.name || "-"}</td>
                          <td>{item.quantity}</td>
                          <td>{Number(item.unitPrice || 0).toLocaleString("vi-VN")} đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
