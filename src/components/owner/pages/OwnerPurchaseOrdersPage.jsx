import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./OwnerPurchaseOrdersPage.css";
import { ownerGetPurchaseOrders, ownerGetPurchaseOrderDetail } from "../../../services/ownerPurchaseService";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import useSelectedGym from "../../../hooks/useSelectedGym";

const statusBadge = (status) => {
  const map = {
    draft: "Nháp",
    approved: "Đã duyệt",
    deposit_pending: "Chờ cọc 30%",
    deposit_paid: "Đã cọc 30%",
    ordered: "Đã đặt hàng",
    partially_received: "Đã nhận một phần",
    received: "Đã nhận đủ",
    final_payment_pending: "Chờ thanh toán còn lại",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
  };
  return map[status] || status;
};

const money = (value) => Number(value || 0).toLocaleString("vi-VN") + " đ";

const paymentStageLabel = {
  not_started: "Chưa thanh toán",
  partially_paid: "Đã ghi nhận một phần",
  deposit_completed: "Đã đủ cọc 30%",
  fully_paid: "Đã thanh toán đủ",
};

const paymentStatusLabel = {
  pending: "Chờ thanh toán",
  completed: "Đã thanh toán",
  failed: "Thất bại",
  refunded: "Hoàn tiền",
  cancelled: "Đã hủy",
};

