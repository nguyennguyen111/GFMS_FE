// src/services/adminTrainerShareOverrideService.js
import axios from "../setup/axios";

/**
 * Base URL: BE đang mount ở /api/admin/inventory trong adminInventoryApi.js
 * Bạn nhớ axios instance của bạn đã có baseURL "/api" hoặc "" tùy project.
 */

const BASE = "/api/admin/inventory";

/* =========================
 * Trainershare (base policies)
 * ========================= */
export const admListTrainerShares = (params = {}) =>
  axios.get(`${BASE}/trainer-shares`, { params });

export const admListPolicies = (params = {}) =>
  axios.get(`${BASE}/trainer-shares/policies`, { params });

/* =========================
 * Overrides
 * ========================= */
export const admListTrainerShareOverrides = (params = {}) =>
  axios.get(`${BASE}/trainer-share-overrides`, { params });

export const admCreateTrainerShareOverrideRequest = (payload) =>
  axios.post(`${BASE}/trainer-share-overrides`, payload);

export const admUpdateTrainerShareOverrideRequest = (id, payload) =>
  axios.put(`${BASE}/trainer-share-overrides/${id}`, payload);

export const admApproveTrainerShareOverride = (id, payload = {}) =>
  axios.post(`${BASE}/trainer-share-overrides/${id}/approve`, payload);

export const admRevokeTrainerShareOverride = (id, payload = {}) =>
  axios.post(`${BASE}/trainer-share-overrides/${id}/revoke`, payload);

export const admToggleTrainerShareOverride = (id, payload) =>
  axios.patch(`${BASE}/trainer-share-overrides/${id}/toggle`, payload);

export const admGetEffectiveTrainerShareOverride = (params = {}) =>
  axios.get(`${BASE}/trainer-share-overrides/effective`, { params });

export const admResolveTrainerShareConfig = (params = {}) =>
  axios.get(`${BASE}/trainer-share-overrides/resolve`, { params });

export const admListTrainerShareOverrideAudits = (params = {}) =>
  axios.get(`${BASE}/trainer-share-overrides/audits`, { params });

/**
 * NOTE: Enterprise chuẩn thường KHÔNG hard delete override.
 * Nếu BE bạn vẫn có delete, giữ lại hàm này (tùy bạn dùng).
 */
export const admDeleteTrainerShareOverride = (id) =>
  axios.delete(`${BASE}/trainer-share-overrides/${id}`);

export default {
  admListTrainerShares,
  admListPolicies,
  admListTrainerShareOverrides,
  admCreateTrainerShareOverrideRequest,
  admUpdateTrainerShareOverrideRequest,
  admApproveTrainerShareOverride,
  admRevokeTrainerShareOverride,
  admToggleTrainerShareOverride,
  admGetEffectiveTrainerShareOverride,
  admResolveTrainerShareConfig,
  admListTrainerShareOverrideAudits,
  admDeleteTrainerShareOverride,
};
