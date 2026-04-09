import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import adminPurchaseWorkflowService from "../../../services/adminPurchaseWorkflowService";

const money = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString("vi-VN") + " đ";
};

const PO_STATUS_VI = {
  draft: "Nháp",
  deposit_pending: "Chờ cọc",
  deposit_paid: "Đã cọc",
  ordered: "Đã đặt hàng",
  partially_received: "Nhận một phần",
  received: "Đã nhận đủ",
  completed: "Hoàn tất",
  cancelled: "Đã huỷ",
};

const PR_STATUS_VI = {
  submitted: "Đã gửi",
  rejected: "Từ chối",
  converted: "Đã chuyển báo giá",
  fulfilled_from_stock: "Đã cấp từ kho",
};

const QUOTE_STATUS_VI = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  ordered: "Đã đặt hàng",
  delivered: "Đã giao",
  rejected: "Từ chối",
  completed: "Hoàn tất",
  cancelled: "Đã huỷ",
};

const RECEIPT_STATUS_VI = {
  pending: "Chờ hoàn tất",
  completed: "Hoàn tất",
};

function statusBadgeLabel(tab, raw) {
  const s = String(raw || "");
  if (tab === "purchaseRequests") return PR_STATUS_VI[s] || s;
  if (tab === "purchaseOrders" || tab === "payments") return PO_STATUS_VI[s] || s;
  if (tab === "quotations") return QUOTE_STATUS_VI[s] || s;
  if (tab === "receipts") return RECEIPT_STATUS_VI[s] || s;
  return s;
}

const PAYMENT_METHOD_VI = {
  cash: "Tiền mặt",
  bank_transfer: "Chuyển khoản",
  card: "Thẻ",
};

