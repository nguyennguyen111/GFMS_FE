import React, { useEffect, useMemo, useState } from "react";
import axios from "../../../setup/axios";
import { ownerGetMyGyms } from "../../../services/ownerGymService";
import {
  ownerGetActiveCombos,
  ownerCreatePurchaseRequest,
} from "../../../services/ownerPurchaseService";
import useSelectedGym from "../../../hooks/useSelectedGym";
import "./OwnerPurchaseRequestsPage.css";
import { useNavigate } from "react-router-dom";
import NiceModal from "../../common/NiceModal";

const money = (v) => Number(v || 0).toLocaleString("vi-VN");

const comboPlaceholder = (name = "Combo") =>
  (name || "C").trim().slice(0, 1).toUpperCase();

export default function OwnerPurchaseRequestsPage() {
  const navigate = useNavigate();
  const { selectedGymId } = useSelectedGym();

  const [gyms, setGyms] = useState([]);
  const [combos, setCombos] = useState([]);
  const [comboPage, setComboPage] = useState(1);
  const [comboPagination, setComboPagination] = useState({
    page: 1,
    limit: 5,
    totalItems: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    comboId: "",
    gymId: "",
    note: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
  });
  const [expandedComboId, setExpandedComboId] = useState(null);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(null);
  const [noticeModal, setNoticeModal] = useState(null);
  const [createdRequestId, setCreatedRequestId] = useState(null);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payos = params.get("payos");
    const orderCode = params.get("orderCode");
    if (!payos || !orderCode) return;

    const nextQuery = params.toString();
    navigate(`/owner/purchase-requests/history${nextQuery ? `?${nextQuery}` : ""}`, { replace: true });
  }, [navigate]);

  const comboTotals = (combo) => {
    const total = Number(combo?.price || 0);
    return {
      total,
      itemTypes: Array.isArray(combo?.items) ? combo.items.length : 0,
      itemUnits: Array.isArray(combo?.items)
        ? combo.items.reduce(
            (sum, item) => sum + Number(item.quantity || 0),
            0
          )
        : 0,
    };
  };

  const loadRefs = async (targetPage = comboPage) => {
    setLoading(true);
    try {
      const [gymRes, comboRes] = await Promise.all([
        ownerGetMyGyms(),
        ownerGetActiveCombos({ page: targetPage, limit: comboPagination.limit || 5 }),
      ]);

      const gymRows = gymRes?.data?.data || gymRes?.data || [];
      const comboRows = comboRes?.data?.data || [];
      const comboMeta = comboRes?.data?.meta || {};

      setGyms(gymRows);
      setCombos(comboRows);
      const nextPage = Number(comboMeta.page || targetPage || 1);
      setComboPagination({
        page: nextPage,
        limit: Number(comboMeta.limit || comboPagination.limit || 5),
        totalItems: Number(comboMeta.totalItems || 0),
        totalPages: Math.max(1, Number(comboMeta.totalPages || 1)),
      });
      setComboPage(nextPage);
      setExpandedComboId((prev) => prev || comboRows?.[0]?.id || null);

      setForm((prev) => ({
        ...prev,
        gymId: selectedGymId
          ? String(selectedGymId)
          : prev.gymId || String(gymRows?.[0]?.id || ""),
        comboId: prev.comboId || String(comboRows?.[0]?.id || ""),
      }));
    } catch (e) {
      setNoticeModal({
        tone: "error",
        title: "Không thể tải dữ liệu",
        message: e?.response?.data?.message || e?.message || "Đã xảy ra lỗi khi tải dữ liệu trang.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setComboPage(1);
    loadRefs(1);
  }, [selectedGymId]);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await ownerCreatePurchaseRequest({
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

      const createdId = res?.data?.data?.id || res?.data?.id || null;
      setCreatedRequestId(createdId || null);
      setSuccessModal({
        title: "Gửi yêu cầu thành công",
        message:
          "Yêu cầu mua combo đã được gửi lên hệ thống. Bạn có thể theo dõi tiến trình và trạng thái thanh toán trong Lịch sử mua combo.",
      });
    } catch (e2) {
      const message = e2?.response?.data?.message || e2?.message || "Không thể gửi yêu cầu.";
      const isDuplicateActiveRequest =
        String(message).toLowerCase().includes("đã có yêu cầu mua combo đang xử lý") ||
        Number(e2?.response?.status) === 409;
      setNoticeModal({
        tone: isDuplicateActiveRequest ? "warning" : "error",
        title: isDuplicateActiveRequest ? "Yêu cầu đang được xử lý" : "Gửi yêu cầu thất bại",
        message,
      });
    } finally {
      setSubmitting(false);
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
            combo để gửi yêu cầu chính xác, sau đó thanh toán 100% một lần qua
            PayOS.
          </p>
        </div>

        <div className="owner-combo-heroStats">
          <div className="owner-combo-statCard">
            <span>Combo đang bán</span>
            <strong>{comboPagination.totalItems || combos.length}</strong>
          </div>

          <div className="owner-combo-statCard">
            <span>Chi nhánh đang chọn</span>
            <strong>{gyms.find((g) => Number(g.id) === Number(form.gymId))?.name || "-"}</strong>
          </div>

          <div className="owner-combo-statCard owner-combo-statCard--accent">
            <span>Combo đang chọn</span>
            <strong>{selectedCombo?.name || "-"}</strong>
          </div>
        </div>
      </section>

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
                        <span className="owner-combo-chip owner-combo-chip--sales">
                          Đã bán {Number(combo.soldCount || 0)}
                        </span>
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
          <div className="owner-combo-pagination">
            <button
              type="button"
              className="owner-combo-btn"
              disabled={loading || comboPage <= 1}
              onClick={() => loadRefs(Math.max(1, comboPage - 1))}
            >
              Trang trước
            </button>
            <span className="owner-combo-pagination__meta">
              Trang {comboPagination.page || 1}/{Math.max(1, comboPagination.totalPages || 1)} · Tổng{" "}
              {comboPagination.totalItems || 0} combo
            </span>
            <button
              type="button"
              className="owner-combo-btn"
              disabled={loading || comboPage >= (comboPagination.totalPages || 1)}
              onClick={() =>
                loadRefs(Math.min(comboPagination.totalPages || 1, comboPage + 1))
              }
            >
              Trang sau
            </button>
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
          </div>

          {selectedCombo ? (
            <div className="owner-combo-selectedPreview">
              <div className="owner-combo-selectedPreview__title">
                <span>Preview dữ liệu owner sẽ gửi sang admin</span>
                <button
                  type="button"
                  className="owner-combo-btn owner-combo-btn--previewToggle"
                  onClick={() => setPreviewExpanded((prev) => !prev)}
                >
                  {previewExpanded ? "Ẩn danh sách thiết bị" : "Xem danh sách thiết bị"}
                </button>
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

              {previewExpanded ? renderEquipmentRows(selectedCombo.items || [], true) : null}
            </div>
          ) : null}

          <button
            className="owner-combo-btn owner-combo-btn--accent owner-combo-btn--full"
            type="submit"
            disabled={loading || submitting}
          >
            {loading || submitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu mua combo"}
          </button>
        </form>
      </div>

      <NiceModal
        open={Boolean(successModal)}
        onClose={() => {
          setSuccessModal(null);
          const highlightQuery = createdRequestId
            ? `?purchaseRequestId=${encodeURIComponent(createdRequestId)}`
            : "";
          navigate(`/owner/purchase-requests/history${highlightQuery}`);
        }}
        title={successModal?.title || "Thông báo"}
        tone="success"
        footer={
          <button
            type="button"
            className="nice-modal__btn nice-modal__btn--primary"
            onClick={() => {
              setSuccessModal(null);
              const highlightQuery = createdRequestId
                ? `?purchaseRequestId=${encodeURIComponent(createdRequestId)}`
                : "";
              navigate(`/owner/purchase-requests/history${highlightQuery}`);
            }}
          >
            Xem lịch sử
          </button>
        }
      >
        <p>{successModal?.message}</p>
      </NiceModal>

      <NiceModal
        open={Boolean(noticeModal)}
        onClose={() => setNoticeModal(null)}
        title={noticeModal?.title || "Thông báo"}
        tone={noticeModal?.tone || "error"}
        footer={
          <button
            type="button"
            className="nice-modal__btn nice-modal__btn--primary"
            onClick={() => setNoticeModal(null)}
          >
            Đã hiểu
          </button>
        }
      >
        <p>{noticeModal?.message}</p>
      </NiceModal>
    </div>
  );
}