/**
 * Maps backend notificationType → admin SPA path (+ query for workflow tabs).
 * relatedId is appended as highlight= for list/detail focus.
 */

export const ADMIN_NOTIFICATION_TYPES = {
  admin_franchise_request_submitted: "admin_franchise_request_submitted",
  admin_procurement_pr_submitted: "admin_procurement_pr_submitted",
  admin_procurement_quotation_needs_quote: "admin_procurement_quotation_needs_quote",
  admin_procurement_po_awaits_final_payment: "admin_procurement_po_awaits_final_payment",
  admin_maintenance_request_submitted: "admin_maintenance_request_submitted",
  admin_maintenance_cancelled_by_owner: "admin_maintenance_cancelled_by_owner",
};

export function resolveAdminNotificationHref(item) {
  if (!item) return "/admin/dashboard";
  const type = String(item.notificationType || item.type || "");
  const id = item.relatedId != null ? Number(item.relatedId) : NaN;
  const q = Number.isFinite(id) && id > 0 ? `?highlight=${id}` : "";

  switch (type) {
    case ADMIN_NOTIFICATION_TYPES.admin_franchise_request_submitted:
      return `/admin/franchises${q}`;
    case ADMIN_NOTIFICATION_TYPES.admin_procurement_pr_submitted:
      return `/admin/purchase-workflow?tab=purchaseRequests&highlight=${id}`;
    case ADMIN_NOTIFICATION_TYPES.admin_procurement_quotation_needs_quote:
      return `/admin/purchase-workflow?tab=quotations&highlight=${id}`;
    case ADMIN_NOTIFICATION_TYPES.admin_procurement_po_awaits_final_payment:
      return `/admin/purchase-workflow?tab=payments&highlight=${id}`;
    case ADMIN_NOTIFICATION_TYPES.admin_maintenance_request_submitted:
    case ADMIN_NOTIFICATION_TYPES.admin_maintenance_cancelled_by_owner:
      return `/admin/maintenance${q}`;
    default:
      if (item.relatedType === "franchise_request" && Number.isFinite(id)) return `/admin/franchises${q}`;
      if (["purchase_request", "purchaserequest"].includes(String(item.relatedType || "")) && Number.isFinite(id)) {
        return `/admin/purchase-workflow?tab=purchaseRequests&highlight=${id}`;
      }
      if (type === "purchase_request" && Number.isFinite(id)) {
        return `/admin/purchase-workflow?tab=purchaseRequests&highlight=${id}`;
      }
      if (item.relatedType === "quotation" && Number.isFinite(id)) {
        return `/admin/purchase-workflow?tab=quotations&highlight=${id}`;
      }
      if (item.relatedType === "purchase_order" && Number.isFinite(id)) {
        return `/admin/purchase-workflow?tab=payments&highlight=${id}`;
      }
      if (item.relatedType === "maintenance" && Number.isFinite(id)) return `/admin/maintenance${q}`;
      return "/admin/dashboard";
  }
}

export function adminNotificationCategoryLabel(type) {
  const t = String(type || "");
  if (t.includes("franchise")) return "Nhượng quyền";
  if (t.includes("procurement") || t.includes("purchase") || t.includes("quotation") || t.includes("combo")) return "Mua sắm";
  if (t.includes("maintenance")) return "Bảo trì";
  return "Hệ thống";
}
