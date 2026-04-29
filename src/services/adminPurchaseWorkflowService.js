import axios from "../setup/axios";
const ADMIN_PURCHASE_TIMEOUT_MS = 30000;
const withTimeout = (config = {}) => ({ timeout: ADMIN_PURCHASE_TIMEOUT_MS, ...config });

const adminPurchaseWorkflowService = {
  getEquipmentCombos: (params) => axios.get("/api/admin/inventory/equipment-combos", withTimeout({ params })),
  getEquipmentComboDetail: (id) => axios.get(`/api/admin/inventory/equipment-combos/${id}`, withTimeout()),
  createEquipmentCombo: (body) => axios.post("/api/admin/inventory/equipment-combos", body, withTimeout()),
  updateEquipmentCombo: (id, body) => axios.put(`/api/admin/inventory/equipment-combos/${id}`, body, withTimeout()),
  deleteEquipmentCombo: (id) => axios.delete(`/api/admin/inventory/equipment-combos/${id}`, withTimeout()),
  toggleEquipmentComboSelling: (id, body) => axios.patch(`/api/admin/inventory/equipment-combos/${id}/selling`, body, withTimeout()),

  getPurchaseRequests: (params) => axios.get("/api/admin/inventory/purchase-requests", withTimeout({ params })),
  getEquipmentSalesTransactions: (params) => axios.get("/api/admin/inventory/purchase-transactions", withTimeout({ params })),
  getPurchaseRequestDetail: (id) => axios.get(`/api/admin/inventory/purchase-requests/${id}`, withTimeout()),
  rejectPurchaseRequest: (id, body) => axios.patch(`/api/admin/inventory/purchase-requests/${id}/reject`, body, withTimeout()),
  // bodyParser.json() ở BE dùng strict mode, gửi `null` sẽ bị reject ("not valid JSON").
  // Dùng `{}` để payload luôn là JSON object hợp lệ cho các PATCH không cần dữ liệu chi tiết.
  approvePurchaseRequest: (id) => axios.patch(`/api/admin/inventory/purchase-requests/${id}/approve`, {}, withTimeout()),
  confirmPurchaseRequestPaymentAndShip: (id) => axios.patch(`/api/admin/inventory/purchase-requests/${id}/confirm-payment-and-ship`, {}, withTimeout()),

  getQuotations: (params) => axios.get("/api/admin/inventory/quotations", withTimeout({ params })),
  getQuotationDetail: (id) => axios.get(`/api/admin/inventory/quotations/${id}`, withTimeout()),
  quoteQuotation: (id, body) => axios.patch(`/api/admin/inventory/quotations/${id}/quote`, body, withTimeout()),
  approveQuotation: (id) => axios.patch(`/api/admin/inventory/quotations/${id}/approve`, null, withTimeout()),
  rejectQuotation: (id, body) => axios.patch(`/api/admin/inventory/quotations/${id}/reject`, body, withTimeout()),

  createPOFromQuotation: (quotationId) => axios.post(`/api/admin/inventory/quotations/${quotationId}/convert-to-po`, null, withTimeout()),
  getPurchaseOrders: (params) => axios.get("/api/admin/inventory/purchase-orders", withTimeout({ params })),
  getPurchaseOrderDetail: (id) => axios.get(`/api/admin/inventory/purchase-orders/${id}`, withTimeout()),
  approvePO: (id) => axios.patch(`/api/admin/inventory/purchase-orders/${id}/approve`, null, withTimeout()),
  markPOOrdered: (id, body) => axios.patch(`/api/admin/inventory/purchase-orders/${id}/order`, body, withTimeout()),
  cancelPO: (id, body) => axios.patch(`/api/admin/inventory/purchase-orders/${id}/cancel`, body, withTimeout()),
  getReceipts: (params) => axios.get("/api/admin/inventory/receipts", withTimeout({ params })),
  getReceiptDetail: (id) => axios.get(`/api/admin/inventory/receipts/${id}`, withTimeout()),
  updateReceiptItems: (id, body) => axios.patch(`/api/admin/inventory/receipts/${id}/items`, body, withTimeout()),
  createReceiptFromPO: (poId) => axios.post(`/api/admin/inventory/purchase-orders/${poId}/receipts/inbound`, null, withTimeout()),
  completeReceipt: (id) => axios.patch(`/api/admin/inventory/receipts/${id}/complete`, null, withTimeout()),
  getPaymentsByPO: (poId) => axios.get(`/api/admin/inventory/purchase-orders/${poId}/payments`, withTimeout()),
  createPayment: (poId, body) => axios.post(`/api/admin/inventory/purchase-orders/${poId}/payments`, body, withTimeout()),
  getPOTimeline: (poId) => axios.get(`/api/admin/inventory/purchase-orders/${poId}/timeline`, withTimeout()),
};

export default adminPurchaseWorkflowService;
