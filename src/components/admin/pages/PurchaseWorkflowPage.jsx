import React, { useEffect, useMemo, useState } from "react";
import adminPurchaseWorkflowService from "../../../services/adminPurchaseWorkflowService";

const money = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString("vi-VN") + " đ";
};

// ✅ Format số theo kiểu VN: 9500000 -> 9.500.000
const formatVNDInput = (rawDigits) => {
  const s = String(rawDigits || "").replace(/\D/g, ""); // chỉ giữ số
  if (!s) return "";
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// ✅ Parse về number (bỏ dấu .)
const parseVNDInputToNumber = (displayOrDigits) => {
  const cleaned = String(displayOrDigits || "")
    .replace(/\./g, "")
    .replace(/[^\d]/g, "")
    .trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
};

const Badge = ({ children }) => (
  <span
    style={{
      padding: "4px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.16)",
      background: "rgba(255,255,255,0.06)",
      fontSize: 12,
      display: "inline-block",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

const Modal = ({ open, title, onClose, children, width = 920 }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 999,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          width: "min(96vw, " + width + "px)",
          maxHeight: "86vh",
          overflow: "auto",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(15,22,33,0.92)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
          padding: 16,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
          <button className="ad-btn" onClick={onClose}>
            Đóng
          </button>
        </div>
        <div style={{ height: 12 }} />
        {children}
      </div>
    </div>
  );
};

export default function PurchaseWorkflowPage() {
  const [tab, setTab] = useState("quotations"); // quotations | purchaseOrders | receipts | payments

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [gymId, setGymId] = useState("");
  const [supplierId, setSupplierId] = useState("");

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0 });
  const [loading, setLoading] = useState(false);

  // ===== Payments summary for list (Paid/Remaining) =====
  const [paymentSummaryByPO, setPaymentSummaryByPO] = useState({});
  const [paymentSummaryLoading, setPaymentSummaryLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  // Enterprise: timeline + payment history inside detail
  const [detailTimeline, setDetailTimeline] = useState([]);
  const [detailTimelineLoading, setDetailTimelineLoading] = useState(false);
  const [detailPayments, setDetailPayments] = useState([]);
  const [detailPaymentsLoading, setDetailPaymentsLoading] = useState(false);

  // Enterprise: edit receipt items for partial delivery
  const [receiptDraftItems, setReceiptDraftItems] = useState([]);
  const [receiptSaving, setReceiptSaving] = useState(false);

  const detailItems = useMemo(() => {
    const d = detail || {};
    const items = d.items || d.data?.items || d.quotationItems || d.purchaseOrderItems || d.receiptItems || [];
    return Array.isArray(items) ? items : [];
  }, [detail]);

  const closeDetail = () => {
    setDetailOpen(false);
    setDetail(null);
    setDetailTimeline([]);
    setDetailPayments([]);
    setReceiptDraftItems([]);
  };

  const saveReceiptDraft = async () => {
    if (!detail || tab !== "receipts") return;
    try {
      setReceiptSaving(true);
      await adminPurchaseWorkflowService.updateReceiptItems(detail.id, {
        items: receiptDraftItems.map((x) => ({ id: x.id, quantity: Number(x.quantity || 0), notes: x.notes })),
      });
      const refreshed = await adminPurchaseWorkflowService.getReceiptDetail(detail.id);
      setDetail(refreshed.data);
      alert("Đã lưu receipt items.");
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setReceiptSaving(false);
    }
  };

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // ===== LEVEL 2: payment modal + calculation =====
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentPO, setPaymentPO] = useState(null);

  // ✅ LƯU "SỐ SẠCH" (digits), KHÔNG lưu dấu chấm
  const [paymentAmount, setPaymentAmount] = useState("");

  // ✅ default method hợp lệ
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");

  const [paymentTxs, setPaymentTxs] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const totalPO = useMemo(() => Number(paymentPO?.totalAmount || 0), [paymentPO]);

  const totalPaid = useMemo(() => {
    return (paymentTxs || [])
      .filter((t) => (t.paymentStatus || t.status) === "completed")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [paymentTxs]);

  const remaining = useMemo(() => Math.max(0, totalPO - totalPaid), [totalPO, totalPaid]);

  const parsedPaymentAmount = useMemo(() => {
    const n = parseVNDInputToNumber(paymentAmount);
    return Number.isFinite(n) ? n : NaN;
  }, [paymentAmount]);

  const paymentInvalidReason = useMemo(() => {
    if (!paymentPO) return "Chưa chọn PO";
    if (remaining <= 0) return "PO đã được thanh toán đủ";
    if (!Number.isFinite(parsedPaymentAmount) || parsedPaymentAmount <= 0) return "Số tiền không hợp lệ";
    if (parsedPaymentAmount > remaining) return `Vượt quá remaining (${remaining.toLocaleString("vi-VN")} đ)`;
    return "";
  }, [paymentPO, remaining, parsedPaymentAmount]);

  const isPaymentDisabled = !!paymentInvalidReason || paymentLoading;

  const loadPaymentSummariesForPOs = async (pos) => {
    if (!Array.isArray(pos) || pos.length === 0) {
      setPaymentSummaryByPO({});
      return;
    }
    setPaymentSummaryLoading(true);
    try {
      const results = await Promise.all(
        pos.map(async (po) => {
          try {
            const res = await adminPurchaseWorkflowService.getPaymentsByPO(po.id);
            const txs = res.data?.data || res.data || [];
            const paid = (txs || [])
              .filter((t) => String(t.paymentStatus || t.status || "").toLowerCase() === "completed")
              .reduce((sum, t) => sum + Number(t.amount || 0), 0);
            const total = Number(po.totalAmount || 0);
            const remaining = Math.max(0, total - paid);
            return [po.id, { paid, remaining, count: txs.length }];
          } catch (e) {
            const total = Number(po.totalAmount || 0);
            return [po.id, { paid: 0, remaining: total, count: 0 }];
          }
        })
      );

      const map = {};
      for (const [id, val] of results) map[id] = val;
      setPaymentSummaryByPO(map);
    } finally {
      setPaymentSummaryLoading(false);
    }
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = {
        q: q.trim() || undefined,
        status: status === "all" ? undefined : status,
        gymId: gymId.trim() || undefined,
        supplierId: supplierId.trim() || undefined,
        page: meta.page,
        limit: meta.limit,
        type: tab === "receipts" ? "inbound" : undefined,
      };

      if (tab === "quotations") {
        const res = await adminPurchaseWorkflowService.getQuotations(params);
        setRows(res.data?.data || []);
        setMeta(res.data?.meta || meta);
      } else if (tab === "purchaseOrders") {
        const res = await adminPurchaseWorkflowService.getPurchaseOrders(params);
        setRows(res.data?.data || []);
        setMeta(res.data?.meta || meta);
      } else if (tab === "receipts") {
        const res = await adminPurchaseWorkflowService.getReceipts(params);
        setRows(res.data?.data || []);
        setMeta(res.data?.meta || meta);
      } else {
        // payments tab: list PO
        const res = await adminPurchaseWorkflowService.getPurchaseOrders(params);
        const list = res.data?.data || [];
        setRows(list);
        setMeta(res.data?.meta || meta);
        await loadPaymentSummariesForPOs(list);
      }
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMeta((m) => ({ ...m, page: 1 }));
    if (tab !== "payments") setPaymentSummaryByPO({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, meta.page, meta.limit]);

  const openDetail = async (row) => {
    try {
      let res;
      if (tab === "quotations") res = await adminPurchaseWorkflowService.getQuotationDetail(row.id);
      if (tab === "purchaseOrders") res = await adminPurchaseWorkflowService.getPurchaseOrderDetail(row.id);
      if (tab === "receipts") res = await adminPurchaseWorkflowService.getReceiptDetail(row.id);
      if (tab === "payments") res = await adminPurchaseWorkflowService.getPurchaseOrderDetail(row.id);

      const d = res.data;
      setDetail(d);
      setDetailOpen(true);

      // Enterprise: load timeline + payments for PO
      if (tab === "purchaseOrders" || tab === "payments") {
        setDetailTimeline([]);
        setDetailPayments([]);
        setDetailTimelineLoading(true);
        setDetailPaymentsLoading(true);
        try {
          const [tl, pay] = await Promise.all([
            adminPurchaseWorkflowService.getPOTimeline(d.id),
            adminPurchaseWorkflowService.getPaymentsByPO(d.id),
          ]);
          setDetailTimeline(tl.data?.data || tl.data || []);
          setDetailPayments(pay.data?.data || pay.data || []);
        } catch (e) {
          // ignore
        } finally {
          setDetailTimelineLoading(false);
          setDetailPaymentsLoading(false);
        }
      }

      // Enterprise: receipt draft (partial delivery edit)
      if (tab === "receipts") {
        const items = d?.items || [];
        setReceiptDraftItems(
          items.map((x) => ({
            id: x.id,
            equipmentName: x.equipment?.name || "-",
            quantity: Number(x.quantity || 0),
            unitPrice: Number(x.unitPrice || 0),
            notes: x.notes || "",
          }))
        );
      }
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  // ===== Actions =====
  const doApproveQuotation = async (row) => {
    if (!window.confirm(`Duyệt quotation ${row.code}?`)) return;
    try {
      await adminPurchaseWorkflowService.approveQuotation(row.id);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const doRejectQuotation = (row) => {
    setDetail(row);
    setRejectReason("");
    setRejectOpen(true);
  };

  const submitRejectQuotation = async () => {
    try {
      await adminPurchaseWorkflowService.rejectQuotation(detail.id, { rejectionReason: rejectReason });
      setRejectOpen(false);
      setDetail(null);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const doCreatePOFromQuotation = async (quotation) => {
    if (!window.confirm(`Tạo PO từ quotation ${quotation.code}?`)) return;
    try {
      await adminPurchaseWorkflowService.createPOFromQuotation(quotation.id);
      alert("Tạo PO thành công.");
      setTab("purchaseOrders");
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const doApprovePO = async (po) => {
    if (!window.confirm(`Duyệt PO ${po.code}?`)) return;
    try {
      await adminPurchaseWorkflowService.approvePO(po.id);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const doSetOrderedPO = async (po) => {
    if (!window.confirm(`Set Ordered cho PO ${po.code}?`)) return;
    try {
      await adminPurchaseWorkflowService.markPOOrdered(po.id, {});
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const doCancelPO = async (po) => {
    const reason = window.prompt("Nhập lý do huỷ PO:");
    if (!reason) return;
    try {
      await adminPurchaseWorkflowService.cancelPO(po.id, { reason });
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const doCreateReceiptFromPO = async (po) => {
    if (!window.confirm(`Tạo Receipt inbound từ PO ${po.code}?`)) return;
    try {
      await adminPurchaseWorkflowService.createReceiptFromPO(po.id);
      alert("Tạo Receipt thành công.");
      setTab("receipts");
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  // ✅ FIX UX: complete xong nhảy sang Payments
  const doCompleteReceipt = async (r) => {
    if (!window.confirm(`Complete receipt ${r.code}?`)) return;
    try {
      await adminPurchaseWorkflowService.completeReceipt(r.id);
      alert("Complete receipt thành công. Chuyển qua Payments để ghi nhận thanh toán.");
      setTab("payments");
      setMeta((m) => ({ ...m, page: 1 }));
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const openPaymentModal = async (po) => {
    setPaymentPO(po);
    setPaymentAmount("");
    setPaymentMethod("bank_transfer");
    setPaymentTxs([]);
    setPaymentOpen(true);

    try {
      setPaymentLoading(true);
      const res = await adminPurchaseWorkflowService.getPaymentsByPO(po.id);
      const list = res.data?.data || res.data || [];
      setPaymentTxs(list);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const submitPayment = async () => {
    if (isPaymentDisabled) return;

    try {
      setPaymentLoading(true);
      await adminPurchaseWorkflowService.createPayment(paymentPO.id, {
        amount: parsedPaymentAmount,
        paymentMethod,
        status: "completed",
      });

      const res = await adminPurchaseWorkflowService.getPaymentsByPO(paymentPO.id);
      const list = res.data?.data || res.data || [];
      setPaymentTxs(list);

      await fetchList();
      alert("Ghi nhận thanh toán thành công.");
      setPaymentAmount("");
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 6 }}>Purchase Workflow</div>
      <div style={{ opacity: 0.75, marginBottom: 12 }}>
        Main flow: Quotations → Purchase Orders → Receipts (Inbound) → Payments
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { key: "quotations", label: "Quotations" },
          { key: "purchaseOrders", label: "Purchase Orders" },
          { key: "receipts", label: "Receipts" },
          { key: "payments", label: "Payments" },
        ].map((t) => (
          <button
            key={t.key}
            className="ad-btn"
            onClick={() => setTab(t.key)}
            style={{
              borderColor: tab === t.key ? "rgba(255,138,0,0.35)" : undefined,
              background: tab === t.key ? "rgba(255,138,0,0.14)" : undefined,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search (code/notes)..." style={input} />

        <select value={status} onChange={(e) => setStatus(e.target.value)} style={select}>
          <option value="all">Tất cả status</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="ordered">ordered</option>
          <option value="delivered">delivered</option>
          <option value="rejected">rejected</option>
          <option value="completed">completed</option>
          <option value="cancelled">cancelled</option>
        </select>

        <input value={gymId} onChange={(e) => setGymId(e.target.value)} placeholder="Gym ID (optional)" style={inputSmall} />
        <input value={supplierId} onChange={(e) => setSupplierId(e.target.value)} placeholder="Supplier ID (optional)" style={inputSmall} />

        <button className="ad-btn" onClick={fetchList} disabled={loading}>
          {loading ? "Đang tải..." : "Tải lại"}
        </button>
      </div>

      {/* Table */}
      <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "rgba(255,255,255,0.04)" }}>
            {tab === "quotations" && (
              <tr>
                <th style={th}>Quotation</th>
                <th style={th}>Gym</th>
                <th style={th}>Supplier</th>
                <th style={th}>Requester</th>
                <th style={th}>Status</th>
                <th style={th}>Total</th>
                <th style={thRight}>Hành động</th>
              </tr>
            )}

            {tab === "purchaseOrders" && (
              <tr>
                <th style={th}>PO</th>
                <th style={th}>Quotation</th>
                <th style={th}>Gym</th>
                <th style={th}>Supplier</th>
                <th style={th}>Requester</th>
                <th style={th}>Status</th>
                <th style={th}>Total</th>
                <th style={thRight}>Hành động</th>
              </tr>
            )}

            {tab === "receipts" && (
              <tr>
                <th style={th}>Receipt</th>
                <th style={th}>PO</th>
                <th style={th}>Gym</th>
                <th style={th}>Processor</th>
                <th style={th}>Status</th>
                <th style={th}>Total</th>
                <th style={thRight}>Hành động</th>
              </tr>
            )}

            {tab === "payments" && (
              <tr>
                <th style={th}>PO</th>
                <th style={th}>Gym</th>
                <th style={th}>Supplier</th>
                <th style={th}>Status</th>
                <th style={th}>Total</th>
                <th style={th}>Paid</th>
                <th style={th}>Remaining</th>
                <th style={thRight}>Hành động {paymentSummaryLoading ? "• ..." : ""}</th>
              </tr>
            )}
          </thead>

          <tbody>
            {rows.map((r) => {
              if (tab === "quotations") {
                return (
                  <tr key={r.id} style={tr}>
                    <td style={td}><b>{r.code || "-"}</b></td>
                    <td style={td}>{r.gym?.name || "-"}</td>
                    <td style={td}>{r.supplier?.name || "-"}</td>
                    <td style={td}>
                      {r.requester?.username || "-"}
                      {r.requester?.email ? <div style={{ opacity: 0.7, fontSize: 12 }}>{r.requester.email}</div> : null}
                    </td>
                    <td style={td}><Badge>{r.status}</Badge></td>
                    <td style={td}>{money(r.totalAmount)}</td>
                    <td style={tdRight}>
                      <button className="ad-btn" onClick={() => openDetail(r)}>Chi tiết</button>{" "}
                      <button className="ad-btn" onClick={() => doCreatePOFromQuotation(r)} disabled={r.status !== "approved"}>Create PO</button>{" "}
                      <button className="ad-btn" onClick={() => doApproveQuotation(r)} disabled={r.status !== "pending"}>Approve</button>{" "}
                      <button className="ad-btn" onClick={() => doRejectQuotation(r)} disabled={r.status !== "pending"}>Reject</button>
                    </td>
                  </tr>
                );
              }

              if (tab === "purchaseOrders") {
                return (
                  <tr key={r.id} style={tr}>
                    <td style={td}><b>{r.code || "-"}</b></td>
                    <td style={td}>{r.quotation?.code || "-"}</td>
                    <td style={td}>{r.gym?.name || "-"}</td>
                    <td style={td}>{r.supplier?.name || "-"}</td>
                    <td style={td}>
                      {r.requester?.username || "-"}
                      {r.requester?.email ? <div style={{ opacity: 0.7, fontSize: 12 }}>{r.requester.email}</div> : null}
                    </td>
                    <td style={td}><Badge>{r.status}</Badge></td>
                    <td style={td}>{money(r.totalAmount)}</td>
                    <td style={tdRight}>
                      <button className="ad-btn" onClick={() => openDetail(r)}>Chi tiết</button>{" "}
                      <button className="ad-btn" onClick={() => doApprovePO(r)} disabled={r.status !== "pending"}>Approve</button>{" "}
                      <button className="ad-btn" onClick={() => doSetOrderedPO(r)} disabled={r.status !== "approved"}>Set Ordered</button>{" "}
                      <button className="ad-btn" onClick={() => doCancelPO(r)} disabled={r.status === "cancelled" || r.status === "delivered"}>Cancel</button>{" "}
                      <button className="ad-btn" onClick={() => doCreateReceiptFromPO(r)} disabled={!(r.status === "approved" || r.status === "ordered")}>Create Receipt</button>
                    </td>
                  </tr>
                );
              }

              if (tab === "receipts") {
                return (
                  <tr key={r.id} style={tr}>
                    <td style={td}><b>{r.code || "-"}</b></td>
                    <td style={td}>{r.purchaseOrder?.code || "-"}</td>
                    <td style={td}>{r.gym?.name || "-"}</td>
                    <td style={td}>
                      {r.processor?.username || "-"}
                      {r.processor?.email ? <div style={{ opacity: 0.7, fontSize: 12 }}>{r.processor.email}</div> : null}
                    </td>
                    <td style={td}><Badge>{r.status}</Badge></td>
                    <td style={td}>{money(r.totalValue)}</td>
                    <td style={tdRight}>
                      <button className="ad-btn" onClick={() => openDetail(r)}>Chi tiết</button>{" "}
                      <button className="ad-btn" onClick={() => doCompleteReceipt(r)} disabled={r.status !== "pending"}>Complete</button>
                    </td>
                  </tr>
                );
              }

              // payments tab
              const summary = paymentSummaryByPO[r.id] || { paid: 0, remaining: Number(r.totalAmount || 0) };
              const disableAddPayment = String(r.status || "").toLowerCase() === "cancelled" || summary.remaining <= 0;

              return (
                <tr key={r.id} style={tr}>
                  <td style={td}><b>{r.code || "-"}</b></td>
                  <td style={td}>{r.gym?.name || "-"}</td>
                  <td style={td}>{r.supplier?.name || "-"}</td>
                  <td style={td}><Badge>{r.status}</Badge></td>
                  <td style={td}>{money(r.totalAmount)}</td>
                  <td style={td}>{money(summary.paid)}</td>
                  <td style={td}>{money(summary.remaining)}</td>
                  <td style={tdRight}>
                    <button className="ad-btn" onClick={() => openDetail(r)}>Chi tiết</button>{" "}
                    <button className="ad-btn" onClick={() => openPaymentModal(r)} disabled={disableAddPayment}>Add Payment</button>
                  </td>
                </tr>
              );
            })}

            {!rows.length && (
              <tr>
                <td style={{ ...td, opacity: 0.7 }} colSpan={tab === "payments" ? 8 : 9}>
                  Không có dữ liệu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, opacity: 0.8 }}>
        <div>
          Page {meta.page} • Total: {meta.total}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="ad-btn" onClick={() => setMeta((m) => ({ ...m, page: Math.max(1, m.page - 1) }))} disabled={meta.page <= 1}>
            ← Prev
          </button>
          <button className="ad-btn" onClick={() => setMeta((m) => ({ ...m, page: m.page + 1 }))} disabled={rows.length < meta.limit}>
            Next →
          </button>
        </div>
      </div>

      {/* Detail modal */}
      <Modal
        open={detailOpen}
        title={
          tab === "quotations"
            ? "Quotation detail"
            : tab === "purchaseOrders"
            ? "Purchase Order detail"
            : tab === "receipts"
            ? "Receipt detail"
            : "Detail"
        }
        onClose={closeDetail}
        width={980}
      >
        {!detail ? (
          <div style={{ opacity: 0.75 }}>Không có dữ liệu.</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              <div style={miniCard}>
                <div style={miniLabel}>Code</div>
                <div style={miniValue} className="ad-mono">
                  {detail.code || "-"}
                </div>
              </div>
              <div style={miniCard}>
                <div style={miniLabel}>Gym</div>
                <div style={miniValue}>{detail.gym?.name || "-"}</div>
              </div>
              <div style={miniCard}>
                <div style={miniLabel}>Supplier</div>
                <div style={miniValue}>{detail.supplier?.name || "-"}</div>
              </div>
              <div style={miniCard}>
                <div style={miniLabel}>Status</div>
                <div style={miniValue}>
                  <Badge>{detail.status || "-"}</Badge>
                </div>
              </div>
            </div>

            <div style={{ height: 10 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              <div style={miniCard}>
                <div style={miniLabel}>Requester</div>
                <div style={miniValue}>{detail.requester?.username || "-"}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>{detail.requester?.email || ""}</div>
              </div>
              <div style={miniCard}>
                <div style={miniLabel}>Total</div>
                <div style={miniValue}>{money(detail.totalAmount ?? detail.totalValue)}</div>
              </div>
              <div style={miniCard}>
                <div style={miniLabel}>Created</div>
                <div style={miniValue}>
                  {detail.createdAt ? new Date(detail.createdAt).toLocaleString() : "-"}
                </div>
              </div>
            </div>

            {detail.notes || detail.rejectionReason ? (
              <>
                <div style={{ height: 10 }} />
                <div style={miniCard}>
                  <div style={miniLabel}>Notes / Reason</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{detail.notes || detail.rejectionReason}</div>
                </div>
              </>
            ) : null}

            <div style={{ height: 12 }} />
            <div style={{ fontWeight: 900, opacity: 0.9 }}>Items</div>
            <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "rgba(255,255,255,0.04)" }}>
                  <tr>
                    <th style={th}>Equipment</th>
                    <th style={th}>Qty</th>
                    <th style={th}>Unit price</th>
                    <th style={th}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detailItems.map((it) => {
                    const isReceiptEdit = tab === "receipts" && String(detail?.status) === "pending";
                    const draft = receiptDraftItems.find((x) => String(x.id) === String(it.id));
                    const qtyVal = isReceiptEdit ? draft?.quantity ?? it.quantity : it.quantity;
                    return (
                      <tr key={it.id} style={tr}>
                        <td style={td}>{it.equipment?.name || it.equipmentName || "-"}</td>
                        <td style={td}>
                          {isReceiptEdit ? (
                            <input
                              value={String(qtyVal ?? "")}
                              onChange={(e) => {
                                const v = Math.max(0, Number(String(e.target.value || "").replace(/\D/g, "")));
                                setReceiptDraftItems((arr) =>
                                  arr.map((x) => (String(x.id) === String(it.id) ? { ...x, quantity: v } : x))
                                );
                              }}
                              style={{ ...inputSmall, width: 110, maxWidth: 110 }}
                              inputMode="numeric"
                            />
                          ) : (
                            qtyVal ?? "-"
                          )}
                        </td>
                        <td style={td}>{money(it.unitPrice)}</td>
                        <td style={td}>{money(it.totalPrice)}</td>
                      </tr>
                    );
                  })}
                  {!detailItems.length ? (
                    <tr>
                      <td style={{ ...td, opacity: 0.7 }} colSpan={4}>
                        Không có item.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {/* Enterprise: receipt edit controls */}
            {tab === "receipts" && String(detail?.status) === "pending" ? (
              <>
                <div style={{ height: 10 }} />
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ opacity: 0.85 }}>
                    Partial delivery: sửa Qty theo số thực nhận trước khi <b>Complete</b>.
                  </div>
                  <button className="ad-btn" onClick={saveReceiptDraft} disabled={receiptSaving}>
                    {receiptSaving ? "Đang lưu..." : "Lưu Qty"}
                  </button>
                </div>
              </>
            ) : null}

            {/* Enterprise: PO summary + timeline */}
            {tab !== "receipts" && detail?.items ? (
              <>
                <div style={{ height: 12 }} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                  <div style={miniCard}>
                    <div style={miniLabel}>Delivery progress</div>
                    <div style={miniValue}>
                      {(() => {
                        const items = detail.items || [];
                        const ordered = items.reduce((s, x) => s + Number(x.quantity || 0), 0);
                        const received = items.reduce((s, x) => s + Number(x.receivedQuantity || 0), 0);
                        return `${received}/${ordered}`;
                      })()}
                    </div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>received / ordered</div>
                  </div>
                  <div style={miniCard}>
                    <div style={miniLabel}>Payment progress</div>
                    <div style={miniValue}>
                      {detailPaymentsLoading
                        ? "..."
                        : (() => {
                            const total = Number(detail.totalAmount || 0);
                            const paid = (detailPayments || []).reduce(
                              (s, x) => (String(x.paymentStatus) === "success" ? s + Number(x.amount || 0) : s),
                              0
                            );
                            return `${money(paid)} / ${money(total)}`;
                          })()}
                    </div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>paid / total</div>
                  </div>
                  <div style={miniCard}>
                    <div style={miniLabel}>Actions note</div>
                    <div style={{ opacity: 0.85, fontSize: 13 }}>
                      Enterprise flow: Approve → Ordered → Create Receipt(s) → Complete Receipt(s) → Payments
                    </div>
                  </div>
                </div>

                <div style={{ height: 12 }} />
                <div style={{ fontWeight: 900, opacity: 0.9 }}>Activity timeline</div>
                <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, padding: 10 }}>
                  {detailTimelineLoading ? (
                    <div style={{ opacity: 0.75 }}>Loading...</div>
                  ) : !detailTimeline?.length ? (
                    <div style={{ opacity: 0.75 }}>Chưa có hoạt động.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {detailTimeline.slice(0, 18).map((ev, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            padding: "8px 10px",
                            borderRadius: 12,
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.10)",
                          }}
                        >
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ fontWeight: 800 }}>
                              {ev.kind === "audit"
                                ? ev.action
                                : ev.kind === "receipt"
                                ? `Receipt ${ev.code}`
                                : ev.kind === "payment"
                                ? `Payment ${ev.code}`
                                : "Event"}
                            </div>
                            <div style={{ opacity: 0.75, fontSize: 12 }}>
                              {ev.actor?.username ? `by ${ev.actor.username}` : ""} {ev.tableName ? `• ${ev.tableName}` : ""}
                            </div>
                          </div>
                          <div style={{ opacity: 0.75, fontSize: 12, whiteSpace: "nowrap" }}>
                            {ev.at ? new Date(ev.at).toLocaleString() : "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </>
        )}
      </Modal>

      {/* Reject quotation modal */}
      <Modal
        open={rejectOpen}
        title={`Reject quotation • ${detail?.code || ""}`}
        onClose={() => setRejectOpen(false)}
        width={720}
      >
        <div style={{ opacity: 0.85, marginBottom: 8 }}>Nhập lý do từ chối (bắt buộc).</div>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={4}
          style={{ ...textarea, width: "100%" }}
        />
        <div style={{ height: 10 }} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="ad-btn" onClick={() => setRejectOpen(false)}>
            Huỷ
          </button>
          <button className="ad-btn" onClick={submitRejectQuotation} disabled={!rejectReason.trim()}>
            Từ chối
          </button>
        </div>
      </Modal>

      {/* Payment modal */}
      <Modal
        open={paymentOpen}
        title={`Add payment for ${paymentPO?.code || ""}`}
        onClose={() => {
          setPaymentOpen(false);
          setPaymentPO(null);
          setPaymentAmount("");
          setPaymentTxs([]);
        }}
        width={640}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ opacity: 0.9 }}>
            Gym: <b>{paymentPO?.gym?.name || "-"}</b> • Supplier: <b>{paymentPO?.supplier?.name || "-"}</b>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div style={miniCard}>
              <div style={miniLabel}>Total PO</div>
              <div style={miniValue}>{money(totalPO)}</div>
            </div>
            <div style={miniCard}>
              <div style={miniLabel}>Total Paid</div>
              <div style={miniValue}>{money(totalPaid)}</div>
            </div>
            <div style={miniCard}>
              <div style={miniLabel}>Remaining</div>
              <div style={miniValue}>{money(remaining)}</div>
            </div>
          </div>

          <input
            value={formatVNDInput(paymentAmount)}
            onChange={(e) => {
              const digits = String(e.target.value || "").replace(/\./g, "").replace(/\D/g, "");
              setPaymentAmount(digits);
            }}
            placeholder="Amount (VD: 12.000.000)"
            style={input}
            inputMode="numeric"
          />

          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={select}>
            <option value="cash">cash</option>
            <option value="bank_transfer">bank_transfer</option>
            <option value="card">card</option>
          </select>

          {paymentInvalidReason ? (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255, 99, 99, 0.35)",
                background: "rgba(255, 99, 99, 0.10)",
                color: "#ffd7d7",
                fontSize: 13,
              }}
            >
              {paymentInvalidReason}
            </div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              className="ad-btn"
              onClick={() => {
                setPaymentOpen(false);
                setPaymentPO(null);
                setPaymentAmount("");
                setPaymentTxs([]);
              }}
            >
              Huỷ
            </button>
            <button className="ad-btn" onClick={submitPayment} disabled={isPaymentDisabled}>
              {paymentLoading ? "Đang xử lý..." : "Tạo payment"}
            </button>
          </div>

          <div style={{ height: 6 }} />
          <div style={{ fontWeight: 900, opacity: 0.9 }}>Payments history</div>
          <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "rgba(255,255,255,0.04)" }}>
                <tr>
                  <th style={th}>Transaction Code</th>
                  <th style={th}>Amount</th>
                  <th style={th}>Method</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(paymentTxs || []).map((t) => (
                  <tr key={t.id} style={tr}>
                    <td style={td}>{t.transactionCode || "-"}</td>
                    <td style={td}>{money(t.amount)}</td>
                    <td style={td}>{t.paymentMethod || "-"}</td>
                    <td style={td}>{t.paymentStatus || t.status || "-"}</td>
                  </tr>
                ))}
                {!paymentTxs?.length && (
                  <tr>
                    <td style={{ ...td, opacity: 0.7 }} colSpan={4}>
                      Chưa có giao dịch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ===== styles
const th = { textAlign: "left", padding: "12px 12px", fontSize: 12, opacity: 0.85 };
const thRight = { ...th, textAlign: "right" };
const td = { padding: "12px 12px", borderTop: "1px solid rgba(255,255,255,0.08)", verticalAlign: "top" };
const tdRight = { ...td, textAlign: "right", whiteSpace: "nowrap" };
const tr = { background: "transparent" };

const input = {
  width: "100%",
  maxWidth: 520,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "#eef2ff",
};
const inputSmall = { ...input, width: 160, maxWidth: 160 };
const select = {
  width: 220,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "#eef2ff",
};
const textarea = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "#eef2ff",
  resize: "vertical",
};

const miniCard = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  padding: 12,
  background: "rgba(255,255,255,0.04)",
};
const miniLabel = { opacity: 0.75, fontSize: 12, marginBottom: 6 };
const miniValue = { fontWeight: 900, fontSize: 14 };
