import React, { useCallback, useEffect, useState } from "react";
import { ownerGetProcurementPayments } from "../../../services/ownerPurchaseService";
import "../OwnerDashboard.css";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import useSelectedGym from "../../../hooks/useSelectedGym";

const money = (v) => Number(v || 0).toLocaleString("vi-VN") + " đ";
const statusLabel = {
  pending: "Chờ xử lý",
  completed: "Đã ghi nhận",
  failed: "Thất bại",
  refunded: "Hoàn tiền",
  cancelled: "Đã hủy",
};
const phaseLabel = {
  deposit: "Đặt cọc 30%",
  final: "Thanh toán còn lại",
};

export default function OwnerProcurementPaymentsPage() {
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalItems: 0, limit: 10 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const loadData = useCallback(async (nextPage = page) => {
    setLoading(true);
    try {
      const res = await ownerGetProcurementPayments({ page: nextPage, limit: 10 });
      const data = res?.data?.data ?? [];
      setRows(
        selectedGymId
          ? data.filter((row) => String(row?.purchaseOrder?.gym?.id || row?.Gym?.id || row?.gymId || "") === String(selectedGymId))
          : data
      );
      setMeta(res?.data?.meta ?? { page: nextPage, totalPages: 1, totalItems: 0, limit: 10 });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [page, selectedGymId]);

  useEffect(() => {
    loadData(page);
  }, [loadData, page]);

  useOwnerRealtimeRefresh({
    onRefresh: async () => {
      await loadData(page);
    },
    events: ["notification:new"],
    notificationTypes: ["payment"],
  });

  return (
    <div className="od2-content" style={{ maxWidth: 1200 }}>
      <div className="od2-h1" style={{ marginBottom: 8 }}>Thanh toán đơn mua {selectedGymName ? `- ${selectedGymName}` : ""}</div>
      <p style={{ opacity: 0.85, marginBottom: 18 }}>
        Theo dõi tiến độ đặt cọc 30% và thanh toán phần còn lại cho từng đơn mua. Đây là phần tài chính của flow procurement, không làm tăng tồn kho trực tiếp.
      </p>

      <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between" }}>
          <b>Lịch sử thanh toán procurement</b>
          <span style={{ opacity: 0.75 }}>Tổng bản ghi: {meta.totalItems || rows.length}</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                <th style={th}>Mã GD</th>
                <th style={th}>PO</th>
                <th style={th}>Gym</th>
                <th style={th}>NCC</th>
                <th style={th}>Giai đoạn</th>
                <th style={th}>Số tiền</th>
                <th style={th}>Trạng thái</th>
                <th style={th}>Ngày GD</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td style={tdCenter} colSpan={8}>Đang tải dữ liệu...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td style={tdCenter} colSpan={8}>Chưa có giao dịch procurement nào</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} onClick={() => { setDetail(row); setShowModal(true); }} style={{ cursor: "pointer" }}>
                  <td style={td}>{row.transactionCode || `TX-${row.id}`}</td>
                  <td style={td}>{row.purchaseOrder?.code || `PO-${row.metadata?.purchaseOrderId || "-"}`}</td>
                  <td style={td}>{row.purchaseOrder?.gym?.name || row.Gym?.name || "-"}</td>
                  <td style={td}>{row.purchaseOrder?.supplier?.name || "-"}</td>
                  <td style={td}>{phaseLabel[row.paymentPhase] || row.paymentPhase || "-"}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{money(row.amount)}</td>
                  <td style={td}><span style={badge}>{statusLabel[row.paymentStatus] || row.paymentStatus || "-"}</span></td>
                  <td style={td}>{row.transactionDate ? new Date(row.transactionDate).toLocaleString("vi-VN") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {meta.totalPages > 1 && (
        <div className="pagination" style={{ marginTop: 14 }}>
          <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Trước</button>
          <span className="pagination-info">Trang {meta.page || page} / {meta.totalPages || 1}</span>
          <button className="pagination-btn" disabled={page >= meta.totalPages} onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}>Sau</button>
        </div>
      )}

      {showModal && detail && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi tiết thanh toán procurement</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Mã giao dịch</span><span className="detail-value">{detail.transactionCode || `TX-${detail.id}`}</span></div>
                <div className="detail-row"><span className="detail-label">Đơn mua</span><span className="detail-value">{detail.purchaseOrder?.code || `PO-${detail.metadata?.purchaseOrderId || "-"}`}</span></div>
                <div className="detail-row"><span className="detail-label">Gym</span><span className="detail-value">{detail.purchaseOrder?.gym?.name || detail.Gym?.name || "-"}</span></div>
                <div className="detail-row"><span className="detail-label">Nhà cung cấp</span><span className="detail-value">{detail.purchaseOrder?.supplier?.name || "-"}</span></div>
                <div className="detail-row"><span className="detail-label">Giai đoạn</span><span className="detail-value">{phaseLabel[detail.paymentPhase] || detail.paymentPhase || "-"}</span></div>
                <div className="detail-row"><span className="detail-label">Số tiền</span><span className="detail-value">{money(detail.amount)}</span></div>
                <div className="detail-row"><span className="detail-label">Phương thức</span><span className="detail-value">{detail.paymentMethod || "-"}</span></div>
                <div className="detail-row"><span className="detail-label">Trạng thái</span><span className="detail-value">{statusLabel[detail.paymentStatus] || detail.paymentStatus || "-"}</span></div>
                <div className="detail-row detail-row--full"><span className="detail-label">Mô tả</span><span className="detail-value">{detail.description || "-"}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th = { padding: "12px 10px", textAlign: "left", fontSize: 13, color: "#cbd5e1", borderBottom: "1px solid rgba(255,255,255,0.08)" };
const td = { padding: "12px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 14 };
const tdCenter = { ...td, textAlign: "center", opacity: 0.8 };
const badge = { padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", fontSize: 12 };
