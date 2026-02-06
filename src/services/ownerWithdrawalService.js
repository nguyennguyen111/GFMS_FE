import axios from "../setup/axios";

const API_URL = "/api/owner/withdrawals";

export const ownerGetWithdrawals = (params = {}) =>
  axios.get(API_URL, { params });

export const ownerExportWithdrawals = (params = {}) =>
  axios.get(`${API_URL}/export`, { params, responseType: "blob" });

export const ownerApproveWithdrawal = (id) =>
  axios.post(`${API_URL}/${id}/approve`);

export const ownerRejectWithdrawal = (id, reason) =>
  axios.post(`${API_URL}/${id}/reject`, { reason });
