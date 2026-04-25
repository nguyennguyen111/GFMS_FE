import React, { useState, useEffect } from "react";
import { normalizeSingleImageSrc } from "../../utils/image";
import "./PTAttendanceModal.css";

const emptyPay = { bankName: "", bankAccountNumber: "", accountHolderName: "" };

const PT_SHARE_PAY_STATUS_LABEL = {
  none: "Chưa gửi thông tin nhận tiền",
  awaiting_transfer: "Đang chờ phòng mượn chuyển khoản",
  disputed: "Đã gửi khiếu nại — chờ xử lý",
  paid: "Phòng mượn đã xác nhận đã chuyển khoản",
};

const fmtShareVnd = (n) => {
  if (n === undefined || n === null || n === "") return "—";
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `${x.toLocaleString("vi-VN")} đ`;
};

export const PT_ATTENDANCE_LOCK_MSG =
  "Buổi tập này đã được chốt kỳ lương hoặc chủ gym đã chi trả hoa hồng. Không thể điểm danh hay chỉnh sửa trạng thái có mặt / vắng mặt.";

const fmtDT = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const pickMemberLabel = (booking) => {
  const memberName = booking?.Member?.User?.username || booking?.Member?.fullName || booking?.Member?.name;
  return memberName || (booking?.memberId ? `Học viên #${booking.memberId}` : "—");
};

const pickGymLabel = (booking) => {
  const g = booking?.Gym;
  return g?.gymName || g?.name || (booking?.gymId ? `Cơ sở #${booking.gymId}` : "—");
};

