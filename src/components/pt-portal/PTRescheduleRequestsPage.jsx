import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./PTRescheduleRequestsPage.css";
import { connectSocket } from "../../services/socketClient";

// sửa lại import service đúng với project của bạn
import {
  getMyPTRescheduleRequests,
  approvePTRescheduleRequest,
  rejectPTRescheduleRequest,
} from "../../services/ptService";

function bookingToYMD(dateValue) {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return String(dateValue).slice(0, 10);

  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateVN(dateValue) {
  if (!dateValue) return "—";
  const raw = String(dateValue).slice(0, 10);
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatTimeHHMM(value) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

function getStatusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "Đã chấp nhận";
  if (s === "rejected") return "Đã từ chối";
  return "Đang chờ";
}

function getToastTypeClass(type) {
  if (type === "success") return "ptrq-toast--success";
  if (type === "error") return "ptrq-toast--error";
  return "ptrq-toast--info";
}

export default function PTRescheduleRequestsPage() {
  const [rescheduleRequests, setRescheduleRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);

  const [toast, setToast] = useState({
    open: false,
    type: "info",
    message: "",
  });

  const [rejectModal, setRejectModal] = useState({
    open: false,
    requestId: null,
    note: "",
  });

  const showToast = useCallback((type, message) => {
    setToast({ open: true, type, message });
  }, []);

  useEffect(() => {
    if (!toast.open) return;
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }));
    }, 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadRescheduleRequests = useCallback(async (opts = {}) => {
    try {
      setLoading(true);
      const res = await getMyPTRescheduleRequests({ force: opts.force === true });
      setRescheduleRequests(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      console.error("Load PT reschedule requests failed:", error);
      setRescheduleRequests([]);
      showToast("error", "Không tải được danh sách yêu cầu đổi lịch.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadRescheduleRequests();
  }, [loadRescheduleRequests]);

  useEffect(() => {
    const socket = connectSocket();
    let t = null;
    const onNoti = (payload) => {
      const type = String(payload?.notificationType || "").toLowerCase();
      if (type !== "booking_reschedule") return;
      if (t) clearTimeout(t);
      t = setTimeout(() => loadRescheduleRequests({ force: true }), 250);
    };
    socket.on("notification:new", onNoti);
    return () => {
      if (t) clearTimeout(t);
      socket.off("notification:new", onNoti);
    };
  }, [loadRescheduleRequests]);

  const pendingRescheduleCount = useMemo(() => {
    return rescheduleRequests.filter(
      (r) => String(r?.status || "").toLowerCase() === "pending"
    ).length;
  }, [rescheduleRequests]);

  const approvedCount = useMemo(() => {
    return rescheduleRequests.filter(
      (r) => String(r?.status || "").toLowerCase() === "approved"
    ).length;
  }, [rescheduleRequests]);

  const rejectedCount = useMemo(() => {
    return rescheduleRequests.filter(
      (r) => String(r?.status || "").toLowerCase() === "rejected"
    ).length;
  }, [rescheduleRequests]);

  const handleApproveReschedule = async (requestId) => {
    try {
      setSubmittingId(requestId);
      await approvePTRescheduleRequest(requestId, {});
      showToast("success", "Đã chấp nhận yêu cầu đổi lịch.");
      await loadRescheduleRequests({ force: true });
    } catch (e) {
      showToast(
        "error",
        e?.response?.data?.message || "Không chấp nhận được yêu cầu đổi lịch."
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const openRejectModal = (requestId) => {
    setRejectModal({
      open: true,
      requestId,
      note: "",
    });
  };

  const closeRejectModal = () => {
    if (submittingId) return;
    setRejectModal({
      open: false,
      requestId: null,
      note: "",
    });
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal.requestId) return;

    try {
      setSubmittingId(rejectModal.requestId);
      await rejectPTRescheduleRequest(rejectModal.requestId, {
        note: rejectModal.note?.trim() || "",
      });
      closeRejectModal();
      showToast("success", "Đã từ chối yêu cầu đổi lịch.");
      await loadRescheduleRequests({ force: true });
    } catch (e) {
      showToast(
        "error",
        e?.response?.data?.message || "Không từ chối được yêu cầu đổi lịch."
      );
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="ptrq-page">
      <div className="ptrq-hero">
        <div className="ptrq-hero__content">
          <div className="mh-kicker">Trainer dashboard</div>
          <h1 className="ptrq-title">Yêu cầu đổi lịch</h1>
          <p className="ptrq-subtitle">
            Theo dõi và xử lý các yêu cầu đổi lịch từ hội viên để lịch tập luôn
            đồng bộ, rõ ràng và không bị bỏ sót.
          </p>
        </div>

        <div className="ptrq-hero__badge">
          <div className="ptrq-hero__badgeValue">{pendingRescheduleCount}</div>
          <div className="ptrq-hero__badgeLabel">Đang chờ xử lý</div>
        </div>
      </div>

      <div className="ptrq-stats">
        <div className="ptrq-statCard">
          <div className="ptrq-statLabel">Tổng yêu cầu</div>
          <div className="ptrq-statValue">{rescheduleRequests.length}</div>
          <div className="ptrq-statMeta">Tất cả yêu cầu đổi lịch hiện có</div>
        </div>

        <div className="ptrq-statCard">
          <div className="ptrq-statLabel">Đang chờ</div>
          <div className="ptrq-statValue ptrq-statValue--pending">
            {pendingRescheduleCount}
          </div>
          <div className="ptrq-statMeta">Nên xử lý sớm để cập nhật lịch</div>
        </div>

        <div className="ptrq-statCard">
          <div className="ptrq-statLabel">Đã chấp nhận</div>
          <div className="ptrq-statValue ptrq-statValue--approved">
            {approvedCount}
          </div>
          <div className="ptrq-statMeta">Các yêu cầu đã được duyệt</div>
        </div>

        <div className="ptrq-statCard">
          <div className="ptrq-statLabel">Đã từ chối</div>
          <div className="ptrq-statValue ptrq-statValue--rejected">
            {rejectedCount}
          </div>
          <div className="ptrq-statMeta">Các yêu cầu không được chấp nhận</div>
        </div>
      </div>

      <section className="ptrq-section">
        <div className="ptrq-section__head">
          <div>
            <div className="mh-kicker">Reschedule requests</div>
            <h3>Danh sách yêu cầu</h3>
            <p>
              Kiểm tra lịch cũ, lịch đề xuất mới và lý do đổi lịch trước khi đưa
              ra quyết định.
            </p>
          </div>

          <div className="ptrq-chip">{pendingRescheduleCount} chờ xử lý</div>
        </div>

        <div className="ptrq-list">
          {loading ? (
            <div className="ptrq-empty">Đang tải dữ liệu...</div>
          ) : rescheduleRequests.length === 0 ? (
            <div className="ptrq-empty">
              Hiện chưa có yêu cầu đổi lịch nào.
            </div>
          ) : (
            rescheduleRequests.map((item) => {
              const booking = item?.Booking;
              const memberName =
                booking?.Member?.User?.username ||
                booking?.Member?.User?.email ||
                `Học viên #${booking?.memberId || item?.memberId}`;

              const status = String(item?.status || "").toLowerCase();
              const disabled = submittingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`ptrq-card ptrq-card--${status || "pending"}`}
                >
                  <div className="ptrq-card__main">
                    <div className="ptrq-card__top">
                      <div className="ptrq-member">
                        <div className="ptrq-member__avatar">
                          {String(memberName).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="ptrq-member__name">{memberName}</div>
                          <div className="ptrq-member__sub">
                            Yêu cầu #{item.id}
                          </div>
                        </div>
                      </div>

                      <span className={`ptrq-status ptrq-status--${status || "pending"}`}>
                        {getStatusLabel(status)}
                      </span>
                    </div>

                    <div className="ptrq-timeGrid">
                      <div className="ptrq-timeBox">
                        <div className="ptrq-timeBox__label">Lịch cũ</div>
                        <div className="ptrq-timeBox__value">
                          {booking?.bookingDate
                            ? formatDateVN(bookingToYMD(booking.bookingDate))
                            : "—"}
                        </div>
                        <div className="ptrq-timeBox__meta">
                          {formatTimeHHMM(item?.oldStartTime)} -{" "}
                          {formatTimeHHMM(item?.oldEndTime)}
                        </div>
                      </div>

                      <div className="ptrq-timeBox ptrq-timeBox--highlight">
                        <div className="ptrq-timeBox__label">Đề xuất mới</div>
                        <div className="ptrq-timeBox__value">
                          {formatDateVN(item?.requestedDate)}
                        </div>
                        <div className="ptrq-timeBox__meta">
                          {formatTimeHHMM(item?.requestedStartTime)} -{" "}
                          {formatTimeHHMM(item?.requestedEndTime)}
                        </div>
                      </div>
                    </div>

                    {item?.reason ? (
                      <div className="ptrq-note">
                        <span className="ptrq-note__label">Lý do</span>
                        <div className="ptrq-note__text">{item.reason}</div>
                      </div>
                    ) : null}

                    {status !== "pending" && item?.trainerResponseNote ? (
                      <div className="ptrq-note ptrq-note--response">
                        <span className="ptrq-note__label">Ghi chú phản hồi</span>
                        <div className="ptrq-note__text">
                          {item.trainerResponseNote}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {status === "pending" ? (
                    <div className="ptrq-card__actions">
                      <button
                        type="button"
                        className="ptrq-btn ptrq-btn--ghost"
                        onClick={() => openRejectModal(item.id)}
                        disabled={disabled}
                      >
                        {disabled ? "Đang xử lý..." : "Từ chối"}
                      </button>

                      <button
                        type="button"
                        className="ptrq-btn ptrq-btn--primary"
                        onClick={() => handleApproveReschedule(item.id)}
                        disabled={disabled}
                      >
                        {disabled ? "Đang xử lý..." : "Chấp nhận"}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      {toast.open ? (
        <div className={`ptrq-toast ${getToastTypeClass(toast.type)}`}>
          <div className="ptrq-toast__icon">
            {toast.type === "success" ? "✓" : toast.type === "error" ? "!" : "i"}
          </div>
          <div className="ptrq-toast__content">
            <div className="ptrq-toast__title">
              {toast.type === "success"
                ? "Thành công"
                : toast.type === "error"
                ? "Có lỗi xảy ra"
                : "Thông báo"}
            </div>
            <div className="ptrq-toast__message">{toast.message}</div>
          </div>
          <button
            type="button"
            className="ptrq-toast__close"
            onClick={() => setToast((prev) => ({ ...prev, open: false }))}
          >
            ×
          </button>
        </div>
      ) : null}

      {rejectModal.open ? (
        <div className="ptrq-modalOverlay" onClick={closeRejectModal}>
          <div
            className="ptrq-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ptrq-modal__header">
              <div>
                <h3>Từ chối yêu cầu đổi lịch</h3>
                <p>
                  Bạn có thể nhập lý do từ chối để hội viên hiểu rõ hơn.
                </p>
              </div>
              <button
                type="button"
                className="ptrq-modal__close"
                onClick={closeRejectModal}
                disabled={!!submittingId}
              >
                ×
              </button>
            </div>

            <div className="ptrq-modal__body">
              <label className="ptrq-field">
                <span className="ptrq-field__label">Ghi chú phản hồi</span>
                <textarea
                  className="ptrq-field__textarea"
                  rows={5}
                  placeholder="Ví dụ: Khung giờ này tôi đã có lịch khác, vui lòng chọn thời gian khác phù hợp hơn."
                  value={rejectModal.note}
                  onChange={(e) =>
                    setRejectModal((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  disabled={!!submittingId}
                />
              </label>
            </div>

            <div className="ptrq-modal__actions">
              <button
                type="button"
                className="ptrq-btn ptrq-btn--ghost"
                onClick={closeRejectModal}
                disabled={!!submittingId}
              >
                Hủy
              </button>
              <button
                type="button"
                className="ptrq-btn ptrq-btn--danger"
                onClick={handleRejectSubmit}
                disabled={!!submittingId}
              >
                {submittingId ? "Đang xử lý..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}