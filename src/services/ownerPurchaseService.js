import axios from "../setup/axios";

const API = "/api/owner/purchases";
const OWNER_PURCHASE_LIST_TIMEOUT_MS = 15000;
const OWNER_PURCHASE_ACTION_TIMEOUT_MS = 20000;
const OWNER_PURCHASE_CREATE_REQUEST_TIMEOUT_MS = 60000;
const OWNER_PURCHASE_EXPORT_TIMEOUT_MS = 30000;
const OWNER_PURCHASE_CONFIRM_RECEIVE_TIMEOUT_MS = 60000;

const withTimeout = (timeout, config = {}) => ({ timeout, ...config });

export const ownerGetActiveCombos = (params = {}) =>
  axios.get(`${API}/combos`, withTimeout(OWNER_PURCHASE_LIST_TIMEOUT_MS, { params }));
export const ownerGetComboDetail = (id) =>
  axios.get(`${API}/combos/${id}`, withTimeout(OWNER_PURCHASE_LIST_TIMEOUT_MS));

export const ownerGetSuppliers = (params = {}) =>
  axios.get(`${API}/suppliers`, withTimeout(OWNER_PURCHASE_LIST_TIMEOUT_MS, { params }));
export const ownerGetPurchaseEquipments = (params = {}) =>
  axios.get(`${API}/equipments`, withTimeout(OWNER_PURCHASE_LIST_TIMEOUT_MS, { params }));
export const ownerGetQuotations = (params = {}) =>
  axios.get(`${API}/quotations`, withTimeout(OWNER_PURCHASE_LIST_TIMEOUT_MS, { params }));
export const ownerGetQuotationDetail = (id) =>
  axios.get(`${API}/quotations/${id}`, withTimeout(OWNER_PURCHASE_LIST_TIMEOUT_MS));
export const ownerGetPurchaseOrders = (params = {}) =>
  axios.get(`${API}/purchase-orders`, withTimeout(OWNER_PURCHASE_LIST_TIMEOUT_MS, { params }));
export const ownerGetPurchaseOrderDetail = (id) =>
  axios.get(`${API}/purchase-orders/${id}`, withTimeout(OWNER_PURCHASE_LIST_TIMEOUT_MS));
export const ownerGetReceipts = (params = {}) =>
  axios.get(`${API}/receipts`, withTimeout(OWNER_PURCHASE_LIST_TIMEOUT_MS, { params }));
export const ownerGetReceiptDetail = (id) =>
  axios.get(`${API}/receipts/${id}`, withTimeout(OWNER_PURCHASE_LIST_TIMEOUT_MS));
export const ownerPreviewPurchaseStock = (params) =>
  axios.get(`${API}/purchase-requests/stock-preview`, withTimeout(OWNER_PURCHASE_LIST_TIMEOUT_MS, { params }));
export const ownerCreatePurchaseRequest = (payload) =>
  axios.post(
    `${API}/purchase-requests`,
    payload,
    withTimeout(OWNER_PURCHASE_CREATE_REQUEST_TIMEOUT_MS)
  );
export const ownerGetPurchaseRequests = (params = {}) =>
  axios.get(`${API}/purchase-requests`, withTimeout(OWNER_PURCHASE_LIST_TIMEOUT_MS, { params }));
export const ownerGetPurchaseRequestDetail = (id) =>
  axios.get(`${API}/purchase-requests/${id}`, withTimeout(OWNER_PURCHASE_LIST_TIMEOUT_MS));
export const ownerCreatePurchaseRequestPayOSLink = (id, payload = {}) =>
  axios.post(`${API}/purchase-requests/${id}/payos-link`, payload, withTimeout(OWNER_PURCHASE_ACTION_TIMEOUT_MS));
export const ownerConfirmReceivePurchaseRequest = (id) =>
  axios.patch(
    `${API}/purchase-requests/${id}/confirm-receive`,
    {},
    withTimeout(OWNER_PURCHASE_CONFIRM_RECEIVE_TIMEOUT_MS)
  );
export const ownerExportPurchaseRequestsExcel = (params = {}) =>
  axios.get(
    `${API}/purchase-requests/export-excel`,
    withTimeout(OWNER_PURCHASE_EXPORT_TIMEOUT_MS, { params, responseType: "blob" })
  );
export const ownerGetProcurementPayments = (params = {}) =>
  axios.get(`${API}/procurement-payments`, withTimeout(OWNER_PURCHASE_LIST_TIMEOUT_MS, { params }));
export const ownerGetPayablePurchaseOrders = (params = {}) =>
  axios.get(`${API}/purchase-orders/payable`, withTimeout(OWNER_PURCHASE_LIST_TIMEOUT_MS, { params }));
export const ownerCreatePurchaseOrderPayOSLink = (purchaseOrderId, payload = {}) =>
  axios.post(`${API}/purchase-orders/${purchaseOrderId}/payos-link`, payload, withTimeout(OWNER_PURCHASE_ACTION_TIMEOUT_MS));
