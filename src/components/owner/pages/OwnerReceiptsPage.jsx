import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./OwnerReceiptsPage.css";
import { ownerGetReceipts, ownerGetReceiptDetail } from "../../../services/ownerPurchaseService";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import useSelectedGym from "../../../hooks/useSelectedGym";

const statusBadge = (status) => {
  const map = {
    pending: "Chờ xác nhận",
    completed: "Đã hoàn tất",
    cancelled: "Đã hủy",
  };
  return map[status] || status;
};

export default function OwnerReceiptsPage() {
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const PAGE_SIZE = 10;
  const [searchParams] = useSearchParams();
  const openedReceiptRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detail, setDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchReceipts = useCallback(async (targetPage = page, targetSearch = searchTerm, targetStatus = statusFilter) => {
    setLoading(true);
    try {
      const params = {
        page: targetPage,
        limit: PAGE_SIZE,
        q: targetSearch || undefined,
        status: targetStatus !== "all" ? targetStatus : undefined,
        gymId: selectedGymId ? String(selectedGymId) : undefined,
      };

      const res = await ownerGetReceipts(params);
      const data = res?.data?.data ?? [];
      setReceipts(
        selectedGymId
          ? data.filter((receipt) => String(receipt?.gym?.id || receipt?.purchaseOrder?.gym?.id || receipt?.gymId || "") === String(selectedGymId))
          : data
      );
      setMeta(res?.data?.meta ?? { page: targetPage, limit: PAGE_SIZE, totalItems: 0, totalPages: 1 });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, selectedGymId, statusFilter]);

  const applySearch = () => {
    const nextSearch = searchInput.trim();
    setSearchTerm(nextSearch);
    if (page === 1) {
      fetchReceipts(1, nextSearch, statusFilter);
      return;
    }
    setPage(1);
  };

  const resetSearch = () => {
    setSearchInput("");
    setSearchTerm("");
    setStatusFilter("all");
    if (page === 1) {
      fetchReceipts(1, "", "all");
      return;
    }
    setPage(1);
  };

  const fetchDetail = useCallback(async (receiptId) => {
    try {
      const res = await ownerGetReceiptDetail(receiptId);
      setDetail(res?.data?.data);
      setShowDetailModal(true);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  useOwnerRealtimeRefresh({
    onRefresh: async () => {
      await fetchReceipts(page, searchTerm, statusFilter);
      if (detail?.id) {
        await fetchDetail(detail.id);
      }
    },
    events: ["notification:new"],
    notificationTypes: ["receipt", "purchaseorder"],
  });

  useEffect(() => {
    const receiptId = searchParams.get("receiptId");
    if (!receiptId || openedReceiptRef.current === receiptId) return;
    openedReceiptRef.current = receiptId;
    fetchDetail(receiptId);
  }, [fetchDetail, searchParams]);

  return (
    <div className="or-page">
      <div className="or-head">
        <div>
          <h2>Phiếu nhận hàng</h2>
          <p>Theo dõi phiếu nhận hàng từ đơn mua {selectedGymName ? `của ${selectedGymName}` : ""}</p>
        </div>
      </div>

      <div className="or-filters">
        <input
          className="or-search-input"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applySearch();
          }}
          placeholder="Tìm theo mã phiếu hoặc mã đơn mua"
        />
        <select
          className="or-status-select"
          value={statusFilter}
          onChange={(e) => {
            const nextStatus = e.target.value;
            setStatusFilter(nextStatus);
            if (page === 1) {
              fetchReceipts(1, searchTerm, nextStatus);
            } else {
              setPage(1);
            }
          }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="draft">Nháp</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Bị từ chối</option>
        </select>
        <button className="or-filter-btn" onClick={applySearch}>Tìm kiếm</button>
        <button className="or-filter-btn or-filter-btn-reset" onClick={resetSearch}>Đặt lại</button>
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
                  <th>Phòng tập</th>
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
                    }}
                  >
                    <td>{receipt.code || `#${receipt.id}`}</td>
                    <td>{receipt.purchaseOrder?.code || (receipt.purchaseOrder?.id ? `#${receipt.purchaseOrder.id}` : "-")}</td>
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
                      Không có phiếu nhận hàng
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
                <h3>Chi tiết phiếu nhận hàng #{detail.id}</h3>
                <button className="modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="detail-grid">
                  <div className="detail-row">
                    <span className="detail-label">Mã phiếu</span>
                    <span className="detail-value">{detail.code || `#${detail.id}`}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Đơn mua</span>
                    <span className="detail-value">{detail.purchaseOrder?.code || (detail.purchaseOrder?.id ? `#${detail.purchaseOrder.id}` : "-")}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phòng tập</span>
                    <span className="detail-value">{detail.gym?.name || "-"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Nhà cung cấp</span>
                    <span className="detail-value">{detail.supplier?.name || detail.purchaseOrder?.supplier?.name || "-"}</span>
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
