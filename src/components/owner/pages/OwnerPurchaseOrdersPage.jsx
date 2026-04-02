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
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await ownerGetPurchaseOrders({ page, limit: 10 });
      setOrders(res?.data?.data ?? []);
      setMeta(res?.data?.meta ?? { page, limit: 10, totalItems: 0, totalPages: 1 });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
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
  }, [page]);

  return (
    <div className="opo-page">
      <div className="opo-head">
        <div>
          <h2>Đơn mua hàng</h2>
          <p>Quản lý đơn mua hàng từ nhà cung cấp</p>
        </div>
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
                  <th>Gym</th>
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
                    <td>#{order.id}</td>
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

          {meta.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="pagination-btn"
              >
                Trước
              </button>
              <span className="pagination-info">
                Trang {meta.page} / {meta.totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
                disabled={page === meta.totalPages}
                className="pagination-btn"
              >
                Sau
              </button>
            </div>
          )}
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
                    <span className="detail-label">ID</span>
                    <span className="detail-value">#{detail.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Nhà cung cấp</span>
                    <span className="detail-value">{detail.supplier?.name || "-"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Gym</span>
                    <span className="detail-value">{detail.gym?.name || "-"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Báo giá</span>
                    <span className="detail-value">#{detail.quotation?.id || "-"}</span>
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
