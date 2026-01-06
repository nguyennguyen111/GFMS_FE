import axios from "../setup/axios";

// ===== EQUIPMENT =====
export const getEquipments = (params) => axios.get("/api/admin/equipments", { params });
export const createEquipment = (data) => axios.post("/api/admin/equipments", data);
export const updateEquipment = (id, data) => axios.put(`/api/admin/equipments/${id}`, data);
export const discontinueEquipment = (id) => axios.patch(`/api/admin/equipments/${id}/discontinue`);
export const getEquipmentCategories = (params) =>
  axios.get("/api/admin/equipment-categories", { params });

// ===== SUPPLIERS =====
export const getSuppliers = (params) => axios.get("/api/admin/suppliers", { params });
export const createSupplier = (data) => axios.post("/api/admin/suppliers", data);
export const updateSupplier = (id, data) => axios.put(`/api/admin/suppliers/${id}`, data);
export const toggleSupplierActive = (id, isActive) =>
  axios.patch(`/api/admin/suppliers/${id}/active`, { isActive });

// ===== STOCK =====
export const getStocks = (params) => axios.get("/api/admin/stocks", { params });

// ===== IMPORT / EXPORT =====
export const createReceipt = (data) => axios.post("/api/admin/receipts", data);
export const createExport = (data) => axios.post("/api/admin/exports", data);
