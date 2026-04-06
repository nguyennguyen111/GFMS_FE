import axios from "../setup/axios";

const API_PREFIX = "/api/owner/packages";

export const ownerGetPackages = () => axios.get(API_PREFIX);

export const ownerGetPackageSpecializations = (gymId) =>
	axios.get(`${API_PREFIX}/specializations`, { params: { gymId } });

export const ownerGetSpecializationTrainers = (gymId, specialization) =>
	axios.get(`${API_PREFIX}/trainers`, { params: { gymId, specialization } });

export const ownerCreatePackage = (payload) => axios.post(API_PREFIX, payload);

export const ownerUpdatePackage = (id, payload) => axios.put(`${API_PREFIX}/${id}`, payload);

export const ownerTogglePackage = (id) => axios.patch(`${API_PREFIX}/${id}/toggle`);
