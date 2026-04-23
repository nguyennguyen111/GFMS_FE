import axios from "../setup/axios";

const PT_SHARE_TIMEOUT_MS = 20000;

export const ptGetAvailableTrainerShareRequests = (params = {}) =>
  axios.get("/api/trainer/share-requests/available", { params, timeout: PT_SHARE_TIMEOUT_MS });

export const ptClaimTrainerShareRequest = (id) =>
  axios.post(`/api/trainer/share-requests/${id}/claim`, {}, { timeout: PT_SHARE_TIMEOUT_MS });
