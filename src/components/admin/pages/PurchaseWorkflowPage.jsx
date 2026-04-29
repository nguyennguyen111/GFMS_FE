import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../../../setup/axios";
import adminPurchaseWorkflowService from "../../../services/adminPurchaseWorkflowService";
import { connectSocket } from "../../../services/socketClient";
import NiceModal from "../../common/NiceModal";
import { showAppConfirm } from "../../../utils/appDialog";
import "./PurchaseWorkflowPage.css";

const statusLabel = (status) => ({
  submitted: "Chờ admin duyệt",
  approved_waiting_deposit: "Đã duyệt, chờ owner đặt cọc",
  approved_waiting_payment: "Đã duyệt, chờ owner thanh toán",
  paid_waiting_admin_confirm: "Owner đã thanh toán, chờ admin bàn giao",
  shipping: "Admin đang bàn giao combo",
  completed: "Hoàn tất",
  rejected: "Đã từ chối",
}[status] || status || "-");

const money = (v) => Number(v || 0).toLocaleString("vi-VN");
const formatDate = (value) => value ? new Date(value).toLocaleString("vi-VN") : "-";

export default function PurchaseWorkflowPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 4, total: 0 });
  const [loading, setLoading] = useState(false);
  const [noticeModal, setNoticeModal] = useState({
    open: false,
    tone: "error",
    title: "",
    message: "",
  });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [rejectMap, setRejectMap] = useState({});
  const [expandedEquipmentMap, setExpandedEquipmentMap] = useState({});
  const [actionState, setActionState] = useState({ id: null, type: "" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(4);

  const API_HOST = String(axios?.defaults?.baseURL || process.env.REACT_APP_API_BASE || "http://localhost:8080").replace(/\/+$/, "");
  const absUrl = (value) => (value ? (String(value).startsWith("http") || String(value).startsWith("data:") ? String(value) : `${API_HOST}${value}`) : "");

  const summary = useMemo(() => rows.reduce((acc, row) => {
    acc.total += 1;
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, { total: 0 }), [rows]);

  const openNotice = (tone, title, message) => {
    setNoticeModal({
      open: true,
      tone: tone || "error",
      title: title || "Thông báo",
      message: message || "Đã xảy ra lỗi.",
    });
  };

  const loadRows = useCallback(async (override = {}) => {
    setLoading(true);
    try {
      const nextPage = Number(override.page || page || 1);
      const nextLimit = Number(override.limit || limit || 4);
      const res = await adminPurchaseWorkflowService.getPurchaseRequests({
        q: query,
        status,
        page: nextPage,
        limit: nextLimit,
      });
      setRows(res?.data?.data || []);
      const incomingMeta = res?.data?.meta || {};
      setMeta({
        page: Number(incomingMeta.page || nextPage || 1),
        limit: Number(incomingMeta.limit || nextLimit || 4),
        total: Number(incomingMeta.total || incomingMeta.totalItems || 0),
      });
    } catch (e) {
      openNotice("error", "Tải dữ liệu thất bại", e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [query, status, page, limit]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextStatus = String(params.get("status") || "").trim();
    const nextQ = String(params.get("q") || "").trim();
    const nextPage = Number(params.get("page") || 0);
    const nextLimit = Number(params.get("limit") || 0);

    if (nextStatus) setStatus(nextStatus);
    if (nextQ) setQuery(nextQ);
    if (nextPage) setPage(Math.max(1, nextPage));
    if (nextLimit) setLimit(Math.max(1, Math.min(100, nextLimit)));
  }, []);

  useEffect(() => { loadRows(); }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [query, status]);

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

  const totalPages = useMemo(() => {
    const t = Number(meta.total || 0);
    const l = Math.max(1, Number(meta.limit || limit || 4));
    return Math.max(1, Math.ceil(t / l) || 1);
  }, [meta.total, meta.limit, limit]);

  const rangeText = useMemo(() => {
    const t = Number(meta.total || 0);
    if (!t) return "0 kết quả";
    const p = Math.max(1, Number(meta.page || page || 1));
    const l = Math.max(1, Number(meta.limit || limit || 4));
    const start = (p - 1) * l + 1;
    const end = Math.min(t, p * l);
    return `Hiển thị ${start}-${end} / ${t}`;
  }, [meta.total, meta.page, meta.limit, page, limit]);

  const pageNumbers = useMemo(() => {
    const current = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const start = Math.max(1, current - 2);
    const end = Math.min(totalPages, start + 4);
    const realStart = Math.max(1, end - 4);
    return Array.from({ length: end - realStart + 1 }, (_, idx) => realStart + idx);
  }, [page, totalPages]);

  const approve = async (id) => {
    const confirmed = await showAppConfirm({
      title: "Xác nhận duyệt yêu cầu",
      message: "Bạn có chắc chắn muốn duyệt yêu cầu mua combo này?",
      confirmText: "Duyệt",
      cancelText: "Quay lại",
    });
    if (!confirmed.confirmed) return;
    try {
      setActionState({ id, type: "approve" });
      await adminPurchaseWorkflowService.approvePurchaseRequest(id);
      await loadRows();
      openNotice("success", "Duyệt thành công", "Yêu cầu mua combo đã được duyệt.");
    } catch (e) {
      openNotice("error", "Duyệt thất bại", e?.response?.data?.message || e.message);
    } finally {
      setActionState({ id: null, type: "" });
    }
  };

  const reject = async (id) => {
    const confirmed = await showAppConfirm({
      title: "Xác nhận từ chối",
      message: "Bạn có chắc chắn muốn từ chối yêu cầu này?",
      confirmText: "Từ chối",
      cancelText: "Quay lại",
    });
    if (!confirmed.confirmed) return;
    try {
      setActionState({ id, type: "reject" });
      await adminPurchaseWorkflowService.rejectPurchaseRequest(id, { rejectionReason: rejectMap[id] || "Admin từ chối yêu cầu mua combo" });
      setRejectMap((prev) => ({ ...prev, [id]: "" }));
      await loadRows();
      openNotice("success", "Đã từ chối", "Yêu cầu mua combo đã được từ chối.");
    } catch (e) {
      openNotice("error", "Từ chối thất bại", e?.response?.data?.message || e.message);
    } finally {
      setActionState({ id: null, type: "" });
    }
  };

  const ship = async (id) => {
    const confirmed = await showAppConfirm({
      title: "Xác nhận bàn giao combo",
      message: "Bạn xác nhận đã bàn giao combo cho owner?",
      confirmText: "Xác nhận bàn giao",
      cancelText: "Quay lại",
    });
    if (!confirmed.confirmed) return;
    try {
      setActionState({ id, type: "ship" });
      await adminPurchaseWorkflowService.confirmPurchaseRequestPaymentAndShip(id);
      await loadRows();
      openNotice("success", "Đã cập nhật", "Đơn đã chuyển sang trạng thái đang bàn giao.");
    } catch (e) {
      openNotice("error", "Cập nhật thất bại", e?.response?.data?.message || e.message);
    } finally {
      setActionState({ id: null, type: "" });
    }
  };

  return (
    <div className="purchase-admin-page">
      <section className="purchase-admin-hero">
        <div>
          <div className="purchase-admin-kicker">Quy trình admin</div>
          <h2>Yêu cầu bán combo</h2>
          <p>
            Admin theo dõi trọn luồng combo: owner gửi yêu cầu → admin duyệt → owner thanh toán 100% → admin giao combo → owner xác nhận nhận → hoàn tất.
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
          <option value="submitted">Chờ admin duyệt</option>
          <option value="approved_waiting_deposit">Đã duyệt, chờ owner đặt cọc</option>
          <option value="approved_waiting_payment">Đã duyệt, chờ owner thanh toán</option>
          <option value="paid_waiting_admin_confirm">Owner đã thanh toán, chờ admin bàn giao</option>
          <option value="shipping">Admin đang bàn giao combo</option>
          <option value="completed">Hoàn tất</option>
          <option value="rejected">Đã từ chối</option>
        </select>
        <button
          className="purchase-admin-btn"
          onClick={() => {
            setPage(1);
            loadRows({ page: 1 });
          }}
        >
          Tìm
        </button>
      </section>
      {actionState.id ? (
        <div className="purchase-admin-processing">
          Đang xử lý thao tác, vui lòng chờ...
        </div>
      ) : null}

      {loading ? <div className="purchase-admin-empty">Đang tải yêu cầu...</div> : null}

      <div className="purchase-admin-list">
        {rows.map((row) => {
          const thumbnailUrl = absUrl(row.combo?.thumbnail);
          const equipmentExpanded = Boolean(expandedEquipmentMap[row.id]);
          const rowActionType = actionState.id === row.id ? actionState.type : "";
          const rowBusy = Boolean(rowActionType);
          const canApproveReject = row.status === "submitted";
          const canShip = row.status === "paid_waiting_admin_confirm";
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
                    <div className="purchase-admin-card__statusInline">
                      <div className="purchase-admin-inlineItem">
                        <span>Trạng thái đơn</span>
                        <b className={`purchase-admin-badge status-${row.status}`}>{statusLabel(row.status)}</b>
                      </div>
                      <div className="purchase-admin-inlineItem">
                        <span>Tổng thanh toán</span>
                        <strong>{money(row.totalAmount || row.payableAmount)}đ</strong>
                      </div>
                    </div>
                  </div>

                  <div className="purchase-admin-grid">
                    <div className="purchase-admin-infoBlock">
                      <h4>Thông tin owner</h4>
                      <div className="purchase-admin-kv"><span>Chủ phòng gym</span><b>{row.requester?.username || row.requester?.email || "-"}</b></div>
                      <div className="purchase-admin-kv"><span>Liên hệ</span><b>{row.contactName || row.contactPhone || row.contactEmail || "-"}</b></div>
                      <div className="purchase-admin-kv"><span>Nhà cung cấp</span><b>{row.combo?.supplier?.name || "-"}</b></div>
                    </div>

                    <div className="purchase-admin-infoBlock">
                      <h4>Thanh toán</h4>
                      <div className="purchase-admin-kv"><span>Tổng giá combo</span><b>{money(row.totalAmount || row.payableAmount)}đ</b></div>
                      <div className="purchase-admin-kv"><span>Thanh toán</span><b>100%</b></div>
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

              <div className="purchase-admin-note">
                <b>Lý do:</b> {row.note || "Không có ghi chú từ owner."}
              </div>

              <div className="purchase-admin-actions">
                <button
                  type="button"
                  className="purchase-admin-btn purchase-admin-btn--ghost"
                  disabled={rowBusy}
                  onClick={() =>
                    setExpandedEquipmentMap((prev) => ({
                      ...prev,
                      [row.id]: !prev[row.id],
                    }))
                  }
                >
                  {equipmentExpanded ? "Ẩn danh sách thiết bị" : "Xem danh sách thiết bị"}
                </button>

                {canApproveReject ? (
                  <>
                    <button
                      className="purchase-admin-btn purchase-admin-btn--accent"
                      disabled={rowBusy}
                      onClick={() => approve(row.id)}
                    >
                      {rowActionType === "approve" ? "Đang xử lý..." : "Duyệt yêu cầu"}
                    </button>
                    <div className="purchase-admin-rejectBox">
                      <input
                        className="purchase-admin-input"
                        placeholder="Lý do từ chối"
                        value={rejectMap[row.id] || ""}
                        disabled={rowBusy}
                        onChange={(e) => setRejectMap((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      />
                      <button
                        className="purchase-admin-btn purchase-admin-btn--danger"
                        disabled={rowBusy}
                        onClick={() => reject(row.id)}
                      >
                        {rowActionType === "reject" ? "Đang xử lý..." : "Từ chối"}
                      </button>
                    </div>
                  </>
                ) : null}

                {canShip ? (
                  <button
                    className="purchase-admin-btn purchase-admin-btn--ship"
                    disabled={rowBusy}
                    onClick={() => ship(row.id)}
                  >
                    {rowActionType === "ship" ? "Đang xử lý..." : "Xác nhận bàn giao"}
                  </button>
                ) : null}
                {row.status === "rejected" ? <div className="purchase-admin-rejectReason">Lý do: {row.rejectReason || row.adminRejectionNote || "-"}</div> : null}
              </div>

              {equipmentExpanded ? (
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
              ) : null}
            </article>
          );
        })}
        {!rows.length && !loading ? <div className="purchase-admin-empty">Không có yêu cầu nào.</div> : null}
      </div>

      <section className="purchase-admin-pagination">
        <div className="purchase-admin-pagination__left">
          <span className="purchase-admin-pagination__range">{rangeText}</span>
          <label className="purchase-admin-pagination__label">
            <span>Hiển thị</span>
            <select
              className="purchase-admin-input purchase-admin-input--compact"
              value={limit}
              onChange={(e) => {
                const next = Number(e.target.value || 4);
                setLimit(next);
                setPage(1);
                loadRows({ page: 1, limit: next });
              }}
            >
              {[4, 8, 12, 20].map((n) => (
                <option key={n} value={n}>{n} / trang</option>
              ))}
            </select>
          </label>
        </div>
        <div className="purchase-admin-pagination__right">
          <button
            className="purchase-admin-btn purchase-admin-btn--ghost"
            disabled={Number(page) <= 1 || loading}
            onClick={() => {
              const next = Math.max(1, Number(page) - 1);
              setPage(next);
              loadRows({ page: next });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Trang trước
          </button>

          <div className="purchase-admin-pagination__pages">
            <span className="purchase-admin-pagination__pageText">
              Trang <b>{Math.min(Math.max(1, Number(page)), totalPages)}</b> / {totalPages}
            </span>
            <div className="purchase-admin-pagination__chips">
              {pageNumbers.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`purchase-admin-pageChip ${Number(page) === p ? "is-active" : ""}`}
                  onClick={() => {
                    setPage(p);
                    loadRows({ page: p });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={loading}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button
            className="purchase-admin-btn purchase-admin-btn--ghost"
            disabled={Number(page) >= totalPages || loading}
            onClick={() => {
              const next = Math.min(totalPages, Number(page) + 1);
              setPage(next);
              loadRows({ page: next });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Trang sau
          </button>
        </div>
      </section>

      <NiceModal
        open={Boolean(noticeModal.open)}
        onClose={() => setNoticeModal({ open: false, tone: "error", title: "", message: "" })}
        title={noticeModal.title || "Thông báo"}
        tone={noticeModal.tone || "error"}
        footer={
          <button
            type="button"
            className="nice-modal__btn nice-modal__btn--primary"
            onClick={() => setNoticeModal({ open: false, tone: "error", title: "", message: "" })}
          >
            Đã hiểu
          </button>
        }
      >
        <p>{noticeModal.message}</p>
      </NiceModal>
    </div>
  );
}
