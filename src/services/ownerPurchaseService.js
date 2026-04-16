import axios from "../setup/axios";

const API = "/api/owner/purchases";

// Suppliers
export const ownerGetSuppliers = (params = {}) =>
  axios.get(`${API}/suppliers`, { params });
export const ownerGetPurchaseEquipments = (params = {}) =>
  axios.get(`${API}/equipments`, { params });

// Quotations
export const ownerGetQuotations = (params = {}) =>
  axios.get(`${API}/quotations`, { params });

export const ownerGetQuotationDetail = (id) =>
  axios.get(`${API}/quotations/${id}`);


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

// Purchase requests (owner nhu cầu mua)
export const ownerPreviewPurchaseStock = (params) =>
  axios.get(`${API}/purchase-requests/stock-preview`, { params });

export const ownerCreatePurchaseRequest = (payload) =>
  axios.post(`${API}/purchase-requests`, payload);

export const ownerGetPurchaseRequests = (params = {}) =>
  axios.get(`${API}/purchase-requests`, { params });

export const ownerGetPurchaseRequestDetail = (id) =>
  axios.get(`${API}/purchase-requests/${id}`);
export const ownerCreatePurchaseRequestPayOSLink = (id) =>
  axios.post(`${API}/purchase-requests/${id}/payos-link`);
export const ownerConfirmReceivePurchaseRequest = (id) =>
  axios.patch(`${API}/purchase-requests/${id}/confirm-receive`);

// Procurement payments
export const ownerGetProcurementPayments = (params = {}) =>
  axios.get(`${API}/procurement-payments`, { params });

export const ownerGetPayablePurchaseOrders = (params = {}) =>
  axios.get(`${API}/purchase-orders/payable`, { params });

export const ownerCreatePurchaseOrderPayOSLink = (purchaseOrderId, payload = {}) =>
  axios.post(`${API}/purchase-orders/${purchaseOrderId}/payos-link`, payload);
