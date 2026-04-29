import React, { useCallback, useEffect, useState } from "react";
import {
  ownerCreatePurchaseRequestPayOSLink,
  ownerGetPurchaseRequests,
  ownerGetProcurementPayments,
} from "../../../services/ownerPurchaseService";
import { confirmPayosPayment } from "../../../services/paymentService";
import NiceModal from "../../common/NiceModal";
import "../OwnerDashboard.css";
import useOwnerRealtimeRefresh from "../../../hooks/useOwnerRealtimeRefresh";
import useSelectedGym from "../../../hooks/useSelectedGym";

const money = (v) => Number(v || 0).toLocaleString("vi-VN") + " đ";
const statusLabel = {
  pending: "Đang xử lý",
  completed: "Đã ghi nhận",
  failed: "Thất bại",
  refunded: "Hoàn tiền",
  cancelled: "Đã hủy",
};
const phaseLabel = { full: "Thanh toán toàn bộ" };
const requestStatusLabel = {
  approved_waiting_deposit: "Đã duyệt, chờ cọc 30%",
};

export default function OwnerProcurementPaymentsPage() {
  const { selectedGymId, selectedGymName } = useSelectedGym();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalItems: 0, limit: 10 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [payableRequests, setPayableRequests] = useState([]);
  const [payingId, setPayingId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const loadData = useCallback(async (nextPage = page) => {
    setLoading(true);
    try {
      const [paymentsRes, payableRes] = await Promise.all([
        ownerGetProcurementPayments({ page: nextPage, limit: 10 }),
        ownerGetPurchaseRequests({ page: 1, limit: 100, status: "approved_waiting_deposit" }),
      ]);
      const data = paymentsRes?.data?.data ?? [];
      const payable = payableRes?.data?.data ?? [];
      const gymFilter = (id) =>
        String(id || "") === String(selectedGymId || "");
      setRows(
        selectedGymId
          ? data.filter((row) => gymFilter(row?.purchaseOrder?.gym?.id || row?.Gym?.id || row?.gymId))
          : data
      );
      setPayableRequests(
        selectedGymId
          ? payable.filter((pr) => gymFilter(pr?.gym?.id || pr?.gymId))
          : payable
      );
      setMeta(paymentsRes?.data?.meta ?? { page: nextPage, totalPages: 1, totalItems: 0, limit: 10 });
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payosStatus = params.get("payos");
    const orderCode = params.get("orderCode");
    if (payosStatus !== "success" || !orderCode) return;

    (async () => {
      try {
        await confirmPayosPayment(orderCode);
        await loadData(page);
        alert("Xác nhận thanh toán PayOS thành công.");
      } catch (e) {
        alert(e?.response?.data?.message || e.message);
      } finally {
        params.delete("payos");
        params.delete("orderCode");
        const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        window.history.replaceState({}, document.title, next);
      }
    })();
  }, [loadData, page]);

  const handlePayWithPayOS = async (requestRow) => {
    try {
      setPayingId(requestRow.id);
      const res = await ownerCreatePurchaseRequestPayOSLink(requestRow.id);
      const checkoutUrl = res?.data?.data?.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error("Không tạo được link PayOS");
      }
      window.location.href = checkoutUrl;
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="od2-content">
      <div className="od2-h1" style={{ marginBottom: 8 }}>Thanh toán thiết bị {selectedGymName ? `- ${selectedGymName}` : ""}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginBottom: 14 }}>
        <div style={summaryCard}>
          <div style={summaryLabel}>Yêu cầu cần thanh toán</div>
          <div style={summaryValue}>{payableRequests.length}</div>
        </div>
        <div style={summaryCard}>
          <div style={summaryLabel}>Lịch sử giao dịch</div>
          <div style={summaryValue}>{meta.totalItems || rows.length}</div>
        </div>
      </div>

      <div style={panel}>
        <div style={panelHeader}>
          <b>Khoản cần thanh toán (PayOS)</b>
          <span style={{ opacity: 0.75 }}>Khả dụng: {payableRequests.length}</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr style={theadRow}>
                <th style={th}>Mã yêu cầu</th>
                <th style={th}>Gym</th>
                <th style={th}>Thiết bị</th>
                <th style={th}>Số lượng</th>
                <th style={th}>Trạng thái</th>
                <th style={th}>Số tiền</th>
                <th style={th}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {payableRequests.length === 0 ? (
                <tr><td style={tdCenter} colSpan={7}>Không có yêu cầu nào đang chờ thanh toán</td></tr>
              ) : payableRequests.map((pr) => (
                <tr key={pr.id}>
                  <td style={td}>{pr.code}</td>
                  <td style={td}>{pr.gym?.name || "-"}</td>
                  <td style={td}>{pr.equipment?.name || "-"}</td>
                  <td style={td}>{Number(pr.quantity || 0)}</td>
                  <td style={td}><span style={statusBadge(pr.status)}>{requestStatusLabel[pr.status] || pr.status}</span></td>
                  <td style={{ ...td, fontWeight: 700 }}>{money(Number(pr.quantity || 0) * Number(pr.expectedUnitPrice || 0))}</td>
                  <td style={td}>
                    <button
                      className="od2-btn"
                      style={payButton}
                      onClick={() => handlePayWithPayOS(pr)}
                      disabled={payingId === pr.id}
                    >
                      {payingId === pr.id ? "Đang tạo link..." : "Thanh toán PayOS"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={panel}>
        <div style={panelHeader}>
          <b>Lịch sử thanh toán</b>
          <span style={{ opacity: 0.75 }}>Tổng bản ghi: {meta.totalItems || rows.length}</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr style={theadRow}>
                <th style={th}>Mã GD</th>
                <th style={th}>Mã yêu cầu</th>
                <th style={th}>Gym</th>
                <th style={th}>Mô tả</th>
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
                <tr><td style={tdCenter} colSpan={8}>Chưa có giao dịch thanh toán nào</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} onClick={() => { setDetail(row); setShowModal(true); }} style={{ cursor: "pointer" }}>
                  <td style={td}>{row.transactionCode || `TX-${row.id}`}</td>
                  <td style={td}>{row.metadata?.purchaseRequestCode || `PR-${row.metadata?.purchaseRequestId || "-"}`}</td>
                  <td style={td}>{row.Gym?.name || "-"}</td>
                  <td style={td}>{row.description || "-"}</td>
                  <td style={td}>{phaseLabel[row.paymentPhase] || row.paymentPhase || "-"}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{money(row.amount)}</td>
                  <td style={td}><span style={statusBadge(row.paymentStatus)}>{statusLabel[row.paymentStatus] || row.paymentStatus || "-"}</span></td>
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

      <NiceModal
        open={Boolean(showModal && detail)}
        onClose={() => setShowModal(false)}
        title="Chi tiết thanh toán"
        tone="info"
        footer={
          <button
            type="button"
            className="nice-modal__btn nice-modal__btn--primary"
            onClick={() => setShowModal(false)}
          >
            Đã hiểu
          </button>
        }
      >
        {detail ? (
          <div style={paymentDetailModalCard}>
              <div style={detailSummaryWrap}>
                <div style={detailSummaryCard}>
                  <span style={detailSummaryLabel}>Mã giao dịch</span>
                  <strong style={detailSummaryValue}>{detail.transactionCode || `TX-${detail.id}`}</strong>
                </div>
                <div style={detailSummaryCard}>
                  <span style={detailSummaryLabel}>Số tiền</span>
                  <strong style={detailSummaryValue}>{money(detail.amount)}</strong>
                </div>
                <div style={detailSummaryCard}>
                  <span style={detailSummaryLabel}>Trạng thái</span>
                  <span style={statusBadge(detail.paymentStatus)}>
                    {statusLabel[detail.paymentStatus] || detail.paymentStatus || "-"}
                  </span>
                </div>
              </div>

              <div style={detailTableWrap}>
                <table style={detailTable}>
                  <tbody>
                    <tr>
                      <td style={detailCellLabel}>Mã yêu cầu</td>
                      <td style={detailCellValue}>{detail.metadata?.purchaseRequestCode || `PR-${detail.metadata?.purchaseRequestId || "-"}`}</td>
                    </tr>
                    <tr>
                      <td style={detailCellLabel}>Gym</td>
                      <td style={detailCellValue}>{detail.Gym?.name || "-"}</td>
                    </tr>
                    <tr>
                      <td style={detailCellLabel}>Giai đoạn</td>
                      <td style={detailCellValue}>{phaseLabel[detail.paymentPhase] || detail.paymentPhase || "-"}</td>
                    </tr>
                    <tr>
                      <td style={detailCellLabel}>Phương thức</td>
                      <td style={detailCellValue}>{String(detail.paymentMethod || "-").toUpperCase()}</td>
                    </tr>
                    <tr>
                      <td style={detailCellLabel}>Ngày giao dịch</td>
                      <td style={detailCellValue}>
                        {detail.transactionDate ? new Date(detail.transactionDate).toLocaleString("vi-VN") : "-"}
                      </td>
                    </tr>
                    <tr>
                      <td style={detailCellLabel}>Mô tả</td>
                      <td style={detailCellValue}>{detail.description || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
          </div>
        ) : null}
      </NiceModal>
    </div>
  );
}

const th = { padding: "12px 10px", textAlign: "left", fontSize: 13, color: "#cbd5e1", borderBottom: "1px solid rgba(255,255,255,0.08)" };
const td = { padding: "12px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 14 };
const tdCenter = { ...td, textAlign: "center", opacity: 0.8 };
const panel = { border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, overflow: "hidden", marginBottom: 14, background: "rgba(8, 10, 20, 0.5)" };
const panelHeader = { padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)" };
const table = { width: "100%", borderCollapse: "collapse" };
const theadRow = { background: "rgba(255,255,255,0.04)" };
const summaryCard = { border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12, background: "rgba(8, 10, 20, 0.5)" };
const summaryLabel = { fontSize: 12, color: "#94a3b8", marginBottom: 6 };
const summaryValue = { fontSize: 22, fontWeight: 700, color: "#f8fafc" };
const payButton = { background: "linear-gradient(135deg,#65a30d,#84cc16)", color: "#0f172a", border: "none", fontWeight: 700 };
const paymentDetailModalCard = {
  width: "100%",
  maxWidth: "100%",
  borderRadius: 16,
};
const detailSummaryWrap = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginBottom: 12,
};
const detailSummaryCard = {
  flex: "1 1 180px",
  minWidth: 0,
  border: "1px solid rgba(148,163,184,0.28)",
  borderRadius: 12,
  padding: "10px 12px",
  background: "rgba(15,23,42,0.45)",
  display: "grid",
  gap: 6,
};
const detailSummaryLabel = { fontSize: 12, color: "#94a3b8" };
const detailSummaryValue = { fontSize: 15, color: "#f8fafc" };
const detailTableWrap = {
  border: "1px solid rgba(148,163,184,0.25)",
  borderRadius: 12,
  overflow: "hidden",
  background: "rgba(15,23,42,0.35)",
};
const detailTable = { width: "100%", borderCollapse: "collapse" };
const detailCellLabel = {
  width: "34%",
  minWidth: 120,
  padding: "11px 12px",
  borderBottom: "1px solid rgba(148,163,184,0.2)",
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".04em",
  verticalAlign: "top",
};
const detailCellValue = {
  padding: "11px 12px",
  borderBottom: "1px solid rgba(148,163,184,0.2)",
  color: "#e2e8f0",
  fontSize: 14,
  lineHeight: 1.45,
  wordBreak: "break-word",
};
const statusBadge = (type) => ({
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  border: "1px solid",
  background:
    String(type) === "completed"
      ? "rgba(16,185,129,0.15)"
      : String(type) === "pending"
      ? "rgba(245,158,11,0.15)"
      : "rgba(148,163,184,0.15)",
  borderColor:
    String(type) === "completed"
      ? "rgba(16,185,129,0.4)"
      : String(type) === "pending"
      ? "rgba(245,158,11,0.4)"
      : "rgba(148,163,184,0.35)",
  color:
    String(type) === "completed"
      ? "#34d399"
      : String(type) === "pending"
      ? "#fbbf24"
      : "#cbd5e1",
});
