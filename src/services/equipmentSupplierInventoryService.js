// frontend/src/services/equipmentSupplierInventoryService.js
import axios from "../setup/axios";

// ========== EQUIPMENT ==========
export const getEquipments = (params) =>
  axios.get("/api/admin/equipments", { params });

export const createEquipment = (data) =>
  axios.post("/api/admin/equipments", data);

export const updateEquipment = (id, data) =>
  axios.put(`/api/admin/equipments/${id}`, data);

// soft delete theo nghiệp vụ: status = discontinued
export const discontinueEquipment = (id) =>
  axios.patch(`/api/admin/equipments/${id}/discontinue`);

// categories for dropdown
export const getEquipmentCategories = (params) =>
  axios.get("/api/admin/equipment-categories", { params });

// ========== SUPPLIER ==========
export const getSuppliers = (params) =>
  axios.get("/api/admin/suppliers", { params });

export const createSupplier = (data) =>
  axios.post("/api/admin/suppliers", data);

export const updateSupplier = (id, data) =>
  axios.put(`/api/admin/suppliers/${id}`, data);

export const toggleSupplierActive = (id, isActive) =>
  axios.patch(`/api/admin/suppliers/${id}/active`, { isActive });

// ========== INVENTORY / STOCK ==========
export const getStocks = (params) =>
  axios.get("/api/admin/stocks", { params });

// Nhập kho
export const createReceipt = (data) =>
  axios.post("/api/admin/receipts", data);

// Xuất kho
export const createExport = (data) =>
  axios.post("/api/admin/exports", data);

// Nhật ký kho
export const getInventoryLogs = (params) =>
  axios.get("/api/admin/inventory-logs", { params });
