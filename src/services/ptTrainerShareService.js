import axios from "../setup/axios";

export const ptGetAvailableTrainerShareRequests = (params = {}) =>
  axios.get("/api/trainer/share-requests/available", { params });

export const ptClaimTrainerShareRequest = (id) =>
  axios.post(`/api/trainer/share-requests/${id}/claim`);
