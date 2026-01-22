import axios from "../setup/axios";

/**
 * Admin Core Service (Module 2-6)
 * Chỉ dùng các endpoint đã có trong: /api/admin/inventory/...
 */

export const admGetMaintenances = (params) =>
  axios.get("/api/admin/inventory/maintenances", { params });

export const admGetMaintenanceDetail = (id) =>
  axios.get(`/api/admin/inventory/maintenances/${id}`);

export const admApproveMaintenance = (id, body) =>
  // ✅ quan trọng: PATCH + body gửi thẳng (scheduledDate, estimatedCost, notes)
  axios.patch(`/api/admin/inventory/maintenances/${id}/approve`, body);

export const admRejectMaintenance = (id, body) =>
  axios.patch(`/api/admin/inventory/maintenances/${id}/reject`, body);

export const admAssignMaintenance = (id, body) =>
  axios.patch(`/api/admin/inventory/maintenances/${id}/assign`, body);

export const admStartMaintenance = (id) =>
  axios.patch(`/api/admin/inventory/maintenances/${id}/start`);

export const admCompleteMaintenance = (id, body) =>
  axios.patch(`/api/admin/inventory/maintenances/${id}/complete`, body);

// ✅ NEW: dropdown technicians
export const admGetTechnicians = () =>
  axios.get("/api/admin/inventory/technicians");

// ✅ NEW: dropdown gyms (filter by gymId)
export const admGetGyms = (params) =>
  axios.get("/api/admin/inventory/gyms", { params });

/* ================= MODULE 3: FRANCHISE ================= */
export const admGetFranchiseRequests = (params) =>
  axios.get("/api/admin/inventory/franchise-requests", { params });

export const admGetFranchiseRequestDetail = (id) =>
  axios.get(`/api/admin/inventory/franchise-requests/${id}`);

export const admApproveFranchiseRequest = (id) =>
  axios.patch(`/api/admin/inventory/franchise-requests/${id}/approve`);

export const admRejectFranchiseRequest = (id, body) =>
  axios.patch(`/api/admin/inventory/franchise-requests/${id}/reject`, body);

/* ================= MODULE 4: POLICIES ================= */
export const admGetPolicies = (params) =>
  axios.get("/api/admin/inventory/policies", { params });

export const admCreatePolicy = (body) =>
  axios.post("/api/admin/inventory/policies", body);

export const admUpdatePolicy = (id, body) =>
  axios.put(`/api/admin/inventory/policies/${id}`, body);

export const admTogglePolicy = (id) =>
  axios.patch(`/api/admin/inventory/policies/${id}/toggle`);

/* ================= MODULE 5: TRAINER SHARE ================= */
export const admGetTrainerShares = (params) =>
  axios.get("/api/admin/inventory/trainer-shares", { params });

export const admGetTrainerShareDetail = (id) =>
  axios.get(`/api/admin/inventory/trainer-shares/${id}`);

/**
 * ✅ FIX BUG: approve phải gửi body (policyId, commissionSplit, notes...)
 * Nếu không gửi body -> BE sẽ báo "policyId is required"
 */
export const admApproveTrainerShare = (id, body) =>
  axios.patch(`/api/admin/inventory/trainer-shares/${id}/approve`, body);

export const admRejectTrainerShare = (id, body) =>
  axios.patch(`/api/admin/inventory/trainer-shares/${id}/reject`, body);

export const admOverrideTrainerShare = (id, body) =>
  axios.patch(`/api/admin/inventory/trainer-shares/${id}/override`, body);

/* ================= MODULE 6.1: AUDIT LOGS ================= */
export const admGetAuditLogs = (params) =>
  axios.get("/api/admin/inventory/audit-logs", { params });

/* ================= MODULE 6.2: REPORTS ================= */
export const admGetReportSummary = (params) =>
  axios.get("/api/admin/inventory/reports/summary", { params });

export const admGetReportRevenue = (params) =>
  axios.get("/api/admin/inventory/reports/revenue", { params });

export const admGetReportInventory = (params) =>
  axios.get("/api/admin/inventory/reports/inventory", { params });

export const admGetReportTrainerShare = (params) =>
  axios.get("/api/admin/inventory/reports/trainer-share", { params });
