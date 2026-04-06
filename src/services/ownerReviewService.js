import axios from "../setup/axios";

const API_URL = "/api/owner/reviews";

export const ownerGetReviews = async (params = {}) => {
  const res = await axios.get(API_URL, { params });
  return {
    data: Array.isArray(res.data?.data) ? res.data.data : [],
    pagination: res.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
  };
};
