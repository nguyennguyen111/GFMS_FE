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
        <h2>Phiếu nhập kho</h2>
        <p>Quản lý phiếu nhập kho thiết bị</p>
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
                    onClick={() => fetchDetail(receipt.id)}
                    className={detail?.id === receipt.id ? "active" : ""}
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
            <div className="or-pagination">
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
          <div className="or-detail">
            <h3>Chi tiết phiếu nhập</h3>
            <div className="or-detail-field">
              <label>ID</label>
              <div>#{detail.id}</div>
            </div>
            <div className="or-detail-field">
              <label>Đơn mua</label>
              <div>#{detail.purchaseOrder?.id || "-"}</div>
            </div>
            <div className="or-detail-field">
              <label>Gym</label>
              <div>{detail.gym?.name || "-"}</div>
            </div>
            <div className="or-detail-field">
              <label>Trạng thái</label>
              <div>
                <span className={`or-badge or-badge-${detail.status}`}>
                  {statusBadge(detail.status)}
                </span>
              </div>
            </div>
            <div className="or-detail-field">
              <label>Ghi chú</label>
              <div>{detail.notes || "-"}</div>
            </div>

            <h4 style={{ marginTop: "15px", marginBottom: "10px", color: "#f1f5f9" }}>Danh sách thiết bị</h4>
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
        )}
      </div>
    </div>
  );
}
