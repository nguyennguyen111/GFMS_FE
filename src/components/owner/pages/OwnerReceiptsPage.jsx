import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./OwnerReceiptsPage.css";
import { ownerGetPurchaseRequests } from "../../../services/ownerPurchaseService";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import useSelectedGym from "../../../hooks/useSelectedGym";

const statusBadge = (status) => {
  const map = {
    shipping: "Đang chuyển thiết bị",
    completed: "Đã hoàn tất",
  };
  return map[status] || status;
};

export default function OwnerReceiptsPage() {
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const PAGE_SIZE = 10;
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

      const res = await ownerGetPurchaseRequests(params);
      const data = res?.data?.data ?? [];
      const flowRows = (Array.isArray(data) ? data : []).filter((row) =>
        ["shipping", "completed"].includes(String(row.status || ""))
      );
      setReceipts(flowRows);
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

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  useOwnerRealtimeRefresh({
    onRefresh: async () => {
      await fetchReceipts(page, searchTerm, statusFilter);
    },
    events: ["notification:new"],
    notificationTypes: ["purchase_request"],
  });

  const totalAmount = useMemo(
    () => receipts.reduce((sum, r) => sum + (Number(r.quantity || 0) * Number(r.expectedUnitPrice || 0)), 0),
    [receipts]
  );

  return (
    <div className="or-page">
      <div className="or-head">
        <div>
          <h2>Phiếu nhận hàng</h2>
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
          placeholder="Tìm theo mã yêu cầu hoặc thiết bị"
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
          <option value="shipping">Đang chuyển thiết bị</option>
          <option value="completed">Đã hoàn tất</option>
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
                  <th>Thiết bị</th>
                  <th>Phòng tập</th>
                  <th>Số lượng</th>
                  <th>Thành tiền</th>
                  <th>Trạng thái</th>
                  <th>Ngày cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <td>{receipt.code || `#${receipt.id}`}</td>
                    <td>{receipt.equipment?.name || "-"}</td>
                    <td>{receipt.gym?.name || "-"}</td>
                    <td>{Number(receipt.quantity || 0)}</td>
                    <td>{(Number(receipt.quantity || 0) * Number(receipt.expectedUnitPrice || 0)).toLocaleString("vi-VN")} đ</td>
                    <td>
                      <span className={`or-badge or-badge-${receipt.status}`}>
                        {statusBadge(receipt.status)}
                      </span>
                    </td>
                    <td>{receipt.updatedAt ? new Date(receipt.updatedAt).toLocaleDateString("vi-VN") : "-"}</td>
                  </tr>
                ))}
                {receipts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="or-empty">
                      Không có phiếu nhận hàng
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10, opacity: 0.85 }}>
            Tổng giá trị giao nhận hiển thị: <b>{totalAmount.toLocaleString("vi-VN")} đ</b>
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
      </div>
    </div>
  );
}
