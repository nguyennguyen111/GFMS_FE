import axios from "../setup/axios";

export const adminFranchiseApi = {
  list: (params) => axios.get("/api/admin/inventory/franchise-requests", { params }),
  detail: (id) => axios.get(`/api/admin/inventory/franchise-requests/${id}`),

  approve: (id, payload) => axios.patch(`/api/admin/inventory/franchise-requests/${id}/approve`, payload || {}),
  reject: (id, payload) => axios.patch(`/api/admin/inventory/franchise-requests/${id}/reject`, payload || {}),

  // enterprise contract
  sendContract: (id) => axios.patch(`/api/admin/inventory/franchise-contract/${id}/send`),

  // giữ backward compatible (nếu code cũ gọi resendContract)
  resendContract: (id) => axios.patch(`/api/admin/inventory/franchise-contract/${id}/resend`),

  // JSX của bạn gọi resendInvite
  resendInvite: (id) => axios.patch(`/api/admin/inventory/franchise-contract/${id}/resend`),

  // { signerName, signatureDataUrl }
  countersign: (id, payload) => axios.patch(`/api/admin/inventory/franchise-contract/${id}/countersign`, payload || {}),
  getContractStatus: (id) => axios.get(`/api/admin/inventory/franchise-contract/${id}/status`),

  // download PDF (auth required) -> blob
  downloadDocument: (id, type = "final") =>
    axios.get(`/api/admin/inventory/franchise-contract/${id}/document`, {
      params: { type },
      responseType: "blob",
    }),

  // JSX của bạn gọi simulateEvent
  simulateEvent: (id, event) => axios.patch(`/api/admin/inventory/franchise-contract/${id}/simulate/${event}`),
};
