import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import adminPurchaseWorkflowService from "../../../services/adminPurchaseWorkflowService";
import { connectSocket } from "../../../services/socketClient";

const money = (v) => Number(v || 0).toLocaleString("vi-VN") + " đ";
const statusLabel = (s) =>
  ({
    submitted: "Chờ duyệt",
    approved_waiting_payment: "Đã duyệt, chờ thanh toán",
    paid_waiting_admin_confirm: "Đã thanh toán, chờ admin xác nhận",
    shipping: "Đang chuyển thiết bị",
    completed: "Hoàn tất",
    rejected: "Đã từ chối",
  }[s] || s);

export default function PurchaseWorkflowPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0 });
  const [rejecting, setRejecting] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyQ, setHistoryQ] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyMeta, setHistoryMeta] = useState({ page: 1, limit: 10, total: 0 });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRow, setDetailRow] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminPurchaseWorkflowService.getPurchaseRequests({
        q: q.trim() || undefined,
        status: status === "all" ? undefined : status,
        page,
        limit: meta.limit || 10,
      });
      setRows(res?.data?.data || []);
      setMeta(res?.data?.meta || { page: 1, limit: 10, total: 0 });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [meta.limit, page, q, status]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await adminPurchaseWorkflowService.getEquipmentSalesTransactions({
        q: historyQ.trim() || undefined,
        page: historyPage,
        limit: historyMeta.limit || 10,
      });
      setHistoryRows(res?.data?.data || []);
      setHistoryMeta(res?.data?.meta || { page: 1, limit: 10, total: 0 });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyMeta.limit, historyPage, historyQ]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    const socket = connectSocket();
    const onNotification = () => {
      fetchList();
      fetchHistory();
    };
    socket.on("notification:new", onNotification);
    const timer = setInterval(() => {
      fetchList();
      fetchHistory();
    }, 10000);
    return () => {
      clearInterval(timer);
      socket.off("notification:new", onNotification);
    };
  }, [fetchHistory, fetchList]);

  const approveRequest = async (row) => {
    if (!window.confirm(`Duyệt yêu cầu ${row.code}?`)) return;
    try {
      await adminPurchaseWorkflowService.approvePurchaseRequest(row.id);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Không thể duyệt yêu cầu.");
    }
  };

  const rejectRequest = async (row) => {
    const reason = window.prompt("Nhập lý do từ chối:");
    if (!reason) return;
    setRejecting(row.id);
    try {
      await adminPurchaseWorkflowService.rejectPurchaseRequest(row.id, { rejectionReason: reason });
      await fetchList();
    } finally {
      setRejecting(null);
    }
  };

  const confirmPaymentAndShip = async (row) => {
    if (!window.confirm(`Xác nhận đã nhận tiền và chuyển thiết bị cho ${row.code}?`)) return;
    try {
      await adminPurchaseWorkflowService.confirmPurchaseRequestPaymentAndShip(row.id);
      await fetchList();
      await fetchHistory();
      alert(`Đã xác nhận nhận tiền và chuyển thiết bị cho ${row.code}.`);
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Không thể xác nhận chuyển hàng.");
    }
  };

  const openRequestDetail = async (row) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailRow(null);
    try {
      const res = await adminPurchaseWorkflowService.getPurchaseRequestDetail(row.id);
      const detail = res?.data?.data || res?.data || null;
      setDetailRow(detail);
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Không tải được chi tiết yêu cầu.");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 12 }}>Yêu cầu bán thiết bị</div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo mã/ghi chú..." style={input} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={select}>
          <option value="all">Tất cả trạng thái</option>
          <option value="submitted">submitted</option>
          <option value="approved_waiting_payment">approved_waiting_payment</option>
          <option value="paid_waiting_admin_confirm">paid_waiting_admin_confirm</option>
          <option value="shipping">shipping</option>
          <option value="completed">completed</option>
          <option value="rejected">rejected</option>
        </select>
        <button className="ad-btn" onClick={() => { setPage(1); fetchList(); }} disabled={loading}>
          {loading ? "Đang tải..." : "Tải lại"}
        </button>
      </div>

      <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "rgba(255,255,255,0.04)" }}>
            <tr>
              <th style={th}>Mã yêu cầu</th>
              <th style={th}>Gym</th>
              <th style={th}>Thiết bị</th>
              <th style={th}>SL</th>
              <th style={th}>Đơn giá</th>
              <th style={th}>Thành tiền</th>
              <th style={th}>Trạng thái</th>
              <th style={thRight}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={td}><b>{r.code}</b></td>
                <td style={td}>{r.gym?.name || "-"}</td>
                <td style={td}>{r.equipment?.name || "-"}</td>
                <td style={td}>{Number(r.quantity || 0)}</td>
                <td style={td}>{money(r.expectedUnitPrice)}</td>
                <td style={td}>{money(Number(r.quantity || 0) * Number(r.expectedUnitPrice || 0))}</td>
                <td style={td}>{statusLabel(r.status)}</td>
                <td style={tdRight}>
                  <button className="ad-btn" onClick={() => openRequestDetail(r)}>Chi tiết</button>{" "}
                  <button className="ad-btn" onClick={() => approveRequest(r)} disabled={r.status !== "submitted"}>Duyệt</button>{" "}
                  <button className="ad-btn" onClick={() => rejectRequest(r)} disabled={r.status !== "submitted" || rejecting === r.id}>
                    {rejecting === r.id ? "Đang xử lý..." : "Từ chối"}
                  </button>{" "}
                  <button
                    className="ad-btn"
                    onClick={() => confirmPaymentAndShip(r)}
                    disabled={r.status !== "paid_waiting_admin_confirm"}
                  >
                    Xác nhận tiền & chuyển hàng
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td style={{ ...td, opacity: 0.7 }} colSpan={8}>
                  Không có dữ liệu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, opacity: 0.8 }}>
        <div>Page {meta.page} • Total: {meta.total}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="ad-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>← Prev</button>
          <button className="ad-btn" onClick={() => setPage((p) => p + 1)} disabled={rows.length < (meta.limit || 10)}>Next →</button>
        </div>
      </div>

      <div style={{ marginTop: 24, fontSize: 22, fontWeight: 800 }}>Lịch sử giao dịch bán thiết bị</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "10px 0 12px" }}>
        <input
          value={historyQ}
          onChange={(e) => setHistoryQ(e.target.value)}
          placeholder="Tìm theo owner, thiết bị, gym, mã GD, mã yêu cầu..."
          style={input}
        />
        <button className="ad-btn" onClick={() => { setHistoryPage(1); fetchHistory(); }} disabled={historyLoading}>
          {historyLoading ? "Đang tải..." : "Tìm kiếm"}
        </button>
      </div>

      <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "rgba(255,255,255,0.04)" }}>
            <tr>
              <th style={th}>Mã GD</th>
              <th style={th}>Mã yêu cầu</th>
              <th style={th}>Owner</th>
              <th style={th}>Gym</th>
              <th style={th}>Thiết bị</th>
              <th style={th}>Số lượng</th>
              <th style={th}>Số tiền</th>
              <th style={th}>Trạng thái</th>
              <th style={th}>Ngày giao dịch</th>
            </tr>
          </thead>
          <tbody>
            {historyRows.map((r) => (
              <tr key={r.id}>
                <td style={td}><b>{r.transactionCode || "-"}</b></td>
                <td style={td}>{r.purchaseRequestCode || "-"}</td>
                <td style={td}>{r.owner || "-"}</td>
                <td style={td}>{r.gymName || "-"}</td>
                <td style={td}>{r.equipmentName || "-"}</td>
                <td style={td}>{Number(r.quantity || 0)}</td>
                <td style={td}>{money(r.amount)}</td>
                <td style={td}>{r.paymentStatus === "completed" ? "Đã ghi nhận" : "Đang xử lý"}</td>
                <td style={td}>{r.transactionDate ? new Date(r.transactionDate).toLocaleString("vi-VN") : "-"}</td>
              </tr>
            ))}
            {!historyRows.length && (
              <tr>
                <td style={{ ...td, opacity: 0.7 }} colSpan={9}>
                  Không có lịch sử giao dịch.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, opacity: 0.8 }}>
        <div>Page {historyMeta.page} • Total: {historyMeta.total}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="ad-btn" onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} disabled={historyPage <= 1}>← Prev</button>
          <button className="ad-btn" onClick={() => setHistoryPage((p) => p + 1)} disabled={historyRows.length < (historyMeta.limit || 10)}>Next →</button>
        </div>
      </div>

      {detailOpen
        ? createPortal(
            <div style={modalBackdrop} onMouseDown={() => setDetailOpen(false)}>
              <div style={modalCard} onMouseDown={(e) => e.stopPropagation()}>
                <div style={modalHead}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>Chi tiết yêu cầu bán thiết bị</div>
                  <button className="ad-btn" onClick={() => setDetailOpen(false)}>Đóng</button>
                </div>

                {detailLoading ? (
                  <div style={{ opacity: 0.8 }}>Đang tải chi tiết...</div>
                ) : (
                  <div style={detailGrid}>
                    <div><b>Mã yêu cầu:</b> {detailRow?.code || "-"}</div>
                    <div><b>Trạng thái:</b> {statusLabel(detailRow?.status)}</div>
                    <div><b>Gym:</b> {detailRow?.gym?.name || "-"}</div>
                    <div><b>Thiết bị:</b> {detailRow?.equipment?.name || "-"}</div>
                    <div><b>Số lượng:</b> {Number(detailRow?.quantity || 0)}</div>
                    <div><b>Đơn giá:</b> {money(detailRow?.expectedUnitPrice || 0)}</div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <b>Owner mua thiết bị:</b>{" "}
                      {detailRow?.requester?.username || detailRow?.requester?.email || "Không có thông tin"}
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <b>Email owner:</b> {detailRow?.requester?.email || "-"}
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <b>Ghi chú:</b> {detailRow?.notes || "-"}
                    </div>
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

const th = { textAlign: "left", padding: "12px 12px", fontSize: 12, opacity: 0.85 };
const thRight = { ...th, textAlign: "right" };
const td = { padding: "12px 12px", borderTop: "1px solid rgba(255,255,255,0.08)", verticalAlign: "top" };
const tdRight = { ...td, textAlign: "right", whiteSpace: "nowrap" };
const modalBackdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.62)",
  display: "grid",
  placeItems: "center",
  zIndex: 1000,
  padding: 16,
};
const modalCard = {
  width: 720,
  maxWidth: "96vw",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,.14)",
  background: "rgba(12,18,28,.95)",
  padding: 16,
  color: "#eef2ff",
};
const modalHead = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
};
const detailGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
  lineHeight: 1.5,
};
const input = {
  width: "100%",
  maxWidth: 420,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "#eef2ff",
};
const select = {
  width: 260,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "#eef2ff",
};
