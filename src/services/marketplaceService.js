import axios from "../setup/axios";

export const mpGetGyms = () => axios.get("/api/marketplace/gyms");
export const mpGetTrainers = (p) => axios.get("/api/marketplace/trainers", { params: p });
export const mpGetPackages = (p) => axios.get("/api/marketplace/packages", { params: p });

export const mpGetGymDetail = (id) => axios.get(`/api/marketplace/gyms/${id}`);
export const mpGetTrainerDetail = (id) => axios.get(`/api/marketplace/trainers/${id}`);
export const mpGetPackageDetail = (id) => axios.get(`/api/marketplace/packages/${id}`);
export const mpGetSlotsPublic = (p) => axios.get(`/api/marketplace/slots`, { params: p });
