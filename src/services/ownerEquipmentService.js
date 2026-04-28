import axios from "../setup/axios";

const API = "/api/owner/equipment";
const OWNER_EQUIPMENT_TIMEOUT_MS = 30000;

export const ownerGetEquipments = (params = {}) =>
  axios.get(API, { params, timeout: OWNER_EQUIPMENT_TIMEOUT_MS });

export const ownerGetEquipmentDetail = (id, params = {}) =>
  axios.get(`${API}/${id}`, { params, timeout: OWNER_EQUIPMENT_TIMEOUT_MS });

export const ownerMarkEquipmentUnitInUse = (equipmentId, unitId) =>
  axios.patch(`${API}/${equipmentId}/units/${unitId}/mark-in-use`);

export const ownerMarkEquipmentUnitsInUse = (equipmentId, unitIds = []) =>
  axios.patch(`${API}/${equipmentId}/units/mark-in-use`, { unitIds });

export const ownerMarkEquipmentUnitInStock = (equipmentId, unitId) =>
  axios.patch(`${API}/${equipmentId}/units/${unitId}/mark-in-stock`);

export const ownerMarkEquipmentUnitsInStock = (equipmentId, unitIds = []) =>
  axios.patch(`${API}/${equipmentId}/units/mark-in-stock`, { unitIds });

export const ownerGetEquipmentUnitEvents = (id, params = {}) =>
  axios.get(`${API}/${id}/unit-events`, { params });

export const ownerExportEquipmentUnitEvents = (id, params = {}) =>
  axios.get(`${API}/${id}/unit-events/export`, {
    params,
    responseType: "blob",
  });

export const ownerGetCategories = () =>
  axios.get(`${API}/categories`);
