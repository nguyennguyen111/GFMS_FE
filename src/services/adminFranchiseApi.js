import axios from "../setup/axios";

/**
 * Base demo (mock SignNow) - khớp BE:
 * - Franchise requests: /api/admin/inventory/franchise-requests
 * - Contract: /api/admin/inventory/franchise-contract
 */

export const adminFranchiseApi = {
  // list & detail
  list: (params) => axios.get("/api/admin/inventory/franchise-requests", { params }),
  detail: (id) => axios.get(`/api/admin/inventory/franchise-requests/${id}`),

  // approve/reject
  approve: (id, payload) =>
    axios.patch(`/api/admin/inventory/franchise-requests/${id}/approve`, payload || {}),
  reject: (id, payload) =>
    axios.patch(`/api/admin/inventory/franchise-requests/${id}/reject`, payload || {}),

  // ===== Contract base mock =====
  // send contract (not_sent -> sent)
  sendContract: (id) => axios.patch(`/api/admin/inventory/franchise-contract/${id}/send`),

  // polling status
  getContractStatus: (id) => axios.get(`/api/admin/inventory/franchise-contract/${id}/status`),

  // mock transitions (đại diện cho event/webhook từ SignNow)
  mockViewed: (id) => axios.patch(`/api/admin/inventory/franchise-contract/${id}/mock/viewed`),
  mockSigned: (id) => axios.patch(`/api/admin/inventory/franchise-contract/${id}/mock/signed`),
  mockCompleted: (id) => axios.patch(`/api/admin/inventory/franchise-contract/${id}/mock/completed`),
};
