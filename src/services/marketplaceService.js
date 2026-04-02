import axios from "../setup/axios";

export const mpGetGyms = () => axios.get("/api/marketplace/gyms");

export const mpGetTrainers = (params) =>
  axios.get("/api/marketplace/trainers", { params });

export const mpGetPackages = (params) =>
  axios.get("/api/marketplace/packages", { params });

export const mpGetGymDetail = (id) =>
  axios.get(`/api/marketplace/gyms/${id}`);

export const mpGetTrainerDetail = (id) =>
  axios.get(`/api/marketplace/trainers/${id}`);

export const mpGetPackageDetail = (id) =>
  axios.get(`/api/marketplace/packages/${id}`);

/**
 * Public slots for booking wizard step 3
 * params:
 * - trainerId
 * - packageId
 * - pattern: "1,3,5" | "2,4,6"
 */
export const mpGetSlotsPublic = (params) =>
  axios.get("/api/marketplace/slots", { params });