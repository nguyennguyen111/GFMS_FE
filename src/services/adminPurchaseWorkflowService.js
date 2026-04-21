import axios from "../setup/axios";

const adminPurchaseWorkflowService = {
  getEquipmentCombos: (params) => axios.get("/api/admin/inventory/equipment-combos", { params }),
  getEquipmentComboDetail: (id) => axios.get(`/api/admin/inventory/equipment-combos/${id}`),
  createEquipmentCombo: (body) => axios.post("/api/admin/inventory/equipment-combos", body),
  updateEquipmentCombo: (id, body) => axios.put(`/api/admin/inventory/equipment-combos/${id}`, body),
  deleteEquipmentCombo: (id) => axios.delete(`/api/admin/inventory/equipment-combos/${id}`),
  toggleEquipmentComboSelling: (id, body) => axios.patch(`/api/admin/inventory/equipment-combos/${id}/selling`, body),

  getPurchaseRequests: (params) => axios.get("/api/admin/inventory/purchase-requests", { params }),
  getEquipmentSalesTransactions: (params) => axios.get("/api/admin/inventory/purchase-transactions", { params }),
  getPurchaseRequestDetail: (id) => axios.get(`/api/admin/inventory/purchase-requests/${id}`),
  rejectPurchaseRequest: (id, body) => axios.patch(`/api/admin/inventory/purchase-requests/${id}/reject`, body),
  approvePurchaseRequest: (id) => axios.patch(`/api/admin/inventory/purchase-requests/${id}/approve`),
  confirmPurchaseRequestPaymentAndShip: (id) => axios.patch(`/api/admin/inventory/purchase-requests/${id}/confirm-payment-and-ship`),

  getQuotations: (params) => axios.get("/api/admin/inventory/quotations", { params }),
  getQuotationDetail: (id) => axios.get(`/api/admin/inventory/quotations/${id}`),
  quoteQuotation: (id, body) => axios.patch(`/api/admin/inventory/quotations/${id}/quote`, body),
  approveQuotation: (id) => axios.patch(`/api/admin/inventory/quotations/${id}/approve`),
  rejectQuotation: (id, body) => axios.patch(`/api/admin/inventory/quotations/${id}/reject`, body),

  createPOFromQuotation: (quotationId) => axios.post(`/api/admin/inventory/quotations/${quotationId}/convert-to-po`),
  getPurchaseOrders: (params) => axios.get("/api/admin/inventory/purchase-orders", { params }),
  getPurchaseOrderDetail: (id) => axios.get(`/api/admin/inventory/purchase-orders/${id}`),
  approvePO: (id) => axios.patch(`/api/admin/inventory/purchase-orders/${id}/approve`),
  markPOOrdered: (id, body) => axios.patch(`/api/admin/inventory/purchase-orders/${id}/order`, body),
  cancelPO: (id, body) => axios.patch(`/api/admin/inventory/purchase-orders/${id}/cancel`, body),
  getReceipts: (params) => axios.get("/api/admin/inventory/receipts", { params }),
  getReceiptDetail: (id) => axios.get(`/api/admin/inventory/receipts/${id}`),
  updateReceiptItems: (id, body) => axios.patch(`/api/admin/inventory/receipts/${id}/items`, body),
  createReceiptFromPO: (poId) => axios.post(`/api/admin/inventory/purchase-orders/${poId}/receipts/inbound`),
  completeReceipt: (id) => axios.patch(`/api/admin/inventory/receipts/${id}/complete`),
  getPaymentsByPO: (poId) => axios.get(`/api/admin/inventory/purchase-orders/${poId}/payments`),
  createPayment: (poId, body) => axios.post(`/api/admin/inventory/purchase-orders/${poId}/payments`, body),
  getPOTimeline: (poId) => axios.get(`/api/admin/inventory/purchase-orders/${poId}/timeline`),
};

export default adminPurchaseWorkflowService;
