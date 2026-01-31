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
        <h2>Đơn mua hàng</h2>
        <p>Quản lý đơn mua hàng từ nhà cung cấp</p>
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
                    onClick={() => fetchDetail(order.id)}
                    className={detail?.id === order.id ? "active" : ""}
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
            <div className="opo-pagination">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                ← Trước
              </button>
              <span>Trang {meta.page} / {meta.totalPages}</span>
              <button
                onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
                disabled={page === meta.totalPages}
              >
                Sau →
              </button>
            </div>
          )}
        </div>

        {/* Detail */}
        {detail && (
          <div className="opo-detail">
            <h3>Chi tiết đơn mua</h3>
            <div className="opo-detail-field">
              <label>ID</label>
              <div>#{detail.id}</div>
            </div>
            <div className="opo-detail-field">
              <label>Nhà cung cấp</label>
              <div>{detail.supplier?.name || "-"}</div>
            </div>
            <div className="opo-detail-field">
              <label>Gym</label>
              <div>{detail.gym?.name || "-"}</div>
            </div>
            <div className="opo-detail-field">
              <label>Báo giá</label>
              <div>#{detail.quotation?.id || "-"}</div>
            </div>
            <div className="opo-detail-field">
              <label>Trạng thái</label>
              <div>
                <span className={`opo-badge opo-badge-${detail.status}`}>
                  {statusBadge(detail.status)}
                </span>
              </div>
            </div>
            <div className="opo-detail-field">
              <label>Ghi chú</label>
              <div>{detail.notes || "-"}</div>
            </div>

            <h4 style={{ marginTop: "15px", marginBottom: "10px", color: "#f1f5f9" }}>Danh sách thiết bị</h4>
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
        )}
      </div>
    </div>
  );
}
