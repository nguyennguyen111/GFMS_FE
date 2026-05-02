/**
 * Khớp `listMineForTrainer` (notification.service): lịch/buổi, đổi lịch, mượn PT, đánh giá, rút tiền, mua gói (không PayOS).
 * Không gồm chat — tin nhắn xử lý riêng.
 */
export function isTrainerRelevantNotification(n) {
  if (!n) return false;
  const t = String(n.notificationType || "");
  const title = String(n.title || "");
  if (
    ["booking_update", "booking", "booking_reschedule", "trainer_share", "review", "withdrawal", "request_update"].includes(
      t,
    )
  )
    return true;
  if (t === "package_purchase") return !title.includes("PayOS");
  return false;
}
