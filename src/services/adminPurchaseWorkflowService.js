import axios from "../setup/axios";
const ADMIN_PURCHASE_LIST_TIMEOUT_MS = 15000;
const ADMIN_PURCHASE_ACTION_TIMEOUT_MS = 20000;
const withListTimeout = (config = {}) => ({ timeout: ADMIN_PURCHASE_LIST_TIMEOUT_MS, ...config });
const withActionTimeout = (config = {}) => ({ timeout: ADMIN_PURCHASE_ACTION_TIMEOUT_MS, ...config });

const adminPurchaseWorkflowService = {
  getEquipmentCombos: (params) => axios.get("/api/admin/inventory/equipment-combos", withListTimeout({ params })),
  getEquipmentComboDetail: (id) => axios.get(`/api/admin/inventory/equipment-combos/${id}`, withListTimeout()),
  createEquipmentCombo: (body) => axios.post("/api/admin/inventory/equipment-combos", body, withActionTimeout()),
  updateEquipmentCombo: (id, body) => axios.put(`/api/admin/inventory/equipment-combos/${id}`, body, withActionTimeout()),
  deleteEquipmentCombo: (id) => axios.delete(`/api/admin/inventory/equipment-combos/${id}`, withActionTimeout()),
  toggleEquipmentComboSelling: (id, body) => axios.patch(`/api/admin/inventory/equipment-combos/${id}/selling`, body, withActionTimeout()),

  getPurchaseRequests: (params) => axios.get("/api/admin/inventory/purchase-requests", withListTimeout({ params })),
  getEquipmentSalesTransactions: (params) => axios.get("/api/admin/inventory/purchase-transactions", withListTimeout({ params })),
  getPurchaseRequestDetail: (id) => axios.get(`/api/admin/inventory/purchase-requests/${id}`, withListTimeout()),
  rejectPurchaseRequest: (id, body) => axios.patch(`/api/admin/inventory/purchase-requests/${id}/reject`, body, withActionTimeout()),
  // bodyParser.json() ở BE dùng strict mode, gửi `null` sẽ bị reject ("not valid JSON").
  // Dùng `{}` để payload luôn là JSON object hợp lệ cho các PATCH không cần dữ liệu chi tiết.
  approvePurchaseRequest: (id) => axios.patch(`/api/admin/inventory/purchase-requests/${id}/approve`, {}, withActionTimeout()),
  confirmPurchaseRequestPaymentAndShip: (id) => axios.patch(`/api/admin/inventory/purchase-requests/${id}/confirm-payment-and-ship`, {}, withActionTimeout()),

  getQuotations: (params) => axios.get("/api/admin/inventory/quotations", withListTimeout({ params })),
  getQuotationDetail: (id) => axios.get(`/api/admin/inventory/quotations/${id}`, withListTimeout()),
  quoteQuotation: (id, body) => axios.patch(`/api/admin/inventory/quotations/${id}/quote`, body, withActionTimeout()),
  approveQuotation: (id) => axios.patch(`/api/admin/inventory/quotations/${id}/approve`, null, withActionTimeout()),
  rejectQuotation: (id, body) => axios.patch(`/api/admin/inventory/quotations/${id}/reject`, body, withActionTimeout()),

  createPOFromQuotation: (quotationId) => axios.post(`/api/admin/inventory/quotations/${quotationId}/convert-to-po`, null, withActionTimeout()),
  getPurchaseOrders: (params) => axios.get("/api/admin/inventory/purchase-orders", withListTimeout({ params })),
  getPurchaseOrderDetail: (id) => axios.get(`/api/admin/inventory/purchase-orders/${id}`, withListTimeout()),
  approvePO: (id) => axios.patch(`/api/admin/inventory/purchase-orders/${id}/approve`, null, withActionTimeout()),
  markPOOrdered: (id, body) => axios.patch(`/api/admin/inventory/purchase-orders/${id}/order`, body, withActionTimeout()),
  cancelPO: (id, body) => axios.patch(`/api/admin/inventory/purchase-orders/${id}/cancel`, body, withActionTimeout()),
  getReceipts: (params) => axios.get("/api/admin/inventory/receipts", withListTimeout({ params })),
  getReceiptDetail: (id) => axios.get(`/api/admin/inventory/receipts/${id}`, withListTimeout()),
  updateReceiptItems: (id, body) => axios.patch(`/api/admin/inventory/receipts/${id}/items`, body, withActionTimeout()),
  createReceiptFromPO: (poId) => axios.post(`/api/admin/inventory/purchase-orders/${poId}/receipts/inbound`, null, withActionTimeout()),
  completeReceipt: (id) => axios.patch(`/api/admin/inventory/receipts/${id}/complete`, null, withActionTimeout()),
  getPaymentsByPO: (poId) => axios.get(`/api/admin/inventory/purchase-orders/${poId}/payments`, withListTimeout()),
  createPayment: (poId, body) => axios.post(`/api/admin/inventory/purchase-orders/${poId}/payments`, body, withActionTimeout()),
  getPOTimeline: (poId) => axios.get(`/api/admin/inventory/purchase-orders/${poId}/timeline`, withListTimeout()),
};

export default adminPurchaseWorkflowService;
