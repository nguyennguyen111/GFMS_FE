import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../../../setup/axios";
import "./OwnerPurchaseRequestsPage.css";
import useSelectedGym from "../../../hooks/useSelectedGym";
import { connectSocket } from "../../../services/socketClient";
import {
  ownerConfirmReceivePurchaseRequest,
  ownerCreatePurchaseRequestPayOSLink,
  ownerExportPurchaseRequestsExcel,
  ownerGetPurchaseRequests,
} from "../../../services/ownerPurchaseService";
import { confirmPayosPayment } from "../../../services/paymentService";
import NiceModal from "../../common/NiceModal";

const money = (v) => Number(v || 0).toLocaleString("vi-VN");

const statusLabel = (status) =>
  ({
    submitted: "Chờ admin duyệt",
    approved_waiting_deposit: "Đã duyệt, chờ đặt cọc",
    approved_waiting_payment: "Chờ thanh toán",
    paid_waiting_admin_confirm: "Đã thanh toán, chờ admin bàn giao",
    shipping: "Đang giao combo",
    completed: "Hoàn tất",
    rejected: "Bị từ chối",
  }[status] || status || "-");

const statusClass = (status) =>
  `owner-combo-status owner-combo-status--${status || "default"}`;

const comboPlaceholder = (name = "Combo") =>
  (name || "C").trim().slice(0, 1).toUpperCase();

