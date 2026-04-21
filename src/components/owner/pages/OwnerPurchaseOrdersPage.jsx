import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./OwnerPurchaseOrdersPage.css";
import { ownerGetPurchaseRequests } from "../../../services/ownerPurchaseService";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import useSelectedGym from "../../../hooks/useSelectedGym";

const statusBadge = (status) => ({
  submitted: "Chờ admin duyệt",
  approved_waiting_deposit: "Đã duyệt, chờ cọc 30%",
  paid_waiting_admin_confirm: "Đã thanh toán, chờ admin xác nhận",
  shipping: "Đang chuyển thiết bị",
  completed: "Hoàn tất",
  rejected: "Từ chối",
}[status] || status);

const money = (value) => Number(value || 0).toLocaleString("vi-VN") + " đ";

export default function OwnerPurchaseOrdersPage() {
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ q: "", status: "" });
  const [appliedFilters, setAppliedFilters] = useState({ q: "", status: "" });

  useEffect(() => {
    setPage(1);
  }, [selectedGymId]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ownerGetPurchaseRequests({
        page,
        limit: 10,
        q: appliedFilters.q || undefined,
        status: appliedFilters.status || undefined,
        gymId: selectedGymId ? String(selectedGymId) : undefined,
      });
      const raw = res?.data?.data ?? [];
      const flowRows = (Array.isArray(raw) ? raw : []).filter((r) =>
        ["approved_waiting_deposit", "paid_waiting_admin_confirm", "shipping", "completed"].includes(String(r.status || ""))
      );
      setOrders(flowRows);
      setMeta(res?.data?.meta ?? { page, limit: 10, totalItems: 0, totalPages: 1 });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, selectedGymId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useOwnerRealtimeRefresh({
    onRefresh: async () => {
      await fetchOrders();
    },
    events: ["notification:new"],
    notificationTypes: ["purchase_request", "payment"],
  });

  const filteredOrders = useMemo(() => {
    return orders;
  }, [orders]);

  const handleSearch = () => {
    const nextFilters = {
      q: (filters.q || "").trim(),
      status: filters.status || "",
    };
    setAppliedFilters(nextFilters);
    setPage(1);
  };

  return (
    <div className="opo-page">
      <div className="opo-head">
        <div>
          <h2>Đơn mua nội bộ</h2>
        </div>
      </div>

      <div className="opo-container">
        <div className="opo-list">
          {loading && <div className="opo-loading">Đang tải...</div>}

          <div className="opo-filters">
            <input
              type="text"
              className="opo-search-input"
              placeholder="Tìm theo mã đơn, nhà cung cấp, gym..."
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <select
              className="opo-status-select"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="approved_waiting_deposit">Đã duyệt, chờ cọc 30%</option>
              <option value="paid_waiting_admin_confirm">Đã thanh toán, chờ admin</option>
              <option value="shipping">Đang chuyển thiết bị</option>
              <option value="completed">Hoàn tất</option>
            </select>
            <button className="opo-filter-btn" onClick={handleSearch}>Tìm</button>
          </div>

          <div className="opo-table-wrap">
            <table className="opo-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Gym</th>
                  <th>Thiết bị</th>
                  <th>Số lượng</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.code || `PR-${order.id}`}</td>
                    <td>{order.gym?.name || "-"}</td>
                    <td>{order.equipment?.name || "-"}</td>
                    <td>{Number(order.quantity || 0)}</td>
                    <td>{money(Number(order.quantity || 0) * Number(order.expectedUnitPrice || 0))}</td>
                    <td>
                      <span className={`opo-badge opo-badge-${order.status}`}>
                        {statusBadge(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="opo-empty">
                      Không có đơn mua
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="pagination-btn">Trước</button>
              <span className="pagination-info">Trang {meta.page} / {meta.totalPages}</span>
              <button onClick={() => setPage(Math.min(meta.totalPages, page + 1))} disabled={page === meta.totalPages} className="pagination-btn">Sau</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
