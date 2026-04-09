// src/services/equipmentSupplierInventoryService.js
import axios from "../setup/axios";

const API_BASE = "/api/admin/inventory";

// ✅ GYMS (dropdown)
export const getGyms = (params) =>
  axios.get(`${API_BASE}/gyms`, { params }).then((r) => r.data);

// ===== EQUIPMENT =====
export const getEquipments = (params) =>
  axios.get(`${API_BASE}/equipments`, { params }).then((r) => r.data);

export const getEquipmentCategories = () =>
  axios.get(`${API_BASE}/equipment-categories`).then((r) => r.data);

export const createEquipment = (payload) =>
  axios.post(`${API_BASE}/equipments`, payload).then((r) => r.data);

export const updateEquipment = (id, payload) =>
  axios.put(`${API_BASE}/equipments/${id}`, payload).then((r) => r.data);

export const discontinueEquipment = (id) =>
  axios.patch(`${API_BASE}/equipments/${id}/discontinue`).then((r) => r.data);

// ===== EQUIPMENT IMAGES (NEW) =====

// ✅ lấy danh sách ảnh theo equipmentId
export const getEquipmentImages = (equipmentId) =>
  axios.get(`${API_BASE}/equipments/${equipmentId}/images`).then((r) => r.data);

// ✅ upload nhiều ảnh: field name = "images"
export const uploadEquipmentImages = (equipmentId, files = []) => {
  const fd = new FormData();
  files.forEach((f) => fd.append("images", f));
  return axios
    .post(`${API_BASE}/equipments/${equipmentId}/images`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

// ✅ set ảnh đại diện
export const setPrimaryEquipmentImage = (equipmentId, imageId) =>
  axios
    .patch(`${API_BASE}/equipments/${equipmentId}/images/${imageId}/primary`)
    .then((r) => r.data);

// ✅ xoá ảnh
export const deleteEquipmentImage = (equipmentId, imageId) =>
  axios
    .delete(`${API_BASE}/equipments/${equipmentId}/images/${imageId}`)
    .then((r) => r.data);

// ===== SUPPLIER =====
export const getSuppliers = (params) =>
  axios.get(`${API_BASE}/suppliers`, { params }).then((r) => r.data);

export const createSupplier = (payload) =>
  axios.post(`${API_BASE}/suppliers`, payload).then((r) => r.data);

export const updateSupplier = (id, payload) =>
  axios.put(`${API_BASE}/suppliers/${id}`, payload).then((r) => r.data);

// ✅ FIX: nhận cả boolean hoặc {isActive:true/false}
export const setSupplierActive = (id, input) => {
  const body =
    typeof input === "object" && input !== null
      ? { isActive: !!input.isActive }
      : { isActive: !!input };

  return axios
    .patch(`${API_BASE}/suppliers/${id}/active`, body)
    .then((r) => r.data);
};

// alias
export const toggleSupplierActive = (id, isActive) => setSupplierActive(id, isActive);

// ===== STOCKS =====
export const getStocks = (params) =>
  axios.get(`${API_BASE}/stocks`, { params }).then((r) => r.data);

// ===== NHẬP / XUẤT =====
export const createReceipt = (payload) =>
  axios.post(`${API_BASE}/receipts`, payload).then((r) => r.data);

export const createExport = (payload) =>
  axios.post(`${API_BASE}/exports`, payload).then((r) => r.data);

