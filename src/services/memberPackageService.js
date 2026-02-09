import axios from "../setup/axios";

const API_PREFIX = "/api/member/packages";

// ✅ nhận gymId để BE filter theo gym đã chọn
export const memberGetPackages = (params) => axios.get(API_PREFIX, { params: params || {} });

export const memberPurchasePackage = (packageId, payload) =>
  axios.post(`${API_PREFIX}/${packageId}/purchase`, payload);

export const memberGetMyPackages = () =>
  axios.get("/api/member/my-packages");

export const memberGetMyPackageDetail = (activationId) =>
  axios.get(`/api/member/my-packages/${activationId}`);