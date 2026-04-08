import React, { useCallback, useEffect, useState } from "react";
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
    await adminPurchaseWorkflowService.approvePurchaseRequest(row.id);
    await fetchList();
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
    await adminPurchaseWorkflowService.confirmPurchaseRequestPaymentAndShip(row.id);
    await fetchList();
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
    </div>
  );
}

const th = { textAlign: "left", padding: "12px 12px", fontSize: 12, opacity: 0.85 };
const thRight = { ...th, textAlign: "right" };
const td = { padding: "12px 12px", borderTop: "1px solid rgba(255,255,255,0.08)", verticalAlign: "top" };
const tdRight = { ...td, textAlign: "right", whiteSpace: "nowrap" };
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
