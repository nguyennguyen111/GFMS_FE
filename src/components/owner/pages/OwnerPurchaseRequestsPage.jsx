import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../../../setup/axios";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import {
  ownerGetActiveCombos,
  ownerCreatePurchaseRequest,
  ownerGetPurchaseRequests,
  ownerCreatePurchaseRequestPayOSLink,
  ownerConfirmReceivePurchaseRequest,
} from "../../../services/ownerPurchaseService";
import { confirmPayosPayment } from "../../../services/paymentService";
import useSelectedGym from "../../../hooks/useSelectedGym";
import { connectSocket } from "../../../services/socketClient";
import "./OwnerPurchaseRequestsPage.css";

const money = (v) => Number(v || 0).toLocaleString("vi-VN");

const statusLabel = (status) =>
  ({
    submitted: "Chờ admin duyệt",
    approved_waiting_deposit: "Chờ thanh toán cọc 30%",
    paid_waiting_admin_confirm: "Đã cọc, chờ admin bàn giao",
    shipping: "Đang giao combo",
    delivered_waiting_final_payment: "Đã nhận combo, chờ thanh toán 70%",
    completed: "Hoàn tất",
    rejected: "Bị từ chối",
  }[status] || status || "-");

const statusClass = (status) =>
  `owner-combo-status owner-combo-status--${status || "default"}`;

const comboPlaceholder = (name = "Combo") =>
  (name || "C").trim().slice(0, 1).toUpperCase();

