import axios from "../setup/axios";

// ===== MODULE 2: MAINTENANCE =====
export const ac_getMaintenances = (params) =>
  axios.get("/api/admin/inventory/maintenances", { params });

export const ac_getMaintenanceDetail = (id) =>
  axios.get(`/api/admin/inventory/maintenances/${id}`);

export const ac_approveMaintenance = (id, data) =>
  axios.patch(`/api/admin/inventory/maintenances/${id}/approve`, data);

export const ac_rejectMaintenance = (id, data) =>
  axios.patch(`/api/admin/inventory/maintenances/${id}/reject`, data);

export const ac_assignMaintenance = (id, data) =>
  axios.patch(`/api/admin/inventory/maintenances/${id}/assign`, data);

export const ac_startMaintenance = (id) =>
  axios.patch(`/api/admin/inventory/maintenances/${id}/start`);

export const ac_completeMaintenance = (id, data) =>
  axios.patch(`/api/admin/inventory/maintenances/${id}/complete`, data);

// ===== MODULE 3: FRANCHISE =====
export const ac_getFranchiseRequests = (params) =>
  axios.get("/api/admin/inventory/franchise-requests", { params });

export const ac_getFranchiseRequestDetail = (id) =>
  axios.get(`/api/admin/inventory/franchise-requests/${id}`);

export const ac_approveFranchiseRequest = (id) =>
  axios.patch(`/api/admin/inventory/franchise-requests/${id}/approve`);

export const ac_rejectFranchiseRequest = (id, data) =>
  axios.patch(`/api/admin/inventory/franchise-requests/${id}/reject`, data);

// ===== MODULE 4: POLICIES =====
export const ac_getPolicies = (params) =>
  axios.get("/api/admin/inventory/policies", { params });

export const ac_createPolicy = (data) =>
  axios.post("/api/admin/inventory/policies", data);

export const ac_updatePolicy = (id, data) =>
  axios.put(`/api/admin/inventory/policies/${id}`, data);

export const ac_togglePolicy = (id) =>
  axios.patch(`/api/admin/inventory/policies/${id}/toggle`);

// ===== MODULE 5: TRAINER SHARE =====
export const ac_getTrainerShares = (params) =>
  axios.get("/api/admin/inventory/trainer-shares", { params });

export const ac_getTrainerShareDetail = (id) =>
  axios.get(`/api/admin/inventory/trainer-shares/${id}`);

export const ac_approveTrainerShare = (id, data) =>
  axios.patch(`/api/admin/inventory/trainer-shares/${id}/approve`, data);

export const ac_rejectTrainerShare = (id, data) =>
  axios.patch(`/api/admin/inventory/trainer-shares/${id}/reject`, data);

export const ac_overrideTrainerShare = (id, data) =>
  axios.patch(`/api/admin/inventory/trainer-shares/${id}/override`, data);

// ===== MODULE 6.1: AUDIT LOGS =====
export const ac_getAuditLogs = (params) =>
  axios.get("/api/admin/inventory/audit-logs", { params });

// ===== MODULE 6.2: REPORTS =====
export const ac_getReportSummary = (params) =>
  axios.get("/api/admin/inventory/reports/summary", { params });

export const ac_getReportRevenue = (params) =>
  axios.get("/api/admin/inventory/reports/revenue", { params });

export const ac_getReportInventory = (params) =>
  axios.get("/api/admin/inventory/reports/inventory", { params });

export const ac_getReportTrainerShare = (params) =>
  axios.get("/api/admin/inventory/reports/trainer-share", { params });
// ==================================================
// ALIASES (adm*) — FIX TOÀN BỘ LỖI IMPORT FE
// Mục đích: các page dùng adm* vẫn chạy,
// trong khi core service giữ chuẩn ac_*
// ==================================================

// ===== Maintenance =====
export const admGetMaintenances = ac_getMaintenances;
export const admGetMaintenanceDetail = ac_getMaintenanceDetail;
export const admApproveMaintenance = ac_approveMaintenance;
export const admRejectMaintenance = ac_rejectMaintenance;
export const admAssignMaintenance = ac_assignMaintenance;
export const admStartMaintenance = ac_startMaintenance;
export const admCompleteMaintenance = ac_completeMaintenance;

// ===== Franchise =====
export const admGetFranchiseRequests = ac_getFranchiseRequests;
export const admGetFranchiseRequestDetail = ac_getFranchiseRequestDetail;
export const admApproveFranchiseRequest = ac_approveFranchiseRequest;
export const admRejectFranchiseRequest = ac_rejectFranchiseRequest;

// ===== Policies =====
export const admGetPolicies = ac_getPolicies;
export const admCreatePolicy = ac_createPolicy;
export const admUpdatePolicy = ac_updatePolicy;
export const admTogglePolicy = ac_togglePolicy;

// ===== Trainer Share =====
export const admGetTrainerShares = ac_getTrainerShares;
export const admGetTrainerShareDetail = ac_getTrainerShareDetail;
export const admApproveTrainerShare = ac_approveTrainerShare;
export const admRejectTrainerShare = ac_rejectTrainerShare;
export const admOverrideTrainerShare = ac_overrideTrainerShare;

// ===== Audit Logs =====
export const admGetAuditLogs = ac_getAuditLogs;

// ===== Reports =====
export const admGetReportSummary = ac_getReportSummary;
export const admGetReportRevenue = ac_getReportRevenue;
export const admGetReportInventory = ac_getReportInventory;
export const admGetReportTrainerShare = ac_getReportTrainerShare;
