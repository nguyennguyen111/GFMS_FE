import axios from "../setup/axios";

const API = "/api/owner/purchases";

// Suppliers
export const ownerGetSuppliers = (params = {}) =>
  axios.get(`${API}/suppliers`, { params });

// Quotations
export const ownerGetQuotations = (params = {}) =>
  axios.get(`${API}/quotations`, { params });

export const ownerGetQuotationDetail = (id) =>
  axios.get(`${API}/quotations/${id}`);

export const ownerCreateQuotation = (payload) =>
  axios.post(`${API}/quotations`, payload);

// Purchase Orders
export const ownerGetPurchaseOrders = (params = {}) =>
  axios.get(`${API}/purchase-orders`, { params });

export const ownerGetPurchaseOrderDetail = (id) =>
  axios.get(`${API}/purchase-orders/${id}`);

// Receipts
export const ownerGetReceipts = (params = {}) =>
  axios.get(`${API}/receipts`, { params });

export const ownerGetReceiptDetail = (id) =>
  axios.get(`${API}/receipts/${id}`);
