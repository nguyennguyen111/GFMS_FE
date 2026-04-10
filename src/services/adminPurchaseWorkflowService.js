import axios from "../setup/axios";

const adminPurchaseWorkflowService = {
  /* ================= PURCHASE REQUESTS ================= */
  getPurchaseRequests: (params) => axios.get("/api/admin/inventory/purchase-requests", { params }),

  getPurchaseRequestDetail: (id) => axios.get(`/api/admin/inventory/purchase-requests/${id}`),

  rejectPurchaseRequest: (id, body) =>
    axios.patch(`/api/admin/inventory/purchase-requests/${id}/reject`, body),

  convertPurchaseRequestToQuotation: (id, body) =>
    axios.post(`/api/admin/inventory/purchase-requests/${id}/convert-to-quotation`, body || {}),

  /* ================= QUOTATIONS ================= */
  getQuotations: (params) => axios.get("/api/admin/inventory/quotations", { params }),

  getQuotationDetail: (id) => axios.get(`/api/admin/inventory/quotations/${id}`),

  quoteQuotation: (id, body) => axios.patch(`/api/admin/inventory/quotations/${id}/quote`, body),

  approveQuotation: (id) => axios.patch(`/api/admin/inventory/quotations/${id}/approve`),

  rejectQuotation: (id, body) => axios.patch(`/api/admin/inventory/quotations/${id}/reject`, body),

  /* ================= PURCHASE ORDERS ================= */
  // ✅ FIX: theo BE route: POST /quotations/:id/convert-to-po
  createPOFromQuotation: (quotationId) =>
    axios.post(`/api/admin/inventory/quotations/${quotationId}/convert-to-po`),

  getPurchaseOrders: (params) => axios.get("/api/admin/inventory/purchase-orders", { params }),

  getPurchaseOrderDetail: (id) => axios.get(`/api/admin/inventory/purchase-orders/${id}`),

  approvePO: (id) => axios.patch(`/api/admin/inventory/purchase-orders/${id}/approve`),

  markPOOrdered: (id, body) => axios.patch(`/api/admin/inventory/purchase-orders/${id}/order`, body),

  cancelPO: (id, body) => axios.patch(`/api/admin/inventory/purchase-orders/${id}/cancel`, body),

  /* ================= RECEIPTS ================= */
  getReceipts: (params) => axios.get("/api/admin/inventory/receipts", { params }),

  getReceiptDetail: (id) => axios.get(`/api/admin/inventory/receipts/${id}`),

  updateReceiptItems: (id, body) => axios.patch(`/api/admin/inventory/receipts/${id}/items`, body),

  // ✅ FIX: theo BE route: POST /purchase-orders/:id/receipts/inbound
  createReceiptFromPO: (poId) =>
    axios.post(`/api/admin/inventory/purchase-orders/${poId}/receipts/inbound`),

  completeReceipt: (id) => axios.patch(`/api/admin/inventory/receipts/${id}/complete`),

  /* ================= PAYMENTS ================= */
  getPaymentsByPO: (poId) => axios.get(`/api/admin/inventory/purchase-orders/${poId}/payments`),

  createPayment: (poId, body) => axios.post(`/api/admin/inventory/purchase-orders/${poId}/payments`, body),

  /* ================= TIMELINE ================= */
  getPOTimeline: (poId) => axios.get(`/api/admin/inventory/purchase-orders/${poId}/timeline`),
};

export default adminPurchaseWorkflowService;
