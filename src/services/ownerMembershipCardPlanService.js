import axios from "../setup/axios";

const API_PREFIX = "/api/owner/membership-card-plans";

export const ownerGetMembershipCardPlans = () => axios.get(API_PREFIX);
export const ownerGetMembershipCardPlansByGym = (gymId) =>
  axios.get(API_PREFIX, { params: gymId ? { gymId } : {} });
export const ownerCreateMembershipCardPlan = (payload) => axios.post(API_PREFIX, payload);
export const ownerUpdateMembershipCardPlan = (id, payload) => axios.put(`${API_PREFIX}/${id}`, payload);
export const ownerToggleMembershipCardPlan = (id) => axios.patch(`${API_PREFIX}/${id}/toggle`);
