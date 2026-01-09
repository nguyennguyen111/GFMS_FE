import axios from "../setup/axios";

const API_PREFIX = "/api/member/packages";

export const memberGetPackages = () => axios.get(API_PREFIX);

export const memberPurchasePackage = (packageId, payload) =>
  axios.post(`${API_PREFIX}/${packageId}/purchase`, payload);

// ✅ NEW: lấy gói đã mua
export const memberGetMyPackages = () => axios.get("/api/member/my-packages");