export default function OwnerPurchaseRequestsPage() {
  const { selectedGymId } = useSelectedGym();

  const [gyms, setGyms] = useState([]);
  const [combos, setCombos] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    comboId: "",
    gymId: "",
    note: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
  });
  const [payingId, setPayingId] = useState(null);
  const [expandedComboId, setExpandedComboId] = useState(null);

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

  const selectedCombo = useMemo(
    () => combos.find((combo) => Number(combo.id) === Number(form.comboId)),
    [combos, form.comboId]
  );

  const comboTotals = (combo) => {
    const total = Number(combo?.price || 0);
    return {
      total,
      deposit: Math.round(total * 0.3),
      final: Math.round(total * 0.7),
      itemTypes: Array.isArray(combo?.items) ? combo.items.length : 0,
      itemUnits: Array.isArray(combo?.items)
        ? combo.items.reduce(
            (sum, item) => sum + Number(item.quantity || 0),
            0
          )
        : 0,
    };
  };

  const loadRefs = async () => {
    const [gymRes, comboRes] = await Promise.all([
      ownerGetMyGyms(),
      ownerGetActiveCombos({ page: 1, limit: 100 }),
    ]);

    const gymRows = gymRes?.data?.data || gymRes?.data || [];
    const comboRows = comboRes?.data?.data || [];

    setGyms(gymRows);
    setCombos(comboRows);
    setExpandedComboId((prev) => prev || comboRows?.[0]?.id || null);

    setForm((prev) => ({
      ...prev,
      gymId: selectedGymId
        ? String(selectedGymId)
        : prev.gymId || String(gymRows?.[0]?.id || ""),
      comboId: prev.comboId || String(comboRows?.[0]?.id || ""),
    }));
  };

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await ownerGetPurchaseRequests({
        page: 1,
        limit: 50,
        gymId: selectedGymId || undefined,
      });

      setRequests(res?.data?.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedGymId]);

  useEffect(() => {
    loadRefs();
    loadRequests();
  }, [selectedGymId, loadRequests]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payos = params.get("payos");
    const orderCode = params.get("orderCode");

    if (payos === "success" && orderCode) {
      confirmPayosPayment(orderCode)
        .then(() => loadRequests())
        .catch((e) => setError(e?.response?.data?.message || e.message));
    }
  }, [loadRequests]);

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
        loadRequests();
      }
    };

    socket.on("notification:new", onPurchaseFlowChanged);
    socket.on("equipment:changed", onPurchaseFlowChanged);

    return () => {
      socket.off("notification:new", onPurchaseFlowChanged);
      socket.off("equipment:changed", onPurchaseFlowChanged);
    };
  }, [loadRequests]);

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

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await ownerCreatePurchaseRequest({
        comboId: Number(form.comboId),
        gymId: Number(form.gymId),
        note: form.note,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
      });

      setForm((prev) => ({
        ...prev,
        comboId: prev.comboId,
        note: "",
        contactName: "",
        contactPhone: "",
        contactEmail: "",
      }));

      loadRequests();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2.message);
    }
  };

  const payPhase = async (requestId, phase) => {
    setPayingId(requestId);

    try {
      const res = await ownerCreatePurchaseRequestPayOSLink(requestId, {
        phase,
      });
      const url = res?.data?.data?.checkoutUrl || res?.data?.checkoutUrl;
      if (url) window.location.href = url;
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setPayingId(null);
    }
  };

  const confirmReceived = async (requestId) => {
    try {
      await ownerConfirmReceivePurchaseRequest(requestId);
      loadRequests();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  const renderEquipmentRows = (items = [], dense = false) => (
    <div className={`owner-combo-equipmentList ${dense ? "is-dense" : ""}`}>
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

  return (
    <div className="owner-combo-page">
      <section className="owner-combo-hero">
        <div>
          <div className="owner-combo-kicker">Mua hàng theo combo</div>
          <h2>Yêu cầu mua combo thiết bị</h2>
          <p>
            Owner chỉ mua theo combo, nhưng vẫn xem rõ từng thiết bị có trong
            combo để gửi yêu cầu chính xác, sau đó thanh toán 2 giai đoạn qua
            PayOS.
          </p>
        </div>

        <div className="owner-combo-heroStats">
          <div className="owner-combo-statCard">
            <span>Combo đang bán</span>
            <strong>{combos.length}</strong>
          </div>

          <div className="owner-combo-statCard">
            <span>Yêu cầu đã tạo</span>
            <strong>{requests.length}</strong>
          </div>

          <div className="owner-combo-statCard owner-combo-statCard--accent">
            <span>Combo đang chọn</span>
            <strong>{selectedCombo?.name || "-"}</strong>
          </div>
        </div>
      </section>

      {error ? <div className="owner-combo-alert">{error}</div> : null}

      <div className="owner-combo-layout">
        <section className="owner-combo-panel">
          <div className="owner-combo-panel__header">
            <div>
              <h3>Danh sách combo đang bán</h3>
              <p>
                Nhấn vào một combo để xem đầy đủ thiết bị thành phần trước khi
                gửi yêu cầu.
              </p>
            </div>
          </div>

          <div className="owner-combo-grid">
            {combos.map((combo) => {
              const isSelected = Number(form.comboId) === Number(combo.id);
              const isExpanded = Number(expandedComboId) === Number(combo.id);
              const pricing = comboTotals(combo);
              const thumbnailUrl = absUrl(combo.thumbnail);

              return (
                <article
                  key={combo.id}
                  className={`owner-combo-card ${
                    isSelected ? "is-selected" : ""
                  }`}
                >
                  <div className="owner-combo-card__hero">
                    <div className="owner-combo-card__media">
                      {thumbnailUrl ? (
                        <img src={thumbnailUrl} alt={combo.name} />
                      ) : (
                        <span>{comboPlaceholder(combo.name)}</span>
                      )}
                    </div>

                    <div className="owner-combo-card__content">
                      <div className="owner-combo-card__head">
                        <div>
                          <div className="owner-combo-card__title">
                            {combo.name}
                          </div>
                          <div className="owner-combo-card__meta">
                            {combo.code || `COMBO-${combo.id}`} · Supplier:{" "}
                            {combo.supplier?.name || "-"}
                          </div>
                        </div>

                        <div className="owner-combo-card__price">
                          {money(combo.price)}đ
                        </div>
                      </div>

                      <div className="owner-combo-card__desc">
                        {combo.description || "Không có mô tả combo."}
                      </div>

                      <div className="owner-combo-card__summary">
                        <span>{pricing.itemTypes} loại thiết bị</span>
                        <span>{pricing.itemUnits} thiết bị tổng</span>
                        <span>Cọc {money(pricing.deposit)}đ</span>
                        <span>Còn lại {money(pricing.final)}đ</span>
                      </div>
                    </div>
                  </div>

                  <div className="owner-combo-card__actions">
                    <button
                      type="button"
                      className="owner-combo-btn owner-combo-btn--accent"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          comboId: String(combo.id),
                        }));
                        setExpandedComboId(combo.id);
                      }}
                    >
                      Chọn combo này
                    </button>

                    <button
                      type="button"
                      className="owner-combo-btn"
                      onClick={() =>
                        setExpandedComboId(isExpanded ? null : combo.id)
                      }
                    >
                      {isExpanded
                        ? "Ẩn danh sách thiết bị"
                        : "Xem thiết bị trong combo"}
                    </button>
                  </div>

                  {isExpanded ? renderEquipmentRows(combo.items || []) : null}
                </article>
              );
            })}

            {!combos.length ? (
              <div className="owner-combo-empty">Chưa có combo active.</div>
            ) : null}
          </div>
        </section>

        <form
          onSubmit={submit}
          className="owner-combo-panel owner-combo-formPanel"
        >
          <div className="owner-combo-panel__header">
            <div>
              <h3>Gửi yêu cầu mua combo</h3>
              <p>Điền thông tin liên hệ và chọn đúng gym / branch nhận combo.</p>
            </div>
          </div>

          <div className="owner-combo-formGrid">
            <select
              className="owner-combo-input"
              value={form.comboId}
              onChange={(e) =>
                setForm({ ...form, comboId: e.target.value })
              }
            >
              <option value="">Chọn combo</option>
              {combos.map((combo) => (
                <option key={combo.id} value={combo.id}>
                  {combo.name}
                </option>
              ))}
            </select>

            <select
              className="owner-combo-input"
              value={form.gymId}
              onChange={(e) => setForm({ ...form, gymId: e.target.value })}
            >
              <option value="">Chọn gym / branch</option>
              {gyms.map((gym) => (
                <option key={gym.id} value={gym.id}>
                  {gym.name}
                </option>
              ))}
            </select>

            <input
              className="owner-combo-input"
              placeholder="Tên liên hệ"
              value={form.contactName}
              onChange={(e) =>
                setForm({ ...form, contactName: e.target.value })
              }
            />

            <input
              className="owner-combo-input"
              placeholder="Số điện thoại"
              value={form.contactPhone}
              onChange={(e) =>
                setForm({ ...form, contactPhone: e.target.value })
              }
            />

            <input
              className="owner-combo-input owner-combo-formGrid__full"
              placeholder="Email liên hệ"
              value={form.contactEmail}
              onChange={(e) =>
                setForm({ ...form, contactEmail: e.target.value })
              }
            />

            <textarea
              className="owner-combo-input owner-combo-input--textarea owner-combo-formGrid__full"
              placeholder="Ghi chú / lý do mua"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>

          <div className="owner-combo-pricing">
            <div className="owner-combo-pricing__row">
              <span>Tổng giá combo</span>
              <strong>{money(comboTotals(selectedCombo).total)}đ</strong>
            </div>
            <div className="owner-combo-pricing__row">
              <span>Tiền cọc 30%</span>
              <strong>{money(comboTotals(selectedCombo).deposit)}đ</strong>
            </div>
            <div className="owner-combo-pricing__row">
              <span>Tiền còn lại 70%</span>
              <strong>{money(comboTotals(selectedCombo).final)}đ</strong>
            </div>
          </div>

          {selectedCombo ? (
            <div className="owner-combo-selectedPreview">
              <div className="owner-combo-selectedPreview__title">
                Preview dữ liệu owner sẽ gửi sang admin
              </div>

              <div className="owner-combo-selectedPreview__hero">
                <div className="owner-combo-selectedPreview__media">
                  {absUrl(selectedCombo.thumbnail) ? (
                    <img
                      src={absUrl(selectedCombo.thumbnail)}
                      alt={selectedCombo.name}
                    />
                  ) : (
                    <span>{comboPlaceholder(selectedCombo.name)}</span>
                  )}
                </div>

                <div>
                  <strong>{selectedCombo.name}</strong>
                  <div className="owner-combo-card__meta">
                    {selectedCombo.code || `COMBO-${selectedCombo.id}`} ·{" "}
                    {selectedCombo.supplier?.name || "Chưa có supplier"}
                  </div>
                </div>
              </div>

              {renderEquipmentRows(selectedCombo.items || [], true)}
            </div>
          ) : null}

          <button
            className="owner-combo-btn owner-combo-btn--accent owner-combo-btn--full"
            type="submit"
          >
            Gửi yêu cầu mua combo
          </button>
        </form>
      </div>

      <section className="owner-combo-panel owner-combo-history">
        <div className="owner-combo-panel__header">
          <div>
            <h3>Lịch sử yêu cầu mua combo</h3>
            <p>
              Mỗi request đều hiện trạng thái, số tiền cọc, số tiền còn lại và
              snapshot thiết bị đúng tại thời điểm mua.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="owner-combo-empty">Đang tải dữ liệu...</div>
        ) : null}

        <div className="owner-combo-historyList">
          {requests.map((request) => {
            const combo = request.combo || {};
            const thumbnailUrl = absUrl(combo.thumbnail);

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
                          <span>Cọc 30%</span>
                          <b>{money(request.depositAmount)}đ</b>
                        </div>
                        <div className="owner-combo-kv">
                          <span>Còn lại 70%</span>
                          <b>
                            {money(
                              request.finalAmount || request.remainingAmount
                            )}
                            đ
                          </b>
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

                {renderEquipmentRows(combo.items || [])}

                <div className="owner-combo-historyCard__actions">
                  {request.status === "approved_waiting_deposit" ? (
                    <button
                      className="owner-combo-btn owner-combo-btn--accent"
                      onClick={() => payPhase(request.id, "deposit")}
                      disabled={payingId === request.id}
                    >
                      Thanh toán cọc 30%
                    </button>
                  ) : null}

                  {request.status === "shipping" ? (
                    <button
                      className="owner-combo-btn owner-combo-btn--accent"
                      onClick={() => confirmReceived(request.id)}
                    >
                      Xác nhận đã nhận combo
                    </button>
                  ) : null}

                  {request.status === "delivered_waiting_final_payment" ? (
                    <button
                      className="owner-combo-btn owner-combo-btn--accent"
                      onClick={() => payPhase(request.id, "final")}
                      disabled={payingId === request.id}
                    >
                      Thanh toán 70% còn lại
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
              </article>
            );
          })}

          {!requests.length && !loading ? (
            <div className="owner-combo-empty">
              Bạn chưa có yêu cầu mua combo nào.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}