import { getTrainerId } from "../components/pt-portal/ptStorage";

const schedulePath = () => {
  const tid = Number(getTrainerId?.() || 0);
  return tid > 0 ? `/pt/${tid}/schedule` : "/pt/dashboard";
};

const hasText = (value, needle) =>
  String(value || "")
    .toLowerCase()
    .includes(String(needle || "").toLowerCase());

export function resolveTrainerNotificationPath(item) {
  const type = String(item?.notificationType || "").toLowerCase();
  const title = String(item?.title || "");
  const message = String(item?.message || "");

  if (type === "withdrawal" || type === "payment" || type === "commission") return "/pt/finance";
  if (type === "review" || type === "feedback") return "/pt/feedback";
  if (type === "chat") return "/pt/messages";

  if (type === "request_update") {
    // Tách riêng BUSY_SLOT: "báo bận" đã duyệt/ từ chối → Lịch làm việc
    if (hasText(title, "báo bận") || hasText(message, "báo bận")) return schedulePath();
    // Các request khác (tăng ca / nghỉ phép / đổi ca / ...) → trang gửi yêu cầu
    return "/pt/requests";
  }

  if (type === "booking_reschedule") return "/pt/reschedule-requests";

  if (type === "booking_update" || type === "booking") return schedulePath();

  if (type === "trainer_share") return "/pt/requests";

  return "/pt/notifications";
}

