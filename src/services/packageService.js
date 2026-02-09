import axios from "../setup/axios";

export const getPackageDetail = (id) =>
  axios.get(`/api/marketplace/packages/${id}`);

export const purchasePackage = (packageId) =>
  axios.post(`/api/member/packages/purchase`, { packageId });
