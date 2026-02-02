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

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // ===== LEVEL 2: payment modal + calculation =====
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentPO, setPaymentPO] = useState(null);

  // ✅ LƯU "SỐ SẠCH" (digits), KHÔNG lưu dấu chấm
  const [paymentAmount, setPaymentAmount] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("manual");
  const [paymentTxs, setPaymentTxs] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const totalPO = useMemo(() => Number(paymentPO?.totalAmount || 0), [paymentPO]);

  const totalPaid = useMemo(() => {
    // chỉ tính completed để đúng nghiệp vụ
    return (paymentTxs || [])
      .filter((t) => (t.paymentStatus || t.status) === "completed")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [paymentTxs]);

  const remaining = useMemo(() => Math.max(0, totalPO - totalPaid), [totalPO, totalPaid]);

  // ✅ parse đúng: paymentAmount đang là digits
  const parsedPaymentAmount = useMemo(() => {
    const n = parseVNDInputToNumber(paymentAmount);
    return Number.isFinite(n) ? n : NaN;
  }, [paymentAmount]);

  const paymentInvalidReason = useMemo(() => {
    if (!paymentPO) return "Chưa chọn PO";
    if (remaining <= 0) return "PO đã được thanh toán đủ";
    if (!Number.isFinite(parsedPaymentAmount) || parsedPaymentAmount <= 0) return "Số tiền không hợp lệ";
    if (parsedPaymentAmount > remaining)
      return `Vượt quá remaining (${remaining.toLocaleString("vi-VN")} đ)`;
    return "";
  }, [paymentPO, remaining, parsedPaymentAmount]);

  const isPaymentDisabled = !!paymentInvalidReason || paymentLoading;

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
        setRows(res.data?.data || []);
        setMeta(res.data?.meta || meta);
      }
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMeta((m) => ({ ...m, page: 1 }));
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

      setDetail(res.data);
      setDetailOpen(true);
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

  const doCompleteReceipt = async (r) => {
    if (!window.confirm(`Complete receipt ${r.code}?`)) return;
    try {
      await adminPurchaseWorkflowService.completeReceipt(r.id);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const openPaymentModal = async (po) => {
    setPaymentPO(po);
    setPaymentAmount(""); // digits
    setPaymentMethod("manual");
    setPaymentTxs([]);
    setPaymentOpen(true);

    // load txs để tính Total Paid / Remaining (LEVEL 2)
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
        amount: parsedPaymentAmount, // ✅ number sạch
        paymentMethod,
        status: "completed",
      });

      // reload txs + list
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
        <input
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          placeholder="Supplier ID (optional)"
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
                <th style={thRight}>Hành động</th>
              </tr>
            )}
          </thead>

          <tbody>
            {rows.map((r) => {
              if (tab === "quotations") {
                return (
                  <tr key={r.id} style={tr}>
                    <td style={td}>
                      <b>{r.code || "-"}</b>
                    </td>
                    <td style={td}>{r.gym?.name || "-"}</td>
                    <td style={td}>{r.supplier?.name || "-"}</td>
                    <td style={td}>
                      {r.requester?.username || "-"}
                      {r.requester?.email ? <div style={{ opacity: 0.7, fontSize: 12 }}>{r.requester.email}</div> : null}
                    </td>
                    <td style={td}>
                      <Badge>{r.status}</Badge>
                    </td>
                    <td style={td}>{money(r.totalAmount)}</td>
                    <td style={tdRight}>
                      <button className="ad-btn" onClick={() => openDetail(r)}>
                        Chi tiết
                      </button>{" "}
                      <button className="ad-btn" onClick={() => doCreatePOFromQuotation(r)} disabled={r.status !== "approved"}>
                        Create PO
                      </button>{" "}
                      <button className="ad-btn" onClick={() => doApproveQuotation(r)} disabled={r.status !== "pending"}>
                        Approve
                      </button>{" "}
                      <button className="ad-btn" onClick={() => doRejectQuotation(r)} disabled={r.status !== "pending"}>
                        Reject
                      </button>
                    </td>
                  </tr>
                );
              }

              if (tab === "purchaseOrders") {
                return (
                  <tr key={r.id} style={tr}>
                    <td style={td}>
                      <b>{r.code || "-"}</b>
                    </td>
                    <td style={td}>{r.quotation?.code || "-"}</td>
                    <td style={td}>{r.gym?.name || "-"}</td>
                    <td style={td}>{r.supplier?.name || "-"}</td>
                    <td style={td}>
                      {r.requester?.username || "-"}
                      {r.requester?.email ? <div style={{ opacity: 0.7, fontSize: 12 }}>{r.requester.email}</div> : null}
                    </td>
                    <td style={td}>
                      <Badge>{r.status}</Badge>
                    </td>
                    <td style={td}>{money(r.totalAmount)}</td>
                    <td style={tdRight}>
                      <button className="ad-btn" onClick={() => openDetail(r)}>
                        Chi tiết
                      </button>{" "}
                      <button className="ad-btn" onClick={() => doApprovePO(r)} disabled={r.status !== "pending"}>
                        Approve
                      </button>{" "}
                      <button className="ad-btn" onClick={() => doSetOrderedPO(r)} disabled={r.status !== "approved"}>
                        Set Ordered
                      </button>{" "}
                      <button className="ad-btn" onClick={() => doCancelPO(r)} disabled={r.status === "cancelled" || r.status === "delivered"}>
                        Cancel
                      </button>{" "}
                      <button className="ad-btn" onClick={() => doCreateReceiptFromPO(r)} disabled={!(r.status === "approved" || r.status === "ordered")}>
                        Create Receipt
                      </button>
                    </td>
                  </tr>
                );
              }

              if (tab === "receipts") {
                return (
                  <tr key={r.id} style={tr}>
                    <td style={td}>
                      <b>{r.code || "-"}</b>
                    </td>
                    <td style={td}>{r.purchaseOrder?.code || "-"}</td>
                    <td style={td}>{r.gym?.name || "-"}</td>
                    <td style={td}>
                      {r.processor?.username || "-"}
                      {r.processor?.email ? <div style={{ opacity: 0.7, fontSize: 12 }}>{r.processor.email}</div> : null}
                    </td>
                    <td style={td}>
                      <Badge>{r.status}</Badge>
                    </td>
                    <td style={td}>{money(r.totalValue)}</td>
                    <td style={tdRight}>
                      <button className="ad-btn" onClick={() => openDetail(r)}>
                        Chi tiết
                      </button>{" "}
                      <button className="ad-btn" onClick={() => doCompleteReceipt(r)} disabled={r.status !== "pending"}>
                        Complete
                      </button>
                    </td>
                  </tr>
                );
              }

              // payments tab
              return (
                <tr key={r.id} style={tr}>
                  <td style={td}>
                    <b>{r.code || "-"}</b>
                  </td>
                  <td style={td}>{r.gym?.name || "-"}</td>
                  <td style={td}>{r.supplier?.name || "-"}</td>
                  <td style={td}>
                    <Badge>{r.status}</Badge>
                  </td>
                  <td style={td}>{money(r.totalAmount)}</td>
                  <td style={tdRight}>
                    <button className="ad-btn" onClick={() => openDetail(r)}>
                      Chi tiết
                    </button>{" "}
                    <button className="ad-btn" onClick={() => openPaymentModal(r)}>
                      Add Payment
                    </button>
                  </td>
                </tr>
              );
            })}

            {!rows.length && (
              <tr>
                <td style={{ ...td, opacity: 0.7 }} colSpan={9}>
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
          detail
            ? tab === "quotations"
              ? `Quotation: ${detail.code || ""}`
              : tab === "purchaseOrders" || tab === "payments"
              ? `Purchase Order: ${detail.code || ""}`
              : `Receipt: ${detail.code || ""}`
            : "Detail"
        }
        onClose={() => {
          setDetailOpen(false);
          setDetail(null);
        }}
      >
        {!detail ? null : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={card}>
              <div style={cardTitle}>Thông tin</div>
              <div style={line}>
                <span style={k}>Gym</span>
                <span style={v}>{detail.gym?.name || "-"}</span>
              </div>
              <div style={line}>
                <span style={k}>Supplier</span>
                <span style={v}>{detail.supplier?.name || detail.purchaseOrder?.supplier?.name || "-"}</span>
              </div>
              <div style={line}>
                <span style={k}>Status</span>
                <span style={v}>
                  <Badge>{detail.status}</Badge>
                </span>
              </div>
              <div style={line}>
                <span style={k}>Total</span>
                <span style={v}>{money(detail.totalAmount || detail.totalValue || 0)}</span>
              </div>
              <div style={line}>
                <span style={k}>Notes</span>
                <span style={v}>{detail.notes || "-"}</span>
              </div>
            </div>

            <div style={card}>
              <div style={cardTitle}>Người liên quan</div>
              <div style={line}>
                <span style={k}>Requester</span>
                <span style={v}>
                  {detail.requester?.username || "-"}
                  {detail.requester?.email ? ` (${detail.requester.email})` : ""}
                </span>
              </div>
              <div style={line}>
                <span style={k}>Approver</span>
                <span style={v}>
                  {detail.approver?.username || "-"}
                  {detail.approver?.email ? ` (${detail.approver.email})` : ""}
                </span>
              </div>
              <div style={line}>
                <span style={k}>Processor</span>
                <span style={v}>
                  {detail.processor?.username || "-"}
                  {detail.processor?.email ? ` (${detail.processor.email})` : ""}
                </span>
              </div>
              <div style={line}>
                <span style={k}>Quotation</span>
                <span style={v}>{detail.quotation?.code || "-"}</span>
              </div>
              <div style={line}>
                <span style={k}>PO</span>
                <span style={v}>{detail.purchaseOrder?.code || "-"}</span>
              </div>
            </div>

            <div style={{ ...card, gridColumn: "1 / -1" }}>
              <div style={cardTitle}>Items</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ opacity: 0.85 }}>
                  <tr>
                    <th style={th}>Equipment</th>
                    <th style={th}>Qty</th>
                    <th style={th}>Unit</th>
                    <th style={th}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.items || []).map((it) => (
                    <tr key={it.id} style={tr}>
                      <td style={td}>{it.equipment?.name || "-"}</td>
                      <td style={td}>{it.quantity}</td>
                      <td style={td}>{money(it.unitPrice)}</td>
                      <td style={td}>{money(it.totalPrice)}</td>
                    </tr>
                  ))}
                  {!detail.items?.length && (
                    <tr>
                      <td style={{ ...td, opacity: 0.7 }} colSpan={4}>
                        Không có items.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {tab === "payments" ? (
                <div style={{ marginTop: 12 }}>
                  <PaymentsBlock poId={detail.id} />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </Modal>

      {/* Reject modal */}
      <Modal open={rejectOpen} title="Reject quotation" onClose={() => setRejectOpen(false)} width={560}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ opacity: 0.85 }}>
            Lý do từ chối quotation <b>{detail?.code}</b>
          </div>
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} placeholder="Nhập lý do..." style={textarea} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="ad-btn" onClick={() => setRejectOpen(false)}>
              Huỷ
            </button>
            <button className="ad-btn" onClick={submitRejectQuotation} disabled={!rejectReason.trim()}>
              Reject
            </button>
          </div>
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

          {/* ✅ INPUT HIỂN THỊ DẤU CHẤM */}
          <input
            value={formatVNDInput(paymentAmount)}
            onChange={(e) => {
              // lưu digits (số sạch)
              const digits = String(e.target.value || "").replace(/\./g, "").replace(/\D/g, "");
              setPaymentAmount(digits);
            }}
            placeholder="Amount (VD: 12.000.000)"
            style={input}
            inputMode="numeric"
          />

          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={select}>
            <option value="manual">manual</option>
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

function PaymentsBlock({ poId }) {
  const [loading, setLoading] = useState(false);
  const [txs, setTxs] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminPurchaseWorkflowService.getPaymentsByPO(poId);
      setTxs(res.data?.data || res.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poId]);

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 900 }}>Payments (Transactions)</div>
        <button className="ad-btn" onClick={load} disabled={loading}>
          {loading ? "..." : "Reload"}
        </button>
      </div>
      <div style={{ height: 10 }} />
      <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "rgba(255,255,255,0.04)" }}>
            <tr>
              <th style={th}>Transaction Code</th>
              <th style={th}>Amount</th>
              <th style={th}>Method</th>
              <th style={th}>Status</th>
              <th style={th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t) => (
              <tr key={t.id} style={tr}>
                <td style={td}>{t.transactionCode || "-"}</td>
                <td style={td}>{money(t.amount)}</td>
                <td style={td}>{t.paymentMethod || "-"}</td>
                <td style={td}>{t.paymentStatus || "-"}</td>
                <td style={td}>{t.transactionDate ? new Date(t.transactionDate).toLocaleString("vi-VN") : "-"}</td>
              </tr>
            ))}
            {!txs.length && (
              <tr>
                <td style={{ ...td, opacity: 0.7 }} colSpan={5}>
                  Chưa có giao dịch.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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

const card = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  padding: 12,
  background: "rgba(255,255,255,0.04)",
};
const cardTitle = { fontWeight: 900, marginBottom: 10 };
const line = { display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0" };
const k = { opacity: 0.75 };
const v = { fontWeight: 700 };

const miniCard = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  padding: 12,
  background: "rgba(255,255,255,0.04)",
};
const miniLabel = { opacity: 0.75, fontSize: 12, marginBottom: 6 };
const miniValue = { fontWeight: 900, fontSize: 14 };
