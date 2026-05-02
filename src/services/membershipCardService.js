import axios from "../setup/axios";

const API_PREFIX = "/api/member/membership-cards";

export const memberGetMembershipCardPlans = (params) =>
  axios.get(`${API_PREFIX}/plans`, { params: params || {} });

export const memberGetCurrentMembershipCard = (params) =>
  axios.get(`${API_PREFIX}/me`, { params: params || {} });

/** Lịch sử thanh toán mua thẻ thành viên (gộp vào lịch sử thanh toán profile). */
export const memberGetMembershipCardPurchaseHistory = () =>
  axios.get(`${API_PREFIX}/history`);

export const memberPurchaseMembershipCard = (payload) =>
  axios.post(`${API_PREFIX}/purchase`, payload || {});
