const normalize = (value) => String(value || "").trim().toLowerCase();

const withQuery = (path, key, value) => {
  if (value === undefined || value === null || value === "") return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
};

export function resolveOwnerNotificationPath(item) {
  const notificationType = normalize(item?.notificationType || item?.type);
  const relatedType = normalize(item?.relatedType);
  const relatedId = item?.relatedId ?? null;

  if (["request"].includes(relatedType) || notificationType === "trainer_request") {
    return withQuery("/owner/bookings?tab=approval", "requestId", relatedId);
  }

  if (relatedType === "booking" || ["booking_update", "booking"].includes(notificationType)) {
    return withQuery("/owner/trainer-bookings", "bookingId", relatedId);
  }

  if (relatedType === "review" || notificationType === "review") {
    return withQuery("/owner/reviews", "reviewId", relatedId);
  }

  if (relatedType === "maintenance" || notificationType === "maintenance") {
    return withQuery("/owner/maintenance", "maintenanceId", relatedId);
  }

  if (["trainershare", "trainer_share"].includes(relatedType) || notificationType === "trainer_share") {
    return withQuery("/owner/trainers", "shareId", relatedId);
  }

  if (["purchaserequest", "purchase_request"].includes(relatedType) || notificationType === "purchase_request") {
    return withQuery("/owner/purchase-requests/history", "purchaseRequestId", relatedId);
  }

  if (relatedType === "quotation" || notificationType === "quotation") {
    return withQuery("/owner/purchase-requests/history", "purchaseRequestId", relatedId);
  }

  if (relatedType === "purchaseorder" || notificationType === "purchaseorder") {
    return withQuery("/owner/purchase-requests/history", "purchaseRequestId", relatedId);
  }

  if (relatedType === "receipt" || notificationType === "receipt") {
    return withQuery("/owner/receipts", "purchaseRequestId", relatedId);
  }

  if (relatedType === "transfer" || notificationType === "transfer") {
    return withQuery("/owner/equipment", "transferId", relatedId);
  }

  if (notificationType === "payment") {
    if (["purchaserequest", "purchase_request"].includes(relatedType)) {
      return withQuery("/owner/purchase-requests/history", "purchaseRequestId", relatedId);
    }
    return withQuery("/owner/procurement-payments", "transactionId", relatedId);
  }

  if (relatedType === "transaction" && notificationType === "package_purchase") {
    return withQuery("/owner/transactions", "transactionId", relatedId);
  }

  if (relatedType === "transaction" && notificationType === "membership_card_purchase") {
    return withQuery("/owner/transactions", "transactionId", relatedId);
  }

  if (relatedType === "withdrawal" || ["withdrawal", "commission"].includes(notificationType)) {
    return withQuery("/owner/withdrawals", "withdrawalId", relatedId);
  }

  if (relatedType === "franchiserequest" || notificationType === "franchise") {
    return withQuery("/owner/franchise-requests", "requestId", relatedId);
  }

  if (notificationType === "package_purchase") {
    return "/owner/transactions";
  }

  if (notificationType === "membership_card_purchase") {
    return "/owner/transactions";
  }

  return "/owner/notifications";
}