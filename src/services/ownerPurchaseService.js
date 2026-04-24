import axios from "../setup/axios";

const API = "/api/owner/purchases";

export const ownerGetActiveCombos = (params = {}) => axios.get(`${API}/combos`, { params });
export const ownerGetComboDetail = (id) => axios.get(`${API}/combos/${id}`);

export const ownerGetSuppliers = (params = {}) => axios.get(`${API}/suppliers`, { params });
export const ownerGetPurchaseEquipments = (params = {}) => axios.get(`${API}/equipments`, { params });
export const ownerGetQuotations = (params = {}) => axios.get(`${API}/quotations`, { params });
export const ownerGetQuotationDetail = (id) => axios.get(`${API}/quotations/${id}`);
export const ownerGetPurchaseOrders = (params = {}) => axios.get(`${API}/purchase-orders`, { params });
export const ownerGetPurchaseOrderDetail = (id) => axios.get(`${API}/purchase-orders/${id}`);
export const ownerGetReceipts = (params = {}) => axios.get(`${API}/receipts`, { params });
export const ownerGetReceiptDetail = (id) => axios.get(`${API}/receipts/${id}`);
export const ownerPreviewPurchaseStock = (params) => axios.get(`${API}/purchase-requests/stock-preview`, { params });
export const ownerCreatePurchaseRequest = (payload) => axios.post(`${API}/purchase-requests`, payload);
export const ownerGetPurchaseRequests = (params = {}) => axios.get(`${API}/purchase-requests`, { params });
export const ownerGetPurchaseRequestDetail = (id) => axios.get(`${API}/purchase-requests/${id}`);
export const ownerCreatePurchaseRequestPayOSLink = (id, payload = {}) => axios.post(`${API}/purchase-requests/${id}/payos-link`, payload);
export const ownerConfirmReceivePurchaseRequest = (id) => axios.patch(`${API}/purchase-requests/${id}/confirm-receive`);
export const ownerExportPurchaseRequestsExcel = (params = {}) =>
  axios.get(`${API}/purchase-requests/export-excel`, { params, responseType: "blob" });
export const ownerGetProcurementPayments = (params = {}) => axios.get(`${API}/procurement-payments`, { params });
export const ownerGetPayablePurchaseOrders = (params = {}) => axios.get(`${API}/purchase-orders/payable`, { params });
export const ownerCreatePurchaseOrderPayOSLink = (purchaseOrderId, payload = {}) => axios.post(`${API}/purchase-orders/${purchaseOrderId}/payos-link`, payload);
