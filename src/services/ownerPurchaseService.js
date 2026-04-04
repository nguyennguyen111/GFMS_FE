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
  axios.get(`/api/owner/inventory`, {
    params: {
      page: 1,
      limit: 500,
      gymId: params?.gymId,
      equipmentId: params?.equipmentId,
    },
  });

export const ownerCreatePurchaseRequest = (payload) =>
  axios.post(`${API}/quotations`, {
    gymId: payload?.gymId,
    supplierId: payload?.expectedSupplierId,
    items: [
      {
        equipmentId: payload?.equipmentId,
        quantity: payload?.quantity,
        unitPrice: payload?.expectedUnitPrice || 0,
      },
    ],
    notes: payload?.note || "",
  });

export const ownerGetPurchaseRequests = (params = {}) =>
  axios.get(`${API}/quotations`, { params });

export const ownerGetPurchaseRequestDetail = (id) =>
  axios.get(`${API}/quotations/${id}`);

// Procurement payments
export const ownerGetProcurementPayments = (params = {}) =>
  axios.get(`${API}/procurement-payments`, { params });
