const normalize = (value) => String(value || "").trim().toLowerCase();

const withQuery = (path, key, value) => {
  if (value === undefined || value === null || value === "") return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
};

export function resolveMemberNotificationPath(item) {
  const notificationType = normalize(item?.notificationType || item?.type);
  const relatedType = normalize(item?.relatedType || item?.related_type);
  const relatedId = item?.relatedId ?? item?.related_id ?? null;

  if (notificationType === "chat" || relatedType === "message") {
    return "/member/messages";
  }

  if (notificationType === "session_feedback") {
    return withQuery("/member/bookings", "sessionFeedback", relatedId);
  }

  if (
    relatedType === "booking" ||
    relatedType === "booking_reschedule_request" ||
    ["booking_update", "booking", "booking_reschedule"].includes(notificationType)
  ) {
    return withQuery("/member/bookings", "bookingId", relatedId);
  }

  if (relatedType === "packageactivation" || relatedType === "package_activation") {
    return relatedId ? `/member/my-packages/${relatedId}` : "/member/my-packages";
  }

  if (
    ["package_purchase", "transaction", "payment"].includes(notificationType) ||
    relatedType === "transaction"
  ) {
    return withQuery("/member/my-packages", "transactionId", relatedId);
  }

  if (notificationType === "membership_card" || relatedType === "membershipcard") {
    return "/member/membership-cards";
  }

  if (notificationType === "review" || relatedType === "review") {
    return withQuery("/member/reviews", "reviewId", relatedId);
  }

  if (notificationType === "trainer_request" || relatedType === "request") {
    return "/member/profile";
  }

  if (["progress", "workout_progress"].includes(notificationType)) {
    return "/member/progress";
  }

  if (["metric", "bmi", "profile", "security"].includes(notificationType)) {
    return "/member/profile";
  }

  if (notificationType === "promo") {
    return "/member/my-packages";
  }

  return "/member/notifications";
}
