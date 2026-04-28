import axios from "../setup/axios";

/**
 * Admin Core Service (Module 2-6)
 * Chỉ dùng các endpoint đã có trong: /api/admin/inventory/...
 */

const ADMIN_CORE_TIMEOUT_MS = 30000;

export const admGetMaintenances = (params) =>
  axios.get("/api/admin/inventory/maintenances", { params, timeout: ADMIN_CORE_TIMEOUT_MS });

export const admGetMaintenanceDetail = (id) =>
  axios.get(`/api/admin/inventory/maintenances/${id}`, { timeout: ADMIN_CORE_TIMEOUT_MS });

export const admApproveMaintenance = (id, body) =>
  // ✅ quan trọng: PATCH + body gửi thẳng (scheduledDate, estimatedCost, notes)
  axios.patch(`/api/admin/inventory/maintenances/${id}/approve`, body, { timeout: ADMIN_CORE_TIMEOUT_MS });

export const admRejectMaintenance = (id, body) =>
  axios.patch(`/api/admin/inventory/maintenances/${id}/reject`, body, { timeout: ADMIN_CORE_TIMEOUT_MS });

export const admAssignMaintenance = (id, body) =>
  axios.patch(`/api/admin/inventory/maintenances/${id}/assign`, body);

export const admStartMaintenance = (id) =>
  axios.patch(`/api/admin/inventory/maintenances/${id}/start`, undefined, { timeout: ADMIN_CORE_TIMEOUT_MS });

export const admCompleteMaintenance = (id, body) =>
  axios.patch(`/api/admin/inventory/maintenances/${id}/complete`, body, { timeout: ADMIN_CORE_TIMEOUT_MS });

// ✅ NEW: dropdown technicians
export const admGetTechnicians = () =>
  axios.get("/api/admin/inventory/technicians", { timeout: ADMIN_CORE_TIMEOUT_MS });

// ✅ NEW: dropdown gyms (filter by gymId)
export const admGetGyms = (params) =>
  axios.get("/api/admin/inventory/gyms", { params, timeout: ADMIN_CORE_TIMEOUT_MS });

/* ================= MODULE 3: FRANCHISE ================= */
export const admGetFranchiseRequests = (params) =>
  axios.get("/api/admin/inventory/franchise-requests", { params });

export const admGetFranchiseRequestDetail = (id) =>
  axios.get(`/api/admin/inventory/franchise-requests/${id}`);

export const admApproveFranchiseRequest = (id) =>
  axios.patch(`/api/admin/inventory/franchise-requests/${id}/approve`);

export const admRejectFranchiseRequest = (id, body) =>
  axios.patch(`/api/admin/inventory/franchise-requests/${id}/reject`, body);

/* ================= DASHBOARD ================= */
export const admGetDashboardOverview = (params) =>
  axios.get("/api/admin/inventory/dashboard/overview", { params });
