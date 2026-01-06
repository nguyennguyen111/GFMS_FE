import api from "../setup/axios";

// prefix API (không cần sửa axios.js)
const API_PREFIX = "/api";

// ===== EQUIPMENT =====
export const getEquipmentCategories = (params) =>
  api.get(`${API_PREFIX}/admin/equipment-categories`, { params });

export const getEquipments = (params) =>
  api.get(`${API_PREFIX}/admin/equipments`, { params });

export const createEquipment = (payload) =>
  api.post(`${API_PREFIX}/admin/equipments`, payload);

export const updateEquipment = (id, payload) =>
  api.put(`${API_PREFIX}/admin/equipments/${id}`, payload);

// 🔧 BE là PATCH /admin/equipments/:id/discontinue (không phải DELETE)
export const discontinueEquipment = (id) =>
  api.patch(`${API_PREFIX}/admin/equipments/${id}/discontinue`);

// ===== SUPPLIER =====
export const getSuppliers = (params) =>
  api.get(`${API_PREFIX}/admin/suppliers`, { params });

export const createSupplier = (payload) =>
  api.post(`${API_PREFIX}/admin/suppliers`, payload);

export const updateSupplier = (id, payload) =>
  api.put(`${API_PREFIX}/admin/suppliers/${id}`, payload);

// backend đang dùng PATCH /admin/suppliers/:id/active
export const setSupplierActive = (id, isActive) =>
  api.patch(`${API_PREFIX}/admin/suppliers/${id}/active`, { isActive });

// ✅ alias để khỏi lỗi import cũ
export const toggleSupplierActive = (id, isActive) => setSupplierActive(id, isActive);

// ===== STOCK =====
export const getStocks = (params) =>
  api.get(`${API_PREFIX}/admin/stocks`, { params });

// ===== 6) INVENTORY LOGS =====
export const getInventoryLogs = (params) =>
  api.get(`${API_PREFIX}/admin/inventory-logs`, { params });

// ===== 4) IMPORT (RECEIPT) =====
export const createReceiptImport = (payload) =>
  api.post(`${API_PREFIX}/admin/receipts`, payload);

// ✅ alias nếu nơi khác đang import createReceipt
export const createReceipt = (payload) => createReceiptImport(payload);

// ===== 5) EXPORT =====
export const createExport = (payload) =>
  api.post(`${API_PREFIX}/admin/exports`, payload);
