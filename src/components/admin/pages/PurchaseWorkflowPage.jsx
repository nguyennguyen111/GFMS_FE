import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../../../setup/axios";
import adminPurchaseWorkflowService from "../../../services/adminPurchaseWorkflowService";
import { connectSocket } from "../../../services/socketClient";
import "./PurchaseWorkflowPage.css";

const statusLabel = (status) => ({
  submitted: "Chờ admin duyệt",
  approved_waiting_deposit: "Đã duyệt, chờ owner cọc 30%",
  paid_waiting_admin_confirm: "Owner đã cọc, chờ admin bàn giao",
  shipping: "Admin đang giao combo",
  delivered_waiting_final_payment: "Owner đã nhận, chờ thanh toán 70%",
  completed: "Hoàn tất",
  rejected: "Bị từ chối",
}[status] || status || "-");

const money = (v) => Number(v || 0).toLocaleString("vi-VN");
const formatDate = (value) => value ? new Date(value).toLocaleString("vi-VN") : "-";

export default function PurchaseWorkflowPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [rejectMap, setRejectMap] = useState({});

  const API_HOST = String(axios?.defaults?.baseURL || process.env.REACT_APP_API_BASE || "http://localhost:8080").replace(/\/+$/, "");
  const absUrl = (value) => (value ? (String(value).startsWith("http") || String(value).startsWith("data:") ? String(value) : `${API_HOST}${value}`) : "");

  const summary = useMemo(() => rows.reduce((acc, row) => {
    acc.total += 1;
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, { total: 0 }), [rows]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminPurchaseWorkflowService.getPurchaseRequests({ q: query, status });
      setRows(res?.data?.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => { loadRows(); }, [loadRows]);

  useEffect(() => {
    const socket = connectSocket();
    const onPurchaseFlowChanged = (payload = {}) => {
      const relatedType = String(payload?.relatedType || payload?.type || "").toLowerCase();
      const notificationType = String(payload?.notificationType || payload?.type || "").toLowerCase();
      if (["purchaserequest", "purchase_request"].includes(relatedType) || ["purchase_request", "payment"].includes(notificationType)) {
        loadRows();
      }
    };

    socket.on("notification:new", onPurchaseFlowChanged);
    return () => socket.off("notification:new", onPurchaseFlowChanged);
  }, [loadRows]);

  useEffect(() => {
    if (!rows.length) return;
    const params = new URLSearchParams(window.location.search);
    const highlightId = Number(params.get("highlight") || 0);
    if (!highlightId) return;
    if (!rows.some((item) => Number(item.id) === highlightId)) return;
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`admin-purchase-request-${highlightId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [rows]);

  const approve = async (id) => {
    try {
      await adminPurchaseWorkflowService.approvePurchaseRequest(id);
      loadRows();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  const reject = async (id) => {
    try {
      await adminPurchaseWorkflowService.rejectPurchaseRequest(id, { rejectionReason: rejectMap[id] || "Admin từ chối yêu cầu mua combo" });
      setRejectMap((prev) => ({ ...prev, [id]: "" }));
      loadRows();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  const ship = async (id) => {
    try {
      await adminPurchaseWorkflowService.confirmPurchaseRequestPaymentAndShip(id);
      loadRows();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  return (
    <div className="purchase-admin-page">
      <section className="purchase-admin-hero">
        <div>
          <div className="purchase-admin-kicker">Admin workflow</div>
          <h2>Yêu cầu bán combo</h2>
          <p>
            Admin theo dõi trọn luồng combo: owner gửi yêu cầu → admin duyệt → owner cọc 30% → admin giao combo
            → owner xác nhận nhận → owner thanh toán 70% còn lại.
          </p>
        </div>
        <div className="purchase-admin-stats">
          <div className="purchase-admin-stat"><span>Tổng request</span><strong>{summary.total || 0}</strong></div>
          <div className="purchase-admin-stat"><span>Chờ duyệt</span><strong>{summary.submitted || 0}</strong></div>
          <div className="purchase-admin-stat"><span>Chờ bàn giao</span><strong>{summary.paid_waiting_admin_confirm || 0}</strong></div>
          <div className="purchase-admin-stat purchase-admin-stat--accent"><span>Hoàn tất</span><strong>{summary.completed || 0}</strong></div>
        </div>
      </section>

      <section className="purchase-admin-toolbar">
        <input
          className="purchase-admin-input"
          placeholder="Tìm theo mã request, combo, gym, owner..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="purchase-admin-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="submitted">submitted</option>
          <option value="approved_waiting_deposit">approved_waiting_deposit</option>
          <option value="paid_waiting_admin_confirm">paid_waiting_admin_confirm</option>
          <option value="shipping">shipping</option>
          <option value="delivered_waiting_final_payment">delivered_waiting_final_payment</option>
          <option value="completed">completed</option>
          <option value="rejected">rejected</option>
        </select>
        <button className="purchase-admin-btn" onClick={loadRows}>Tìm</button>
      </section>

      {error ? <div className="purchase-admin-alert">{error}</div> : null}
      {loading ? <div className="purchase-admin-empty">Đang tải yêu cầu...</div> : null}

      <div className="purchase-admin-list">
        {rows.map((row) => {
          const thumbnailUrl = absUrl(row.combo?.thumbnail);
          return (
            <article id={`admin-purchase-request-${row.id}`} key={row.id} className="purchase-admin-card">
              <div className="purchase-admin-card__hero">
                <div className="purchase-admin-card__media">
                  {thumbnailUrl ? <img src={thumbnailUrl} alt={row.combo?.name || row.code} /> : <span>{(row.combo?.name || row.code || "C").slice(0, 1).toUpperCase()}</span>}
                </div>
                <div className="purchase-admin-card__content">
                  <div className="purchase-admin-card__top">
                    <div>
                      <div className="purchase-admin-card__code">{row.code}</div>
                      <div className="purchase-admin-card__meta">{row.combo?.name || "-"} · {row.gym?.name || "-"}</div>
                    </div>
                    <div className="purchase-admin-card__statusWrap">
                      <span className={`purchase-admin-badge status-${row.status}`}>{statusLabel(row.status)}</span>
                      <strong>{money(row.totalAmount || row.payableAmount)}đ</strong>
                    </div>
                  </div>

                  <div className="purchase-admin-grid">
                    <div className="purchase-admin-infoBlock">
                      <h4>Thông tin owner</h4>
                      <div className="purchase-admin-kv"><span>Owner</span><b>{row.requester?.username || row.requester?.email || "-"}</b></div>
                      <div className="purchase-admin-kv"><span>Liên hệ</span><b>{row.contactName || row.contactPhone || row.contactEmail || "-"}</b></div>
                      <div className="purchase-admin-kv"><span>Supplier</span><b>{row.combo?.supplier?.name || "-"}</b></div>
                    </div>

                    <div className="purchase-admin-infoBlock">
                      <h4>Thanh toán</h4>
                      <div className="purchase-admin-kv"><span>Tổng giá combo</span><b>{money(row.totalAmount || row.payableAmount)}đ</b></div>
                      <div className="purchase-admin-kv"><span>Cọc 30%</span><b>{money(row.depositAmount)}đ</b></div>
                      <div className="purchase-admin-kv"><span>Còn lại 70%</span><b>{money(row.finalAmount || row.remainingAmount)}đ</b></div>
                    </div>

                    <div className="purchase-admin-infoBlock">
                      <h4>Mốc thời gian</h4>
                      <div className="purchase-admin-kv"><span>Duyệt lúc</span><b>{formatDate(row.approvedAt)}</b></div>
                      <div className="purchase-admin-kv"><span>Giao lúc</span><b>{formatDate(row.shippingAt)}</b></div>
                      <div className="purchase-admin-kv"><span>Hoàn tất</span><b>{formatDate(row.completedAt)}</b></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="purchase-admin-note">{row.note || "Không có ghi chú từ owner."}</div>

              <div className="purchase-admin-equipmentList">
                {(row.combo?.items || []).map((item, index) => {
                  const equipment = item.equipment || {};
                  const imageUrl = absUrl(equipment.primaryImageUrl || equipment?.images?.[0]?.url || "");
                  return (
                    <div key={item.id || `${item.equipmentId}-${index}`} className="purchase-admin-equipmentRow">
                      <div className="purchase-admin-equipmentRow__media">
                        {imageUrl ? <img src={imageUrl} alt={equipment.name || `Thiết bị ${index + 1}`} /> : <span>{(equipment.name || "T").slice(0, 1).toUpperCase()}</span>}
                      </div>
                      <div className="purchase-admin-equipmentRow__body">
                        <div className="purchase-admin-equipmentRow__top">
                          <strong>{equipment.name || `#${item.equipmentId}`}</strong>
                          <span>x {item.quantity}</span>
                        </div>
                        <div className="purchase-admin-equipmentRow__meta">
                          <span>{equipment.code || "-"}</span>
                          {equipment.category?.name ? <span>{equipment.category.name}</span> : null}
                          {equipment.supplier?.name ? <span>{equipment.supplier.name}</span> : null}
                        </div>
                        <div className="purchase-admin-equipmentRow__desc">{equipment.description || item.note || "Thiết bị snapshot theo combo tại thời điểm request."}</div>
                      </div>
                    </div>
                  );
                })}
                {!row.combo?.items?.length ? <div className="purchase-admin-empty">Combo này chưa có item hiển thị.</div> : null}
              </div>

              <div className="purchase-admin-actions">
                <button className="purchase-admin-btn purchase-admin-btn--accent" disabled={row.status !== "submitted"} onClick={() => approve(row.id)}>
                  Duyệt request
                </button>
                <div className="purchase-admin-rejectBox">
                  <input
                    className="purchase-admin-input"
                    placeholder="Lý do từ chối"
                    value={rejectMap[row.id] || ""}
                    onChange={(e) => setRejectMap((prev) => ({ ...prev, [row.id]: e.target.value }))}
                  />
                  <button className="purchase-admin-btn purchase-admin-btn--ghost" disabled={row.status !== "submitted"} onClick={() => reject(row.id)}>
                    Từ chối
                  </button>
                </div>
                <button className="purchase-admin-btn" disabled={row.status !== "paid_waiting_admin_confirm"} onClick={() => ship(row.id)}>
                  Xác nhận giao / shipping
                </button>
                {row.status === "rejected" ? <div className="purchase-admin-rejectReason">Lý do: {row.rejectReason || row.adminRejectionNote || "-"}</div> : null}
              </div>
            </article>
          );
        })}
        {!rows.length && !loading ? <div className="purchase-admin-empty">Không có yêu cầu nào.</div> : null}
      </div>
    </div>
  );
}
