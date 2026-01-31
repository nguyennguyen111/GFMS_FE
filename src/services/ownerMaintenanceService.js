import axios from "../setup/axios";

const API = "/api/owner/maintenances";

// Get list of maintenances for owner's gyms
export const ownerGetMaintenances = (params = {}) =>
  axios.get(API, { params });

// Get maintenance detail
export const ownerGetMaintenanceDetail = (id) =>
  axios.get(`${API}/${id}`);

// Request new maintenance
export const ownerCreateMaintenance = (payload) =>
  axios.post(API, payload);

// Cancel maintenance request
export const ownerCancelMaintenance = (id) =>
  axios.delete(`${API}/${id}`);
