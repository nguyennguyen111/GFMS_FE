import axios from "../setup/axios";

const API = "/api/owner/maintenances";
const OWNER_MAINTENANCE_TIMEOUT_MS = 30000;

// Get list of maintenances for owner's gyms
export const ownerGetMaintenances = (params = {}) =>
  axios.get(API, { params, timeout: OWNER_MAINTENANCE_TIMEOUT_MS });

// Get maintenance detail
export const ownerGetMaintenanceDetail = (id) =>
  axios.get(`${API}/${id}`, { timeout: OWNER_MAINTENANCE_TIMEOUT_MS });

// Request new maintenance
export const ownerCreateMaintenance = (payload) =>
  axios.post(API, payload, { timeout: OWNER_MAINTENANCE_TIMEOUT_MS });

// Cancel maintenance request
export const ownerCancelMaintenance = (id) =>
  axios.delete(`${API}/${id}`, { timeout: OWNER_MAINTENANCE_TIMEOUT_MS });