const TX_PAYMENT_STATUS_VI = {
  completed: "Hoàn tất",
  pending: "Chờ xử lý",
  failed: "Thất bại",
  cancelled: "Đã huỷ",
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState("purchaseRequests"); // purchaseRequests | quotations | purchaseOrders | receipts | payments
  const [deepLinkTargetId, setDeepLinkTargetId] = useState(null);

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
    if (tab === "purchaseRequests" && d.equipment) {
      return [
        {
          id: "pr-line",
          equipment: d.equipment,
          quantity: d.quantity,
          unitPrice: d.expectedUnitPrice,
          totalPrice: Number(d.quantity || 0) * Number(d.expectedUnitPrice || 0),
        },
      ];
    }
    const items = d.items || d.data?.items || d.quotationItems || d.purchaseOrderItems || d.receiptItems || [];
    return Array.isArray(items) ? items : [];
  }, [detail, tab]);

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
      alert("Đã lưu số lượng dòng nhận hàng.");
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setReceiptSaving(false);
    }
  };

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [prRejectOpen, setPrRejectOpen] = useState(false);
  const [prRejectRow, setPrRejectRow] = useState(null);
  const [prRejectReason, setPrRejectReason] = useState("");

  // ===== LEVEL 2: payment modal + calculation =====
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentPO, setPaymentPO] = useState(null);

  // ✅ LƯU "SỐ SẠCH" (digits), KHÔNG lưu dấu chấm
  const [paymentAmount, setPaymentAmount] = useState("");

  // ✅ default method hợp lệ
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentPhase, setPaymentPhase] = useState("deposit");

  const [paymentTxs, setPaymentTxs] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const totalPO = useMemo(() => Number(paymentPO?.totalAmount || 0), [paymentPO]);

  const totalPaid = useMemo(() => {
    return (paymentTxs || [])
      .filter((t) => String(t.paymentStatus || t.status || "").toLowerCase() === "completed")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [paymentTxs]);

  const depositPaidOnly = useMemo(() => {
    return (paymentTxs || [])
      .filter(
        (t) =>
          String(t.paymentStatus || t.status || "").toLowerCase() === "completed" &&
          String(t.metadata?.paymentPhase || "").toLowerCase() === "deposit"
      )
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [paymentTxs]);

  const remaining = useMemo(() => Math.max(0, totalPO - totalPaid), [totalPO, totalPaid]);

  const parsedPaymentAmount = useMemo(() => {
    const n = parseVNDInputToNumber(paymentAmount);
    return Number.isFinite(n) ? n : NaN;
  }, [paymentAmount]);

  const paymentInvalidReason = useMemo(() => {
    if (!paymentPO) return "Chưa chọn đơn mua (PO)";
    const st = String(paymentPO.status || "");
    if (st !== "deposit_pending" && st !== "received") {
      return `Chỉ ghi nhận thanh toán khi PO ở trạng thái chờ cọc hoặc đã nhận đủ hàng. Hiện tại: ${PO_STATUS_VI[st] || st}`;
    }
    if (remaining <= 0) return "PO đã thanh toán đủ";
    if (!Number.isFinite(parsedPaymentAmount) || parsedPaymentAmount <= 0) return "Số tiền không hợp lệ";
    if (parsedPaymentAmount > remaining) return `Vượt quá số còn lại (${remaining.toLocaleString("vi-VN")} đ)`;
    if (st === "deposit_pending") {
      const cap = Math.max(0, totalPO * 0.3 - depositPaidOnly);
      if (parsedPaymentAmount > cap + 0.01) return `Cọc tối đa còn lại (30% PO): ${money(cap)}`;
    }
    return "";
  }, [paymentPO, remaining, parsedPaymentAmount, totalPO, depositPaidOnly]);

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

      if (tab === "purchaseRequests") {
        const res = await adminPurchaseWorkflowService.getPurchaseRequests(params);
        setRows(res.data?.data || []);
        setMeta(res.data?.meta || meta);
      } else if (tab === "quotations") {
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

  useLayoutEffect(() => {
    const t = searchParams.get("tab");
    const valid = new Set(["purchaseRequests", "quotations", "purchaseOrders", "receipts", "payments"]);
    if (valid.has(t)) setTab(t);
    const h = Number(searchParams.get("highlight"));
    setDeepLinkTargetId(Number.isFinite(h) && h > 0 ? h : null);
  }, [searchParams]);

  const openDetail = async (rowOrId) => {
    const id = typeof rowOrId === "object" && rowOrId != null ? rowOrId.id : rowOrId;
    if (!id) return;
    try {
      let res;
      if (tab === "purchaseRequests") res = await adminPurchaseWorkflowService.getPurchaseRequestDetail(id);
      if (tab === "quotations") res = await adminPurchaseWorkflowService.getQuotationDetail(id);
      if (tab === "purchaseOrders") res = await adminPurchaseWorkflowService.getPurchaseOrderDetail(id);
      if (tab === "receipts") res = await adminPurchaseWorkflowService.getReceiptDetail(id);
      if (tab === "payments") res = await adminPurchaseWorkflowService.getPurchaseOrderDetail(id);

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

  useEffect(() => {
    if (!deepLinkTargetId || loading) return undefined;
    let cancelled = false;
    (async () => {
      try {
        await openDetail(deepLinkTargetId);
      } finally {
        if (!cancelled) {
          setDeepLinkTargetId(null);
          setSearchParams({}, { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openDetail driven by tab + same service calls
  }, [deepLinkTargetId, loading, tab]);

  // ===== Actions =====
  const doApproveQuotation = async (row) => {
    if (!window.confirm(`Duyệt báo giá ${row.code}?`)) return;
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

  const submitRejectPurchaseRequest = async () => {
    if (!prRejectRow) return;
    try {
      await adminPurchaseWorkflowService.rejectPurchaseRequest(prRejectRow.id, {
        rejectionReason: prRejectReason,
      });
      setPrRejectOpen(false);
      setPrRejectRow(null);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const doConvertPurchaseRequest = async (row) => {
    const sid = window.prompt(
      "Nhập mã nhà cung cấp (Supplier ID) để chốt NCC — để trống sẽ dùng NCC dự kiến trên yêu cầu (nếu có):",
      row.expectedSupplier?.id ? String(row.expectedSupplier.id) : ""
    );
    if (sid === null) return;
    const body = {};
    if (String(sid).trim()) body.supplierId = Number(sid);
    try {
      await adminPurchaseWorkflowService.convertPurchaseRequestToQuotation(row.id, body);
      alert("Đã tạo báo giá từ yêu cầu.");
      setTab("quotations");
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const doCreatePOFromQuotation = async (quotation) => {
    if (!window.confirm(`Tạo PO từ báo giá ${quotation.code}?`)) return;
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
    if (!window.confirm(`Đánh dấu đã đặt hàng NCC cho PO ${po.code}?`)) return;
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
    if (!window.confirm(`Tạo phiếu nhập kho từ PO ${po.code}?`)) return;
    try {
      await adminPurchaseWorkflowService.createReceiptFromPO(po.id);
      alert("Tạo phiếu nhận hàng thành công.");
      setTab("receipts");
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  // ✅ FIX UX: complete xong nhảy sang Payments
  const doCompleteReceipt = async (r) => {
    if (!window.confirm(`Hoàn tất phiếu nhận hàng ${r.code}?`)) return;
    try {
      await adminPurchaseWorkflowService.completeReceipt(r.id);
      alert("Hoàn tất nhận hàng thành công. Chuyển sang tab Thanh toán để ghi nhận thanh toán.");
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
    setPaymentPhase(String(po.status) === "received" ? "final" : "deposit");
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
        paymentPhase,
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
      <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 6 }}>Mua sắm trang thiết bị</div>
      <div style={{ opacity: 0.75, marginBottom: 12 }}>
        Yêu cầu owner → Báo giá → PO (cọc 30%) → Đặt hàng → Nhận hàng (cộng tồn kho) → Thanh toán 70% → Hoàn tất
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { key: "purchaseRequests", label: "Yêu cầu mua" },
          { key: "quotations", label: "Báo giá" },
          { key: "purchaseOrders", label: "Đơn mua (PO)" },
          { key: "receipts", label: "Nhận hàng" },
          { key: "payments", label: "Thanh toán" },
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
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo mã / ghi chú..."
          style={input}
        />

        <select value={status} onChange={(e) => setStatus(e.target.value)} style={select}>
          <option value="all">Mọi trạng thái</option>
          {tab === "purchaseRequests" ? (
            <>
              <option value="submitted">Đã gửi</option>
              <option value="rejected">Từ chối</option>
              <option value="converted">Đã chuyển báo giá</option>
              <option value="fulfilled_from_stock">Đã cấp từ kho</option>
            </>
          ) : tab === "purchaseOrders" || tab === "payments" ? (
            <>
              <option value="draft">Nháp</option>
              <option value="deposit_pending">Chờ cọc</option>
              <option value="deposit_paid">Đã cọc</option>
              <option value="ordered">Đã đặt hàng</option>
              <option value="partially_received">Nhận một phần</option>
              <option value="received">Đã nhận đủ</option>
              <option value="completed">Hoàn tất</option>
              <option value="cancelled">Đã huỷ</option>
            </>
          ) : (
            <>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="ordered">Đã đặt hàng</option>
              <option value="delivered">Đã giao</option>
              <option value="rejected">Từ chối</option>
              <option value="completed">Hoàn tất</option>
              <option value="cancelled">Đã huỷ</option>
            </>
          )}
        </select>

        <input
          value={gymId}
          onChange={(e) => setGymId(e.target.value)}
          placeholder="Mã phòng gym (tuỳ chọn)"
          style={inputSmall}
        />
        <input
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          placeholder="Mã NCC (tuỳ chọn)"
          style={inputSmall}
        />

        <button className="ad-btn" onClick={fetchList} disabled={loading}>
          {loading ? "Đang tải..." : "Tải lại"}
        </button>
      </div>

      {/* Table */}
      <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "rgba(255,255,255,0.04)" }}>
            {tab === "purchaseRequests" && (
              <tr>
                <th style={th}>Mã yêu cầu</th>
                <th style={th}>Phòng gym</th>
                <th style={th}>Thiết bị</th>
                <th style={th}>SL</th>
                <th style={th}>Tồn lúc xử lý</th>
                <th style={th}>Cấp từ kho</th>
                <th style={th}>Cần mua</th>
                <th style={th}>Đơn giá</th>
                <th style={th}>Cọc 30%</th>
                <th style={th}>Còn 70%</th>
                <th style={th}>Lý do</th>
                <th style={th}>Người gửi</th>
                <th style={th}>Trạng thái</th>
                <th style={thRight}>Hành động</th>
              </tr>
            )}

            {tab === "quotations" && (
              <tr>
                <th style={th}>Báo giá</th>
                <th style={th}>Phòng gym</th>
                <th style={th}>Nhà cung cấp</th>
                <th style={th}>Người yêu cầu</th>
                <th style={th}>Trạng thái</th>
                <th style={th}>Tổng tiền</th>
                <th style={thRight}>Hành động</th>
              </tr>
            )}

            {tab === "purchaseOrders" && (
              <tr>
                <th style={th}>PO</th>
                <th style={th}>Báo giá</th>
                <th style={th}>Phòng gym</th>
                <th style={th}>Nhà cung cấp</th>
                <th style={th}>Người yêu cầu</th>
                <th style={th}>Trạng thái</th>
                <th style={th}>Tổng tiền</th>
                <th style={thRight}>Hành động</th>
              </tr>
            )}

            {tab === "receipts" && (
              <tr>
                <th style={th}>Phiếu nhận</th>
                <th style={th}>PO</th>
                <th style={th}>Phòng gym</th>
                <th style={th}>Người xử lý</th>
                <th style={th}>Trạng thái</th>
                <th style={th}>Tổng giá trị</th>
                <th style={thRight}>Hành động</th>
              </tr>
            )}

            {tab === "payments" && (
              <tr>
                <th style={th}>PO</th>
                <th style={th}>Phòng gym</th>
                <th style={th}>Nhà cung cấp</th>
                <th style={th}>Trạng thái</th>
                <th style={th}>Tổng tiền</th>
                <th style={th}>Đã trả</th>
                <th style={th}>Còn lại</th>
                <th style={thRight}>Hành động {paymentSummaryLoading ? "• ..." : ""}</th>
              </tr>
            )}
          </thead>

          <tbody>
            {rows.map((r) => {
              if (tab === "purchaseRequests") {
                return (
                  <tr key={r.id} style={tr}>
                    <td style={td}>
                      <b>{r.code || "-"}</b>
                    </td>
                    <td style={td}>{r.gym?.name || "-"}</td>
                    <td style={td}>{r.equipment?.name || "-"}</td>
                    <td style={td}>{r.quantity}</td>
                    <td style={td}>{r.availableQty ?? r.stockSnapshot?.availableQuantity ?? 0}</td>
                    <td style={td}>{r.issueQty ?? r.fulfillmentPlan?.issueQty ?? r.fulfillmentPlan?.stockUsedQuantity ?? 0}</td>
                    <td style={td}>{r.purchaseQty ?? r.fulfillmentPlan?.purchaseQty ?? r.fulfillmentPlan?.purchaseQuantity ?? 0}</td>
                    <td style={td}>{money(r.expectedUnitPrice)}</td>
                    <td style={td}>{money(r.depositAmount ?? ((Number(r.purchaseQty || 0) * Number(r.expectedUnitPrice || 0)) * 0.3))}</td>
                    <td style={td}>{money(r.remainingAmount ?? ((Number(r.purchaseQty || 0) * Number(r.expectedUnitPrice || 0)) * 0.7))}</td>
                    <td style={td}>{r.reason}</td>
                    <td style={td}>
                      {r.requester?.username || "-"}
                      {r.requester?.email ? (
                        <div style={{ opacity: 0.7, fontSize: 12 }}>{r.requester.email}</div>
                      ) : null}
                    </td>
                    <td style={td}>
                      <Badge>{statusBadgeLabel("purchaseRequests", r.status)}</Badge>
                    </td>
                    <td style={tdRight}>
                      <button className="ad-btn" onClick={() => openDetail(r)}>
                        Chi tiết
                      </button>{" "}
                      <button
                        className="ad-btn"
                        onClick={() => doConvertPurchaseRequest(r)}
                        disabled={r.status !== "submitted"}
                      >
                        → Báo giá
                      </button>{" "}
                      <button
                        className="ad-btn"
                        onClick={() => {
                          setPrRejectRow(r);
                          setPrRejectReason("");
                          setPrRejectOpen(true);
                        }}
                        disabled={r.status !== "submitted"}
                      >
                        Từ chối
                      </button>
                    </td>
                  </tr>
                );
              }

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
                    <td style={td}><Badge>{statusBadgeLabel("quotations", r.status)}</Badge></td>
                    <td style={td}>{money(r.totalAmount)}</td>
                    <td style={tdRight}>
                      <button className="ad-btn" onClick={() => openDetail(r)}>Chi tiết</button>{" "}
                      <button className="ad-btn" onClick={() => doCreatePOFromQuotation(r)} disabled={r.status !== "approved"}>Tạo PO</button>{" "}
                      <button className="ad-btn" onClick={() => doApproveQuotation(r)} disabled={r.status !== "pending"}>Duyệt</button>{" "}
                      <button className="ad-btn" onClick={() => doRejectQuotation(r)} disabled={r.status !== "pending"}>Từ chối</button>
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
                    <td style={td}><Badge>{statusBadgeLabel("purchaseOrders", r.status)}</Badge></td>
                    <td style={td}>{money(r.totalAmount)}</td>
                    <td style={tdRight}>
                      <button className="ad-btn" onClick={() => openDetail(r)}>Chi tiết</button>{" "}
                      <button className="ad-btn" onClick={() => doApprovePO(r)} disabled={r.status !== "draft"}>
                        Duyệt → chờ cọc
                      </button>{" "}
                      <button className="ad-btn" onClick={() => doSetOrderedPO(r)} disabled={r.status !== "deposit_paid"}>
                        Đặt hàng NCC
                      </button>{" "}
                      <button
                        className="ad-btn"
                        onClick={() => doCancelPO(r)}
                        disabled={r.status === "cancelled" || r.status === "completed"}
                      >
                        Huỷ PO
                      </button>{" "}
                      <button
                        className="ad-btn"
                        onClick={() => doCreateReceiptFromPO(r)}
                        disabled={!["deposit_paid", "ordered", "partially_received", "received"].includes(String(r.status))}
                      >
                        Tạo nhận hàng
                      </button>
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
                    <td style={td}><Badge>{statusBadgeLabel("receipts", r.status)}</Badge></td>
                    <td style={td}>{money(r.totalValue)}</td>
                    <td style={tdRight}>
                      <button className="ad-btn" onClick={() => openDetail(r)}>Chi tiết</button>{" "}
                      <button className="ad-btn" onClick={() => doCompleteReceipt(r)} disabled={r.status !== "pending"}>Hoàn tất</button>
                    </td>
                  </tr>
                );
              }

              // payments tab
              const summary = paymentSummaryByPO[r.id] || { paid: 0, remaining: Number(r.totalAmount || 0) };
              const pst = String(r.status || "").toLowerCase();
              const disableAddPayment =
                pst === "cancelled" ||
                summary.remaining <= 0 ||
                (pst !== "deposit_pending" && pst !== "received");

              return (
                <tr key={r.id} style={tr}>
                  <td style={td}><b>{r.code || "-"}</b></td>
                  <td style={td}>{r.gym?.name || "-"}</td>
                  <td style={td}>{r.supplier?.name || "-"}</td>
                  <td style={td}><Badge>{statusBadgeLabel("payments", r.status)}</Badge></td>
                  <td style={td}>{money(r.totalAmount)}</td>
                  <td style={td}>{money(summary.paid)}</td>
                  <td style={td}>{money(summary.remaining)}</td>
                  <td style={tdRight}>
                    <button className="ad-btn" onClick={() => openDetail(r)}>Chi tiết</button>{" "}
                    <button className="ad-btn" onClick={() => openPaymentModal(r)} disabled={disableAddPayment}>Thêm thanh toán</button>
                  </td>
                </tr>
              );
            })}

            {!rows.length && (
              <tr>
                <td style={{ ...td, opacity: 0.7 }} colSpan={tab === "payments" ? 8 : tab === "purchaseRequests" ? 13 : 9}>
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
          Trang {meta.page} • Tổng: {meta.total}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="ad-btn" onClick={() => setMeta((m) => ({ ...m, page: Math.max(1, m.page - 1) }))} disabled={meta.page <= 1}>
            ← Trước
          </button>
          <button className="ad-btn" onClick={() => setMeta((m) => ({ ...m, page: m.page + 1 }))} disabled={rows.length < meta.limit}>
            Sau →
          </button>
        </div>
      </div>

      {/* Detail modal */}
      <Modal
        open={detailOpen}
        title={
          tab === "purchaseRequests"
            ? "Chi tiết yêu cầu mua"
            : tab === "quotations"
            ? "Chi tiết báo giá"
            : tab === "purchaseOrders"
            ? "Chi tiết đơn mua (PO)"
            : tab === "receipts"
            ? "Chi tiết phiếu nhận hàng"
            : "Chi tiết"
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
                <div style={miniLabel}>Mã</div>
                <div style={miniValue} className="ad-mono">
                  {detail.code || "-"}
                </div>
              </div>
              <div style={miniCard}>
                <div style={miniLabel}>Phòng gym</div>
                <div style={miniValue}>{detail.gym?.name || "-"}</div>
              </div>
              <div style={miniCard}>
                <div style={miniLabel}>{tab === "purchaseRequests" ? "NCC dự kiến" : "Nhà cung cấp"}</div>
                <div style={miniValue}>
                  {tab === "purchaseRequests"
                    ? detail.expectedSupplier?.name || "-"
                    : detail.supplier?.name || "-"}
                </div>
              </div>
              <div style={miniCard}>
                <div style={miniLabel}>Trạng thái</div>
                <div style={miniValue}>
                  <Badge>
                    {statusBadgeLabel(tab === "payments" ? "purchaseOrders" : tab, detail.status) || "-"}
                  </Badge>
                </div>
              </div>
            </div>

            <div style={{ height: 10 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              <div style={miniCard}>
                <div style={miniLabel}>Người yêu cầu</div>
                <div style={miniValue}>{detail.requester?.username || "-"}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>{detail.requester?.email || ""}</div>
              </div>
              <div style={miniCard}>
                <div style={miniLabel}>{tab === "purchaseRequests" ? "Đơn giá dự kiến × SL" : "Tổng tiền"}</div>
                <div style={miniValue}>
                  {tab === "purchaseRequests"
                    ? `${money(detail.expectedUnitPrice)} × ${detail.quantity || 0}`
                    : money(detail.totalAmount ?? detail.totalValue)}
                </div>
              </div>
              <div style={miniCard}>
                <div style={miniLabel}>Ngày tạo</div>
                <div style={miniValue}>
                  {detail.createdAt ? new Date(detail.createdAt).toLocaleString() : "-"}
                </div>
              </div>
            </div>

            {detail.notes || detail.rejectionReason ? (
              <>
                <div style={{ height: 10 }} />
                <div style={miniCard}>
                  <div style={miniLabel}>Ghi chú / Lý do</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{detail.notes || detail.rejectionReason}</div>
                </div>
              </>
            ) : null}

            {tab === "purchaseRequests" && detail?.stockSnapshot ? (
              <>
                <div style={{ height: 10 }} />
                <div style={miniCard}>
                  <div style={miniLabel}>Snapshot tồn kho lúc gửi</div>
                  <div style={{ fontSize: 13, opacity: 0.9 }}>
                    Tồn: {detail.stockSnapshot.quantityOnHand}, khả dụng: {detail.stockSnapshot.availableQuantity}, min:{" "}
                    {detail.stockSnapshot.minStockLevel}, chờ mua (PO): {detail.stockSnapshot.pendingPurchaseQty}, cấp từ kho:{" "}
                    {detail.fulfillmentPlan?.stockUsedQuantity ?? detail.stockSnapshot?.fulfillmentPlan?.stockUsedQuantity ?? 0}, cần mua:{" "}
                    {detail.fulfillmentPlan?.purchaseQuantity ?? detail.stockSnapshot?.fulfillmentPlan?.purchaseQuantity ?? 0}
                  </div>
                </div>
              </>
            ) : null}

            <div style={{ height: 12 }} />
            <div style={{ fontWeight: 900, opacity: 0.9 }}>{tab === "purchaseRequests" ? "Thiết bị" : "Dòng hàng"}</div>
            <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "rgba(255,255,255,0.04)" }}>
                  <tr>
                    <th style={th}>Thiết bị</th>
                    <th style={th}>SL</th>
                    <th style={th}>Đơn giá</th>
                    <th style={th}>Thành tiền</th>
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
                        Không có dòng hàng.
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
                    Giao một phần: chỉnh số lượng theo thực nhận trước khi <b>hoàn tất</b>.
                  </div>
                  <button className="ad-btn" onClick={saveReceiptDraft} disabled={receiptSaving}>
                    {receiptSaving ? "Đang lưu..." : "Lưu số lượng"}
                  </button>
                </div>
              </>
            ) : null}

            {/* Enterprise: PO summary + timeline */}
            {tab !== "receipts" && tab !== "purchaseRequests" && detail?.items ? (
              <>
                <div style={{ height: 12 }} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                  <div style={miniCard}>
                    <div style={miniLabel}>Tiến độ giao hàng</div>
                    <div style={miniValue}>
                      {(() => {
                        const items = detail.items || [];
                        const ordered = items.reduce((s, x) => s + Number(x.quantity || 0), 0);
                        const received = items.reduce((s, x) => s + Number(x.receivedQuantity || 0), 0);
                        return `${received}/${ordered}`;
                      })()}
                    </div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>đã nhận / đã đặt</div>
                  </div>
                  <div style={miniCard}>
                    <div style={miniLabel}>Tiến độ thanh toán</div>
                    <div style={miniValue}>
                      {detailPaymentsLoading
                        ? "..."
                        : (() => {
                            const total = Number(detail.totalAmount || 0);
                            const paid = (detailPayments || []).reduce(
                              (s, x) =>
                                String(x.paymentStatus || "").toLowerCase() === "completed"
                                  ? s + Number(x.amount || 0)
                                  : s,
                              0
                            );
                            return `${money(paid)} / ${money(total)}`;
                          })()}
                    </div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>đã trả / tổng</div>
                  </div>
                  <div style={miniCard}>
                    <div style={miniLabel}>Gợi ý thao tác</div>
                    <div style={{ opacity: 0.85, fontSize: 13 }}>
                      Duyệt PO → Cọc 30% → Đặt hàng → Nhận hàng (cộng kho) → Thanh toán phần còn lại → Hoàn tất
                    </div>
                  </div>
                </div>

                <div style={{ height: 12 }} />
                <div style={{ fontWeight: 900, opacity: 0.9 }}>Dòng thời gian hoạt động</div>
                <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, padding: 10 }}>
                  {detailTimelineLoading ? (
                    <div style={{ opacity: 0.75 }}>Đang tải...</div>
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
                                ? `Phiếu nhận ${ev.code}`
                                : ev.kind === "payment"
                                ? `Thanh toán ${ev.code}`
                                : "Sự kiện"}
                            </div>
                            <div style={{ opacity: 0.75, fontSize: 12 }}>
                              {ev.actor?.username ? `bởi ${ev.actor.username}` : ""} {ev.tableName ? `• ${ev.tableName}` : ""}
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
        title={`Từ chối báo giá • ${detail?.code || ""}`}
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

      {/* Reject purchase request */}
      <Modal
        open={prRejectOpen}
        title={`Từ chối yêu cầu • ${prRejectRow?.code || ""}`}
        onClose={() => setPrRejectOpen(false)}
        width={720}
      >
        <div style={{ opacity: 0.85, marginBottom: 8 }}>Nhập lý do từ chối (bắt buộc).</div>
        <textarea
          value={prRejectReason}
          onChange={(e) => setPrRejectReason(e.target.value)}
          rows={4}
          style={{ ...textarea, width: "100%" }}
        />
        <div style={{ height: 10 }} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="ad-btn" onClick={() => setPrRejectOpen(false)}>
            Huỷ
          </button>
          <button className="ad-btn" onClick={submitRejectPurchaseRequest} disabled={!prRejectReason.trim()}>
            Từ chối
          </button>
        </div>
      </Modal>

      {/* Payment modal */}
      <Modal
        open={paymentOpen}
        title={`Thêm thanh toán — ${paymentPO?.code || ""}`}
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
            Phòng gym: <b>{paymentPO?.gym?.name || "-"}</b> • NCC: <b>{paymentPO?.supplier?.name || "-"}</b>
          </div>

          <div style={{ opacity: 0.88, marginBottom: 4 }}>
            Loại thanh toán:{" "}
            <b>{paymentPhase === "deposit" ? "Cọc (tối đa 30% giá trị PO)" : "Sau khi nhận đủ hàng (final)"}</b>
          </div>
          {String(paymentPO?.status) === "deposit_pending" ? (
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>
              Hạn mức cọc còn lại: {money(Math.max(0, totalPO * 0.3 - depositPaidOnly))}
            </div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div style={miniCard}>
              <div style={miniLabel}>Tổng PO</div>
              <div style={miniValue}>{money(totalPO)}</div>
            </div>
            <div style={miniCard}>
              <div style={miniLabel}>Đã thanh toán</div>
              <div style={miniValue}>{money(totalPaid)}</div>
            </div>
            <div style={miniCard}>
              <div style={miniLabel}>Còn lại</div>
              <div style={miniValue}>{money(remaining)}</div>
            </div>
          </div>

          <input
            value={formatVNDInput(paymentAmount)}
            onChange={(e) => {
              const digits = String(e.target.value || "").replace(/\./g, "").replace(/\D/g, "");
              setPaymentAmount(digits);
            }}
            placeholder="Số tiền (VD: 12.000.000)"
            style={input}
            inputMode="numeric"
          />

          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={select}>
            <option value="cash">Tiền mặt</option>
            <option value="bank_transfer">Chuyển khoản</option>
            <option value="card">Thẻ</option>
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
              {paymentLoading ? "Đang xử lý..." : "Ghi nhận thanh toán"}
            </button>
          </div>

          <div style={{ height: 6 }} />
          <div style={{ fontWeight: 900, opacity: 0.9 }}>Lịch sử thanh toán</div>
          <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "rgba(255,255,255,0.04)" }}>
                <tr>
                  <th style={th}>Mã giao dịch</th>
                  <th style={th}>Số tiền</th>
                  <th style={th}>Phương thức</th>
                  <th style={th}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {(paymentTxs || []).map((t) => (
                  <tr key={t.id} style={tr}>
                    <td style={td}>{t.transactionCode || "-"}</td>
                    <td style={td}>{money(t.amount)}</td>
                    <td style={td}>
                      {PAYMENT_METHOD_VI[t.paymentMethod] || t.paymentMethod || "-"}
                    </td>
                    <td style={td}>
                      {TX_PAYMENT_STATUS_VI[String(t.paymentStatus || t.status || "").toLowerCase()] ||
                        t.paymentStatus ||
                        t.status ||
                        "-"}
                    </td>
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
