import React, { useEffect, useState } from "react";
import "./OwnerReceiptsPage.css";
import { ownerGetReceipts, ownerGetReceiptDetail } from "../../../services/ownerPurchaseService";

const statusBadge = (status) => {
  const map = {
    draft: "Nháp",
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Bị từ chối",
  };
  return map[status] || status;
};

export default function OwnerReceiptsPage() {
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const res = await ownerGetReceipts({ page, limit: 10 });
      setReceipts(res?.data?.data ?? []);
      setMeta(res?.data?.meta ?? { page, limit: 10, totalItems: 0, totalPages: 1 });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (receiptId) => {
    try {
      const res = await ownerGetReceiptDetail(receiptId);
      setDetail(res?.data?.data);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  useEffect(() => {
    fetchReceipts();
    // eslint-disable-next-line
  }, [page]);

  return (
    <div className="or-page">
      <div className="or-head">
        <div>
          <h2>Phiếu nhập kho</h2>
          <p>Quản lý phiếu nhập kho thiết bị</p>
        </div>
      </div>

      <div className="or-container">
        {/* List */}
        <div className="or-list">
          {loading && <div className="or-loading">Đang tải...</div>}
          
          <div className="or-table-wrap">
            <table className="or-table">
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Đơn mua</th>
                  <th>Gym</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt) => (
                  <tr
                    key={receipt.id}
                    onClick={() => {
                      fetchDetail(receipt.id);
                      setShowDetailModal(true);
                    }}
                  >
                    <td>#{receipt.id}</td>
                    <td>#{receipt.purchaseOrder?.id || "-"}</td>
                    <td>{receipt.gym?.name || "-"}</td>
                    <td>
                      <span className={`or-badge or-badge-${receipt.status}`}>
                        {statusBadge(receipt.status)}
                      </span>
                    </td>
                    <td>{new Date(receipt.createdAt).toLocaleDateString("vi-VN")}</td>
                  </tr>
                ))}
                {receipts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="or-empty">
                      Không có phiếu nhập
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
                <h3>Chi tiết phiếu nhập #{detail.id}</h3>
                <button className="modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="detail-grid">
                  <div className="detail-row">
                    <span className="detail-label">ID</span>
                    <span className="detail-value">#{detail.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Đơn mua</span>
                    <span className="detail-value">#{detail.purchaseOrder?.id || "-"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Gym</span>
                    <span className="detail-value">{detail.gym?.name || "-"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Trạng thái</span>
                    <span className="detail-value">
                      <span className={`or-badge or-badge-${detail.status}`}>
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
                <div className="or-items-table">
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
