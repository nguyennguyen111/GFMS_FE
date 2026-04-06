import axios from "../setup/axios";

const API = "/api/owner/transfers";

export const ownerGetTransfers = (params = {}) =>
  axios.get(API, { params });

export const ownerGetTransferDetail = (id) =>
  axios.get(`${API}/${id}`);

export const ownerCreateTransfer = (payload) =>
  axios.post(API, payload);

export const ownerApproveTransfer = (id) =>
  axios.patch(`${API}/${id}/approve`);

export const ownerRejectTransfer = (id, payload) =>
  axios.patch(`${API}/${id}/reject`, payload);

export const ownerCompleteTransfer = (id, payload) =>
  axios.patch(`${API}/${id}/complete`, payload);