export default function PTAttendanceModal({
  open,
  booking,
  loading,
  actionPending = false,
  error,
  onClose,
  onCheckIn,
  onCheckOut,
  onComplete,
  onReset,
  onRequestBusySlot,
  refresh,
  onSendSharePayment,
  onSubmitShareDispute,
  onAckSharePayment,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [sharePay, setSharePay] = useState(emptyPay);
  const [disputeNote, setDisputeNote] = useState("");
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  useEffect(() => {
    setIsEditing(false);
    setSharePay(emptyPay);
    setDisputeNote(String(booking?.sharePayment?.sharePaymentDisputeNote || ""));
    setShowDisputeModal(false);
  }, [open, booking?.id, booking?.sharePayment?.sharePaymentDisputeNote]);

  if (!open) return null;

  const ta = booking?.trainerAttendance || null;
  const currentStatus = (ta?.status || booking?.status || "").toLowerCase();
  const bookingStatus = String(booking?.status || "").toLowerCase();
  const isCompleted = bookingStatus === "completed";
  const comm = String(booking?.commissionStatus || "").toLowerCase();
  const commissionLocked = comm === "calculated" || comm === "paid";
  const isSharedSession = String(booking?.sessionType || booking?.type || "").toLowerCase() === "trainer_share";
  const ptAckAt = booking?.sharePayment?.sharePaymentPtAcknowledgedAt;
  const interactionDisabled = loading || actionPending;

  const handleAction = async (type) => {
    if (interactionDisabled) return;
    try {
      if (type === "present") {
        await onCheckIn({ status: "present" });
      } else {
        await onCheckOut({ status: "absent" });
      }
      setIsEditing(false);
      if (refresh) await refresh();
    } catch (e) {
      console.error("Lỗi:", e);
    }
  };

  return (
    <div className="ptAttModal__backdrop" onMouseDown={onClose}>
      <div className="ptAttModal__card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ptAttModal__head">
          <div>
            <div className="ptAttModal__title">ĐIỂM DANH BUỔI TẬP</div>
            <div className="ptAttModal__sub">
              {booking ? `${String(booking?.startTime || "").slice(0, 5)} - ${String(booking?.endTime || "").slice(0, 5)}` : ""}
            </div>
          </div>
          <button className="ptAttModal__x" onClick={onClose}>✕</button>
        </div>

        {error ? <div className="ptAttModal__err">{error}</div> : null}

        {loading && !booking ? (
          <div className="ptAttModal__empty ptAttModal__empty--loading">Đang tải thông tin buổi tập…</div>
        ) : !booking ? (
          <div className="ptAttModal__empty">Slot này chưa có học viên.</div>
        ) : (
          <>
            <div className="ptAttModal__grid">
              <div className="ptAttModal__row">
                <span className="k">Học viên</span>
                <span className="v" style={{fontWeight: 'bold'}}>{pickMemberLabel(booking)}</span>
              </div>
              <div className="ptAttModal__row">
                <span className="k">Cơ sở</span>
                <span className="v" style={{fontWeight: 'bold'}}>{pickGymLabel(booking)}</span>
              </div>
              <div className="ptAttModal__row">
                <span className="k">Trạng thái</span>
                <span className={`v status-tag ${currentStatus}`}>
                  {isCompleted && currentStatus === "present" ? (
                    <span className="ptAttModal__status-text--present">✅ Hoàn thành</span>
                  ) : currentStatus === "present" ? (
                    <span className="ptAttModal__status-text--present">✅ Đã có mặt</span>
                  ) : currentStatus === "absent" ? (
                    <span className="ptAttModal__status-text--absent">❌ Đã vắng mặt</span>
                  ) : (
                    <span className="ptAttModal__status-text--pending">Chưa điểm danh</span>
                  )}
                </span>
              </div>
              {ta?.checkInTime && (
                <div className="ptAttModal__row">
                  <span className="k">Thời điểm check-in</span>
                  <span className="v" style={{fontWeight: 'bold'}}>{fmtDT(ta?.checkInTime)}</span>
                </div>
              )}
            </div>

            {isSharedSession &&
            isCompleted &&
            onSendSharePayment &&
            !commissionLocked && (
              <div className="ptAttModal__sharePay">
                <div className="ptAttModal__sharePayCard">
                  <div className="ptAttModal__sharePayCardHead">
                    <span className="ptAttModal__sharePayCardIcon" aria-hidden>
                      💳
                    </span>
                    <div>
                      <div className="ptAttModal__sharePayTitle">Thanh toán buổi mượn PT</div>
                      <p className="ptAttModal__sharePayLead">
                        Gửi STK cho chủ phòng <strong>mượn</strong> — nhận tiền theo giá trên phiếu.
                      </p>
                    </div>
                  </div>

                  <details className="ptAttModal__sharePayDetails">
                    <summary>Hướng dẫn thêm</summary>
                    <p>
                      Trạng thái cập nhật khi chủ phòng xác nhận đã chuyển khoản. Ô phản ánh phía dưới
                      dùng khi chưa nhận tiền (chờ CK) hoặc khi đã hiện xác nhận nhưng thực tế chưa có
                      tiền.
                    </p>
                  </details>

                  {(() => {
                    const sp = booking?.sharePayment;
                    const st = sp?.sharePaymentStatus || "none";
                    const ptAckAt = sp?.sharePaymentPtAcknowledgedAt;
                    const proofs = Array.isArray(sp?.paymentProofImageUrls)
                      ? sp.paymentProofImageUrls.filter(Boolean)
                      : [];
                    const disputeNoteTrim = String(sp?.sharePaymentDisputeNote || "").trim();
                    const hasComplained = disputeNoteTrim.length > 0;
                    const ownerResponded = !!sp?.borrowerDisputeResponseAt || proofs.length > 0;
                    const canAcknowledge =
                      st === "paid" && !ptAckAt && !hasComplained;
                    const canAckAfterComplaint =
                      st === "paid" && !ptAckAt && hasComplained && ownerResponded;
                    const showDisputeForm =
                      onSubmitShareDispute &&
                      !ptAckAt &&
                      showDisputeModal &&
                      (st === "awaiting_transfer" ||
                        st === "disputed" ||
                        st === "paid");
                    return (
                      <>
                        <dl className="ptAttModal__sharePayDl">
                          {sp?.borrowerGymName ? (
                            <>
                              <dt>Chi nhánh mượn</dt>
                              <dd>{sp.borrowerGymName}</dd>
                            </>
                          ) : null}
                          <dt>Trạng thái TT</dt>
                          <dd>
                            <span className="ptAttModal__sharePayPill">{PT_SHARE_PAY_STATUS_LABEL[st] || st}</span>
                          </dd>
                          {sp?.sessionPrice != null && sp.sessionPrice !== "" ? (
                            <>
                              <dt>Giá buổi</dt>
                              <dd className="ptAttModal__sharePayPrice">{fmtShareVnd(sp.sessionPrice)}</dd>
                            </>
                          ) : null}
                        </dl>

                        {ptAckAt ? (
                          <div className="ptAttModal__sharePayPtAckOk">
                            <span className="ptAttModal__sharePayOkIcon" aria-hidden>
                              ✓
                            </span>
                            <span>
                              Bạn đã xác nhận đã nhận tiền / đồng ý phản hồi chủ phòng{" "}
                              <time dateTime={ptAckAt}>
                                {new Date(ptAckAt).toLocaleString("vi-VN")}
                              </time>
                            </span>
                          </div>
                        ) : null}

                        {st === "paid" && sp?.paymentMarkedPaidAt ? (
                          <div className="ptAttModal__sharePayOk">
                            <span className="ptAttModal__sharePayOkIcon" aria-hidden>
                              ✓
                            </span>
                            <span>
                              Đã xác nhận CK{" "}
                              <time dateTime={sp.paymentMarkedPaidAt}>
                                {new Date(sp.paymentMarkedPaidAt).toLocaleString("vi-VN")}
                              </time>
                            </span>
                          </div>
                        ) : null}

                        {st === "paid" && sp?.paymentNote ? (
                          <div className="ptAttModal__sharePayPostPaid">
                            <span className="ptAttModal__sharePayPostPaidLabel">Ghi chú từ phòng mượn</span>
                            <p>{sp.paymentNote}</p>
                          </div>
                        ) : null}

                        {st === "paid" && sp?.sharePaymentDisputeNote ? (
                          <div className="ptAttModal__sharePayPostPaid">
                            <span className="ptAttModal__sharePayPostPaidLabel">Phản ánh đã gửi</span>
                            <p>{sp.sharePaymentDisputeNote}</p>
                            {sp.sharePaymentDisputedAt ? (
                              <span className="ptAttModal__sharePayPostPaidTime">
                                {new Date(sp.sharePaymentDisputedAt).toLocaleString("vi-VN")}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        {(sp?.borrowerDisputeResponseNote ||
                          (Array.isArray(sp?.paymentProofImageUrls) &&
                            sp.paymentProofImageUrls.length > 0)) && (
                          <div className="ptAttModal__sharePayBorrowerReply">
                            <span className="ptAttModal__sharePayBorrowerReplyLabel">
                              {sp?.borrowerDisputeResponseNote || sp?.borrowerDisputeResponseAt
                                ? "Phản hồi từ chủ phòng mượn"
                                : "Ảnh chứng từ chuyển khoản"}
                            </span>
                            {sp.borrowerDisputeResponseNote ? (
                              <p className="ptAttModal__sharePayBorrowerReplyText">
                                {sp.borrowerDisputeResponseNote}
                              </p>
                            ) : null}
                            {sp.borrowerDisputeResponseAt ? (
                              <span className="ptAttModal__sharePayBorrowerReplyTime">
                                {new Date(sp.borrowerDisputeResponseAt).toLocaleString("vi-VN")}
                              </span>
                            ) : sp?.paymentMarkedPaidAt &&
                              Array.isArray(sp?.paymentProofImageUrls) &&
                              sp.paymentProofImageUrls.length > 0 &&
                              !sp?.borrowerDisputeResponseNote ? (
                              <span className="ptAttModal__sharePayBorrowerReplyTime">
                                Theo xác nhận CK:{" "}
                                {new Date(sp.paymentMarkedPaidAt).toLocaleString("vi-VN")}
                              </span>
                            ) : null}
                            {Array.isArray(sp?.paymentProofImageUrls) &&
                            sp.paymentProofImageUrls.length > 0 ? (
                              <div className="ptAttModal__sharePayProofGrid">
                                {sp.paymentProofImageUrls.map((url, idx) => (
                                  <a
                                    key={`${url}-${idx}`}
                                    className="ptAttModal__sharePayProofLink"
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <img
                                      src={normalizeSingleImageSrc(url)}
                                      alt={`Chứng từ ${idx + 1}`}
                                    />
                                  </a>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        )}

                        {st === "none" ? (
                          <div className="ptAttModal__sharePayForm">
                            <label className="ptAttModal__payLabel">Ngân hàng</label>
                            <input
                              className="ptAttModal__payInput"
                              value={sharePay.bankName}
                              onChange={(e) => setSharePay((p) => ({ ...p, bankName: e.target.value }))}
                              placeholder="Ví dụ: Vietcombank"
                            />
                            <label className="ptAttModal__payLabel">Số tài khoản</label>
                            <input
                              className="ptAttModal__payInput"
                              value={sharePay.bankAccountNumber}
                              onChange={(e) =>
                                setSharePay((p) => ({ ...p, bankAccountNumber: e.target.value }))
                              }
                              placeholder="Số TK"
                            />
                            <label className="ptAttModal__payLabel">Chủ TK (tuỳ chọn)</label>
                            <input
                              className="ptAttModal__payInput"
                              value={sharePay.accountHolderName}
                              onChange={(e) =>
                                setSharePay((p) => ({ ...p, accountHolderName: e.target.value }))
                              }
                            />
                            <button
                              type="button"
                              className="ptAttModal__btn ptAttModal__btn--paySend"
                              disabled={loading}
                              onClick={async () => {
                                const ok = await onSendSharePayment({
                                  bankName: String(sharePay.bankName || "").trim(),
                                  bankAccountNumber: String(sharePay.bankAccountNumber || "").trim(),
                                  accountHolderName: String(sharePay.accountHolderName || "").trim(),
                                });
                                if (ok && refresh) await refresh();
                              }}
                            >
                              {loading ? "Đang gửi…" : "Gửi thông tin nhận tiền"}
                            </button>
                          </div>
                        ) : null}

                        {canAcknowledge && onAckSharePayment ? (
                          <div className="ptAttModal__sharePayAck">
                            <p className="ptAttModal__sharePayAckLead">
                              Chủ phòng đã xác nhận thanh toán. Nếu bạn đã nhận đủ tiền, hãy xác nhận để đóng vụ thanh toán buổi này.
                            </p>
                            <button
                              type="button"
                              className="ptAttModal__btn ptAttModal__btn--present"
                              disabled={loading}
                              onClick={async () => {
                                const ok = await onAckSharePayment();
                                if (ok && refresh) await refresh();
                              }}
                            >
                              {loading ? "Đang xác nhận…" : "✓ Xác nhận đã nhận tiền"}
                            </button>
                            <button
                              type="button"
                              className="ptAttModal__btn ptAttModal__btn--disputeSend"
                              style={{ marginTop: "8px" }}
                              disabled={loading}
                              onClick={() => {
                                setShowDisputeModal(true);
                              }}
                            >
                              Chưa nhận được tiền — Phản ánh
                            </button>
                          </div>
                        ) : null}

                        {canAckAfterComplaint && onAckSharePayment ? (
                          <div className="ptAttModal__sharePayAck">
                            <p className="ptAttModal__sharePayAckLead">
                              Chủ phòng đã gửi phản hồi. Bạn đã nhận được tiền chưa?
                            </p>
                            <button
                              type="button"
                              className="ptAttModal__btn ptAttModal__btn--present"
                              disabled={loading}
                              onClick={async () => {
                                const ok = await onAckSharePayment();
                                if (ok && refresh) await refresh();
                              }}
                            >
                              {loading ? "Đang xác nhận…" : "✓ Đã nhận đủ tiền — Đồng ý"}
                            </button>
                            <button
                              type="button"
                              className="ptAttModal__btn ptAttModal__btn--disputeSend"
                              style={{ marginTop: "8px" }}
                              disabled={loading}
                              onClick={() => {
                                setShowDisputeModal(true);
                              }}
                            >
                              Vẫn chưa nhận được — Khiếu nại tiếp
                            </button>
                          </div>
                        ) : null}

                        {showDisputeForm ? (
                          <div className="ptAttModal__disputeCard">
                            <div className="ptAttModal__disputeCardHead">
                              <h4 className="ptAttModal__disputeCardTitle">Phản ánh / khiếu nại</h4>
                              <p className="ptAttModal__disputeCardSub">
                                {st === "awaiting_transfer"
                                  ? "Chưa thấy tiền sau khi đã gửi STK — chủ phòng mượn nhận thông báo."
                                  : st === "disputed"
                                    ? "Có thể cập nhật nội dung (ghi đè bản trước)."
                                    : "Đã hiện xác nhận CK nhưng thực tế chưa có tiền — đối chiếu với chủ phòng."}
                              </p>
                            </div>
                            <label className="ptAttModal__payLabel">
                              {st === "paid" ? "Nội dung phản ánh" : "Nội dung khiếu nại"}
                            </label>
                            <textarea
                              className="ptAttModal__payTextarea"
                              rows={3}
                              value={disputeNote}
                              onChange={(e) => setDisputeNote(e.target.value)}
                              placeholder={
                                st === "paid"
                                  ? "Mô tả ngắn: chưa thấy tiền vào STK, thời điểm kiểm tra…"
                                  : "Mô tả ngắn: đã chờ bao lâu, chưa nhận được CK…"
                              }
                            />
                            <button
                              type="button"
                              className="ptAttModal__btn ptAttModal__btn--disputeSend"
                              disabled={loading}
                              onClick={async () => {
                                const ok = await onSubmitShareDispute({
                                  note: String(disputeNote || "").trim(),
                                });
                                if (ok && refresh) await refresh();
                              }}
                            >
                              {loading
                                ? "Đang gửi…"
                                : st === "disputed"
                                  ? "Cập nhật khiếu nại"
                                  : st === "paid"
                                    ? "Gửi phản ánh"
                                    : "Gửi khiếu nại"}
                            </button>
                            <button
                              type="button"
                              className="ptAttModal__btn"
                              style={{ marginTop: "8px", background: "#6c757d" }}
                              onClick={() => {
                                setShowDisputeModal(false);
                                setDisputeNote("");
                              }}
                            >
                              Hủy
                            </button>
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {commissionLocked && (
              <div className="ptAttModal__lockPanel">
                <div className="ptAttModal__lockTitle">Đã chi trả / đã chốt kỳ</div>
                <p className="ptAttModal__lockText">{PT_ATTENDANCE_LOCK_MSG}</p>
              </div>
            )}

            {(commissionLocked || (isSharedSession && (ptAckAt || booking?.sharePayment?.sharePaymentStatus === "paid"))) ? (
              <div className="ptAttModal__actions">
                <span style={{ color: "#16a34a", fontWeight: 600, fontSize: "0.95rem" }}>
                  ✓ Đã thanh toán và hoàn thành buổi học
                </span>
              </div>
            ) : (
              <div
                className={
                  ta && !isEditing
                    ? "ptAttModal__actions ptAttModal__actions--single"
                    : "ptAttModal__actions"
                }
              >
                {ta && !isEditing ? (
                  <>
                    {!isCompleted && currentStatus === "present" && onComplete ? (
                      <button
                        type="button"
                        className="ptAttModal__btn ptAttModal__btn--present"
                        disabled={interactionDisabled}
                        onClick={async () => {
                          await onComplete({ status: "present" });
                          setIsEditing(false);
                          if (refresh) await refresh();
                        }}
                      >
                        ✓ Hoàn thành buổi tập
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="ptAttModal__btn ptAttModal__btn--edit"
                      disabled={interactionDisabled}
                      onClick={() => setIsEditing(true)}
                    >
                      ✎ Chỉnh sửa điểm danh
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="ptAttModal__btn ptAttModal__btn--present"
                      disabled={interactionDisabled}
                      onClick={() => handleAction("present")}
                    >
                      ✓ Có mặt
                    </button>
                    <button
                      type="button"
                      className="ptAttModal__btn ptAttModal__btn--absent"
                      disabled={interactionDisabled}
                      onClick={() => handleAction("absent")}
                    >
                      ✗ Vắng mặt
                    </button>
                    {ta && (
                      <button
                        type="button"
                        className="ptAttModal__btn ptAttModal__btn--reset"
                        disabled={interactionDisabled}
                        onClick={async () => {
                          if (!onReset) return;
                          await onReset();
                          setIsEditing(false);
                          if (refresh) await refresh();
                        }}
                      >
                        ↺ Chưa điểm danh
                      </button>
                    )}
                    {booking && onRequestBusySlot && !isSharedSession ? (
                      <button
                        type="button"
                        className="ptAttModal__btn ptAttModal__btn--edit ptAttModal__btn--busy"
                        disabled={interactionDisabled}
                        onClick={onRequestBusySlot}
                      >
                        📨 Báo bận khung giờ này
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