export default function OwnerPurchaseRequestHistoryPage() {
  const { selectedGymId } = useSelectedGym();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payingId, setPayingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    totalItems: 0,
    totalPages: 1,
  });
  const [expandedEquipmentMap, setExpandedEquipmentMap] = useState({});
  const [actionModal, setActionModal] = useState({
    open: false,
    title: "",
    message: "",
    tone: "info",
    busy: false,
  });
  const [confirmingReceivedId, setConfirmingReceivedId] = useState(null);

  const API_HOST = String(
    axios?.defaults?.baseURL ||
      process.env.REACT_APP_API_BASE ||
      "http://localhost:8080"
  ).replace(/\/+$/, "");

  const absUrl = (value) =>
    value
      ? String(value).startsWith("http") || String(value).startsWith("data:")
        ? String(value)
        : `${API_HOST}${value}`
      : "";

  const openNotice = (tone, title, message) => {
    setActionModal({
      open: true,
      tone: tone || "info",
      title: title || "Thông báo",
      message: message || "",
      busy: false,
    });
  };

  const openProcessing = (message) => {
    setActionModal({
      open: true,
      tone: "info",
      title: "Đang xử lý",
      message: message || "Hệ thống đang xử lý, vui lòng chờ...",
      busy: true,
    });
  };

  const loadRequests = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError("");

    try {
      const res = await ownerGetPurchaseRequests({
        page: targetPage,
        limit: 5,
        gymId: selectedGymId || undefined,
      });

      setRequests(res?.data?.data || []);
      const meta = res?.data?.meta || {};
      const nextPage = Number(meta.page || targetPage || 1);
      setPagination({
        page: nextPage,
        limit: Number(meta.limit || 5),
        totalItems: Number(meta.totalItems || 0),
        totalPages: Math.max(1, Number(meta.totalPages || 1)),
      });
      setPage(nextPage);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedGymId]);

  useEffect(() => {
    setPage(1);
    loadRequests(1);
  }, [selectedGymId, loadRequests]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payos = params.get("payos");
    const orderCode = params.get("orderCode");

    if (payos === "success" && orderCode) {
      openProcessing("Đang xác nhận thanh toán PayOS...");
      confirmPayosPayment(orderCode)
        .then(() => {
          openNotice("success", "Thanh toán thành công", "Hệ thống đã ghi nhận thanh toán. Dữ liệu sẽ được cập nhật ngay.");
          loadRequests();
        })
        .catch((e) => {
          const msg = e?.response?.data?.message || e.message;
          setError(msg);
          openNotice("error", "Xác nhận thanh toán thất bại", msg);
        });
    }
  }, [loadRequests]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("payos")) return;
    params.delete("payos");
    params.delete("orderCode");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, []);

  useEffect(() => {
    const socket = connectSocket();

    const onPurchaseFlowChanged = (payload = {}) => {
      const relatedType = String(
        payload?.relatedType || payload?.type || ""
      ).toLowerCase();
      const notificationType = String(
        payload?.notificationType || payload?.type || ""
      ).toLowerCase();

      if (
        ["purchaserequest", "purchase_request"].includes(relatedType) ||
        ["purchase_request", "payment"].includes(notificationType)
      ) {
        loadRequests(page);
      }
    };

    socket.on("notification:new", onPurchaseFlowChanged);
    socket.on("equipment:changed", onPurchaseFlowChanged);

    return () => {
      socket.off("notification:new", onPurchaseFlowChanged);
      socket.off("equipment:changed", onPurchaseFlowChanged);
    };
  }, [loadRequests, page]);

  useEffect(() => {
    if (!requests.length) return;

    const params = new URLSearchParams(window.location.search);
    const purchaseRequestId = Number(params.get("purchaseRequestId") || 0);
    if (!purchaseRequestId) return;

    const exists = requests.some(
      (item) => Number(item.id) === purchaseRequestId
    );
    if (!exists) return;

    window.requestAnimationFrame(() => {
      const el = document.getElementById(
        `owner-purchase-request-${purchaseRequestId}`
      );
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [requests]);

  const payFull = async (requestId) => {
    if (payingId === requestId) return;
    setPayingId(requestId);
    setError("");

    try {
      openProcessing("Đang tạo link thanh toán PayOS...");
      const res = await ownerCreatePurchaseRequestPayOSLink(requestId, {
        phase: "full",
      });
      const url = res?.data?.data?.checkoutUrl || res?.data?.checkoutUrl;
      if (url) window.location.href = url;
      else openNotice("error", "Không tạo được link", "Hệ thống không trả về link thanh toán.");
    } catch (e) {
      const msg = e?.response?.data?.message || e.message;
      setError(msg);
      openNotice("error", "Thanh toán thất bại", msg);
    } finally {
      setPayingId(null);
    }
  };

  const confirmReceived = async (requestId) => {
    if (confirmingReceivedId === requestId) return;
    setConfirmingReceivedId(requestId);
    setError("");
    try {
      openProcessing("Đang xác nhận đã nhận combo...");
      await ownerConfirmReceivePurchaseRequest(requestId);
      await loadRequests(page);
      openNotice("success", "Thành công", "Đã xác nhận nhận combo. Hệ thống đã ghi nhận hoàn tất giao dịch mua combo.");
    } catch (e) {
      const msg = e?.response?.data?.message || e.message;
      setError(msg);
      openNotice("error", "Xác nhận thất bại", msg);
    } finally {
      setConfirmingReceivedId(null);
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `lich-su-mua-combo-${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onExportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    setError("");
    try {
      openProcessing("Đang xuất file Excel...");
      const res = await ownerExportPurchaseRequestsExcel({
        gymId: selectedGymId || undefined,
      });
      const blob = res?.data instanceof Blob ? res.data : new Blob([res?.data]);
      downloadBlob(blob, `lich-su-mua-combo-${new Date().toISOString().slice(0, 10)}.xlsx`);
      openNotice("success", "Xuất Excel thành công", "File Excel lịch sử mua combo đã được tải xuống.");
    } catch (e) {
      const msg = e?.response?.data?.message || e.message;
      setError(msg);
      openNotice("error", "Xuất Excel thất bại", msg);
    } finally {
      setExporting(false);
    }
  };

  const renderEquipmentRows = (items = []) => (
    <div className="owner-combo-equipmentList">
      {items.map((item, index) => {
        const equipment = item?.equipment || {};
        const imageUrl = absUrl(
          equipment.primaryImageUrl || equipment?.images?.[0]?.url || ""
        );

        return (
          <div
            key={item.id || `${item.equipmentId}-${index}`}
            className="owner-combo-equipmentRow"
          >
            <div className="owner-combo-equipmentRow__media">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={equipment.name || `Thiết bị ${index + 1}`}
                />
              ) : (
                <span>{comboPlaceholder(equipment.name)}</span>
              )}
            </div>

            <div className="owner-combo-equipmentRow__body">
              <div className="owner-combo-equipmentRow__top">
                <strong>
                  {equipment.name || `Thiết bị #${item.equipmentId}`}
                </strong>
                <span className="owner-combo-chip">x {item.quantity}</span>
              </div>

              <div className="owner-combo-equipmentRow__meta">
                <span>{equipment.code || `EQ-${item.equipmentId}`}</span>
                {equipment.category?.name ? (
                  <span>{equipment.category.name}</span>
                ) : null}
                {equipment.supplier?.name ? (
                  <span>{equipment.supplier.name}</span>
                ) : null}
              </div>

              <div className="owner-combo-equipmentRow__desc">
                {equipment.description ||
                  item.note ||
                  "Thiết bị được lấy từ catalog gốc của hệ thống."}
              </div>
            </div>
          </div>
        );
      })}

      {!items.length ? (
        <div className="owner-combo-empty">
          Combo này chưa có thiết bị hiển thị.
        </div>
      ) : null}
    </div>
  );

  const requestCountByStatus = useMemo(() => {
    const counters = new Map();
    for (const row of requests) {
      const key = String(row.status || "unknown");
      counters.set(key, Number(counters.get(key) || 0) + 1);
    }
    return counters;
  }, [requests]);

  return (
    <div className="owner-combo-page">
      <section className="owner-combo-hero">
        <div>
          <div className="owner-combo-kicker">Theo dõi tiến trình</div>
          <h2>Lịch sử mua combo</h2>
          <p>
            Quản trị lịch sử request combo theo từng trạng thái, theo dõi thanh toán 100% và snapshot thiết bị tại thời điểm mua.
          </p>
        </div>

        <div className="owner-combo-heroStats">
          <div className="owner-combo-statCard">
            <span>Tổng yêu cầu</span>
            <strong>{requests.length}</strong>
          </div>
          <div className="owner-combo-statCard">
            <span>Đang xử lý</span>
            <strong>
              {Number(requestCountByStatus.get("submitted") || 0) +
                Number(requestCountByStatus.get("approved_waiting_deposit") || 0) +
                Number(requestCountByStatus.get("approved_waiting_payment") || 0) +
                Number(requestCountByStatus.get("paid_waiting_admin_confirm") || 0) +
                Number(requestCountByStatus.get("shipping") || 0)}
            </strong>
          </div>
          <div className="owner-combo-statCard owner-combo-statCard--accent">
            <span>Hoàn tất</span>
            <strong>{Number(requestCountByStatus.get("completed") || 0)}</strong>
          </div>
        </div>
      </section>

      {error ? <div className="owner-combo-alert">{error}</div> : null}

      <section className="owner-combo-panel owner-combo-history">
        <div className="owner-combo-panel__header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h3>Lịch sử yêu cầu mua combo</h3>
            <p>
              Mỗi request hiển thị trạng thái, tổng giá combo và snapshot thiết bị đúng tại thời điểm mua.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="owner-combo-btn"
              onClick={onExportExcel}
              disabled={exporting}
              title="Xuất file Excel lịch sử mua combo"
            >
              {exporting ? "Đang xuất..." : "Xuất Excel"}
            </button>
            <button
              type="button"
              className="owner-combo-btn owner-combo-btn--accent"
              onClick={() => loadRequests(page)}
              disabled={loading}
            >
              {loading ? "Đang tải..." : "Làm mới"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="owner-combo-empty">Đang tải dữ liệu...</div>
        ) : null}

        <div className="owner-combo-historyList">
          {requests.map((request) => {
            const combo = request.combo || {};
            const thumbnailUrl = absUrl(combo.thumbnail);
            const equipmentExpanded = Boolean(expandedEquipmentMap[request.id]);

            return (
              <article
                id={`owner-purchase-request-${request.id}`}
                key={request.id}
                className="owner-combo-historyCard"
              >
                <div className="owner-combo-historyCard__hero">
                  <div className="owner-combo-historyCard__media">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={combo.name || request.code}
                      />
                    ) : (
                      <span>
                        {comboPlaceholder(combo.name || request.code)}
                      </span>
                    )}
                  </div>

                  <div className="owner-combo-historyCard__main">
                    <div className="owner-combo-historyCard__top">
                      <div>
                        <div className="owner-combo-historyCard__code">
                          {request.code}
                        </div>
                        <div className="owner-combo-historyCard__meta">
                          {combo.name || "-"} · {request.gym?.name || "-"}
                        </div>
                      </div>

                      <div className="owner-combo-historyCard__topRight">
                        <span className={statusClass(request.status)}>
                          {statusLabel(request.status)}
                        </span>
                        <strong>
                          {money(
                            request.totalAmount || request.payableAmount
                          )}
                          đ
                        </strong>
                      </div>
                    </div>

                    <div className="owner-combo-historyGrid">
                      <div className="owner-combo-infoBlock">
                        <h4>Thanh toán</h4>
                        <div className="owner-combo-kv">
                          <span>Tổng giá combo</span>
                          <b>{money(request.totalAmount || request.payableAmount)}đ</b>
                        </div>
                      </div>

                      <div className="owner-combo-infoBlock">
                        <h4>Liên hệ / ghi chú</h4>
                        <div className="owner-combo-kv">
                          <span>Người liên hệ</span>
                          <b>{request.contactName || "-"}</b>
                        </div>
                        <div className="owner-combo-kv">
                          <span>SĐT / Email</span>
                          <b>
                            {request.contactPhone ||
                              request.contactEmail ||
                              "-"}
                          </b>
                        </div>
                        <div className="owner-combo-kv">
                          <span>Ghi chú</span>
                          <b>{request.note || "-"}</b>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="owner-combo-historyCard__actions">
                  <button
                    type="button"
                    className="owner-combo-btn owner-combo-btn--previewToggle"
                    onClick={() =>
                      setExpandedEquipmentMap((prev) => ({
                        ...prev,
                        [request.id]: !prev[request.id],
                      }))
                    }
                  >
                    {equipmentExpanded ? "Ẩn danh sách thiết bị" : "Xem danh sách thiết bị"}
                  </button>

                  {request.status === "approved_waiting_payment" ? (
                    <button
                      className="owner-combo-btn owner-combo-btn--accent"
                      onClick={() => payFull(request.id)}
                      disabled={payingId === request.id}
                    >
                      {payingId === request.id ? "Đang tạo link..." : "Thanh toán 100%"}
                    </button>
                  ) : null}

                  {request.status === "shipping" ? (
                    <button
                      className="owner-combo-btn owner-combo-btn--accent"
                      disabled={confirmingReceivedId === request.id}
                      onClick={() => confirmReceived(request.id)}
                    >
                      {confirmingReceivedId === request.id ? "Đang xử lý..." : "Xác nhận đã nhận combo"}
                    </button>
                  ) : null}

                  {request.status === "rejected" ? (
                    <div className="owner-combo-rejectReason">
                      Lý do từ chối:{" "}
                      {request.rejectReason ||
                        request.adminRejectionNote ||
                        "-"}
                    </div>
                  ) : null}
                </div>

                {equipmentExpanded ? renderEquipmentRows(combo.items || []) : null}
              </article>
            );
          })}

          {!requests.length && !loading ? (
            <div className="owner-combo-empty">
              Bạn chưa có yêu cầu mua combo nào.
            </div>
          ) : null}
        </div>
        <div className="owner-combo-pagination">
          <button
            type="button"
            className="owner-combo-btn"
            disabled={loading || page <= 1}
            onClick={() => loadRequests(Math.max(1, page - 1))}
          >
            Trang trước
          </button>
          <span className="owner-combo-pagination__meta">
            Trang {pagination.page || 1}/{Math.max(1, pagination.totalPages || 1)} · Tổng{" "}
            {pagination.totalItems || 0} yêu cầu
          </span>
          <button
            type="button"
            className="owner-combo-btn"
            disabled={loading || page >= (pagination.totalPages || 1)}
            onClick={() => loadRequests(Math.min(pagination.totalPages || 1, page + 1))}
          >
            Trang sau
          </button>
        </div>
      </section>

      <NiceModal
        overlayClassName="owner-combo-nice-root"
        open={Boolean(actionModal.open)}
        onClose={() => {
          if (actionModal.busy) return;
          setActionModal({ open: false, title: "", message: "", tone: "info", busy: false });
        }}
        title={actionModal.title || "Thông báo"}
        tone={actionModal.tone || "info"}
        footer={
          actionModal.busy ? null : (
            <button
              type="button"
              className="nice-modal__btn nice-modal__btn--primary"
              onClick={() => setActionModal({ open: false, title: "", message: "", tone: "info", busy: false })}
            >
              Đã hiểu
            </button>
          )
        }
      >
        <p>{actionModal.message}</p>
      </NiceModal>
    </div>
  );
}