export default function OwnerPurchaseOrdersPage() {
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const [searchParams] = useSearchParams();
  const openedOrderRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [gyms, setGyms] = useState([]);
  const [filters, setFilters] = useState({ q: "", status: "", gymId: "" });
  const [appliedFilters, setAppliedFilters] = useState({ q: "", status: "", gymId: "" });
  const [detail, setDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const scopedGymId = selectedGymId ? String(selectedGymId) : "";
    setFilters((prev) => ({ ...prev, gymId: scopedGymId }));
    setAppliedFilters((prev) => ({ ...prev, gymId: scopedGymId }));
    setPage(1);
  }, [selectedGymId]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ownerGetPurchaseOrders({
        page,
        limit: 10,
        q: appliedFilters.q || undefined,
        status: appliedFilters.status || undefined,
        gymId: selectedGymId ? String(selectedGymId) : appliedFilters.gymId || undefined,
      });
      setOrders(res?.data?.data ?? []);
      setMeta(res?.data?.meta ?? { page, limit: 10, totalItems: 0, totalPages: 1 });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page]);

  const loadGyms = useCallback(async () => {
    try {
      const response = await ownerGetMyGyms();
      const list = response?.data?.data ?? response?.data ?? [];
      setGyms(Array.isArray(list) ? list : []);
    } catch (e) {
      setGyms([]);
    }
  }, []);

  const fetchDetail = useCallback(async (orderId) => {
    try {
      const res = await ownerGetPurchaseOrderDetail(orderId);
      setDetail(res?.data?.data);
      setShowDetailModal(true);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  }, []);

  useEffect(() => {
    loadGyms();
  }, [loadGyms]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useOwnerRealtimeRefresh({
    onRefresh: async () => {
      await fetchOrders();
      if (detail?.id) {
        await fetchDetail(detail.id);
      }
    },
    events: ["notification:new"],
    notificationTypes: ["purchaseorder", "payment"],
  });

  useEffect(() => {
    const purchaseOrderId = searchParams.get("purchaseOrderId");
    if (!purchaseOrderId || openedOrderRef.current === purchaseOrderId) return;
    openedOrderRef.current = purchaseOrderId;
    fetchDetail(purchaseOrderId);
  }, [fetchDetail, searchParams]);

  const filteredOrders = useMemo(() => {
    if (!appliedFilters.gymId) return orders;
    return orders.filter((item) => Number(item?.gym?.id) === Number(appliedFilters.gymId));
  }, [orders, appliedFilters.gymId]);

  const handleSearch = () => {
    const nextFilters = {
      q: (filters.q || "").trim(),
      status: filters.status || "",
      gymId: filters.gymId || "",
    };
    setAppliedFilters(nextFilters);
    setPage(1);
  };

  return (
    <div className="opo-page">
      <div className="opo-head">
        <div>
          <h2>Đơn mua hàng</h2>
          <p>Theo dõi PO theo chuẩn procurement tại {selectedGymName || "các chi nhánh"}: báo giá → đặt cọc 30% → nhận hàng → thanh toán phần còn lại</p>
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
              <option value="draft">Nháp</option>
              <option value="approved">Đã duyệt</option>
              <option value="deposit_pending">Chờ cọc 30%</option>
              <option value="deposit_paid">Đã cọc 30%</option>
              <option value="ordered">Đã đặt hàng</option>
              <option value="partially_received">Đã nhận một phần</option>
              <option value="received">Đã nhận đủ</option>
              <option value="final_payment_pending">Chờ thanh toán còn lại</option>
              <option value="completed">Hoàn tất</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <select
              className="opo-status-select"
              value={filters.gymId}
              onChange={(e) => setFilters({ ...filters, gymId: e.target.value })}
              disabled={Boolean(selectedGymId)}
            >
              <option value="">{selectedGymId ? (selectedGymName || "Chi nhánh đang quản lý") : "Tất cả phòng gym"}</option>
              {gyms.map((gym) => (
                <option key={gym.id} value={gym.id}>
                  {gym.name}
                </option>
              ))}
            </select>
            <button className="opo-filter-btn" onClick={handleSearch}>Tìm</button>
          </div>

          <div className="opo-table-wrap">
            <table className="opo-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Nhà cung cấp</th>
                  <th>Gym</th>
                  <th>Tổng tiền</th>
                  <th>Đã thanh toán</th>
                  <th>Còn lại</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const payment = order.paymentSummary || {};
                  return (
                    <tr
                      key={order.id}
                      onClick={() => {
                        fetchDetail(order.id);
                      }}
                    >
                      <td>{order.code || `PO-${order.id}`}</td>
                      <td>{order.supplier?.name || "-"}</td>
                      <td>{order.gym?.name || "-"}</td>
                      <td>{money(order.totalAmount)}</td>
                      <td>{money(payment.paidAmount)}</td>
                      <td>{money(payment.remainingAmount)}</td>
                      <td>
                        <span className={`opo-badge opo-badge-${order.status}`}>
                          {statusBadge(order.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="opo-empty">
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

        {showDetailModal && detail && (
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Chi tiết đơn mua {detail.code || `#${detail.id}`}</h3>
                <button className="modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="detail-grid">
                  <div className="detail-row"><span className="detail-label">Đơn mua</span><span className="detail-value">{detail.code || `PO-${detail.id}`}</span></div>
                  <div className="detail-row"><span className="detail-label">Nhà cung cấp</span><span className="detail-value">{detail.supplier?.name || "-"}</span></div>
                  <div className="detail-row"><span className="detail-label">Gym</span><span className="detail-value">{detail.gym?.name || "-"}</span></div>
                  <div className="detail-row"><span className="detail-label">Báo giá</span><span className="detail-value">{detail.quotation?.code || "-"}</span></div>
                  <div className="detail-row"><span className="detail-label">Trạng thái PO</span><span className="detail-value"><span className={`opo-badge opo-badge-${detail.status}`}>{statusBadge(detail.status)}</span></span></div>
                  <div className="detail-row"><span className="detail-label">Tổng tiền</span><span className="detail-value">{money(detail.totalAmount)}</span></div>
                  <div className="detail-row"><span className="detail-label">Mức cọc yêu cầu</span><span className="detail-value">{money(detail.paymentSummary?.depositRequired)}</span></div>
                  <div className="detail-row"><span className="detail-label">Đã cọc</span><span className="detail-value">{money(detail.paymentSummary?.depositPaidAmount)}</span></div>
                  <div className="detail-row"><span className="detail-label">Đã thanh toán</span><span className="detail-value">{money(detail.paymentSummary?.paidAmount)}</span></div>
                  <div className="detail-row"><span className="detail-label">Còn lại</span><span className="detail-value">{money(detail.paymentSummary?.remainingAmount)}</span></div>
                  <div className="detail-row"><span className="detail-label">Tiến độ thanh toán</span><span className="detail-value">{paymentStageLabel[detail.paymentSummary?.paymentStage] || detail.paymentSummary?.paymentStage || "-"}</span></div>
                  <div className="detail-row detail-row--full"><span className="detail-label">Ghi chú</span><span className="detail-value">{detail.notes || "-"}</span></div>
                </div>

                <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 10, color: "#f1f5f9" }}>Tóm tắt thực nhận</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    <div><div style={labelMini}>Số phiếu nhận</div><div style={valueMini}>{detail.receiptSummary?.totalReceiptCount || 0}</div></div>
                    <div><div style={labelMini}>Phiếu hoàn tất</div><div style={valueMini}>{detail.receiptSummary?.completedReceiptCount || 0}</div></div>
                    <div><div style={labelMini}>SL đã nhận</div><div style={valueMini}>{detail.receiptSummary?.totalReceivedQuantity || 0}</div></div>
                  </div>
                </div>

                <h4 style={{ marginTop: 20, marginBottom: 12, color: "#f1f5f9" }}>Danh sách thiết bị</h4>
                <div className="opo-items-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Thiết bị</th>
                        <th>Số lượng đặt</th>
                        <th>Đã nhận</th>
                        <th>Đơn giá</th>
                        <th>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.equipment?.name || "-"}</td>
                          <td>{item.quantity}</td>
                          <td>{item.receivedQuantity || 0}</td>
                          <td>{money(item.unitPrice)}</td>
                          <td>{money(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h4 style={{ marginTop: 20, marginBottom: 12, color: "#f1f5f9" }}>Lịch sử thanh toán</h4>
                <div className="opo-items-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Mã GD</th>
                        <th>Giai đoạn</th>
                        <th>Số tiền</th>
                        <th>Trạng thái</th>
                        <th>Ngày</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.paymentSummary?.transactions?.length ? detail.paymentSummary.transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td>{tx.transactionCode || `TX-${tx.id}`}</td>
                          <td>{tx.metadata?.paymentPhase === "deposit" ? "Đặt cọc 30%" : tx.metadata?.paymentPhase === "final" ? "Thanh toán còn lại" : "-"}</td>
                          <td>{money(tx.amount)}</td>
                          <td>{paymentStatusLabel[tx.paymentStatus] || tx.paymentStatus || "-"}</td>
                          <td>{tx.transactionDate ? new Date(tx.transactionDate).toLocaleString("vi-VN") : "-"}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className="opo-empty">Chưa có giao dịch thanh toán cho PO này</td></tr>
                      )}
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

const labelMini = { fontSize: 12, opacity: 0.75, marginBottom: 4 };
const valueMini = { fontSize: 20, fontWeight: 800, color: "#f8fafc" };
