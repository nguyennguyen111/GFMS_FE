import axios from "../setup/axios";

const API_PREFIX = "/api/member/membership-cards";

export const memberGetMembershipCardPlans = (params) =>
  axios.get(`${API_PREFIX}/plans`, { params: params || {} });

export const memberGetCurrentMembershipCard = (params) =>
  axios.get(`${API_PREFIX}/me`, { params: params || {} });

export const memberPurchaseMembershipCard = (payload) =>
  axios.post(`${API_PREFIX}/purchase`, payload || {});
