import axios from "../setup/axios";

// Owner policy endpoints
const API = "/api/owner/policies";

export const ownerListTrainerSharePolicies = (params = {}) =>
  axios.get(`${API}/trainer-share`, { params });

export const ownerGetEffectiveTrainerSharePolicy = (gymId) =>
  axios.get(`${API}/trainer-share/effective`, { params: { gymId } });

export const ownerCreateTrainerSharePolicy = (payload) =>
  axios.post(`${API}/trainer-share`, payload);

export const ownerGetPolicyById = (id) => axios.get(`${API}/${id}`);

export const ownerUpdatePolicy = (id, payload) => axios.put(`${API}/${id}`, payload);

export const ownerTogglePolicy = (id) => axios.patch(`${API}/${id}/toggle`);

export const ownerDeletePolicy = (id) => axios.delete(`${API}/${id}`);
