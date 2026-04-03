import axios from "../setup/axios";

export const getEligibleReviewTargets = async () => {
  const res = await axios.get("/api/member/reviews/eligible");
  return res.data?.data || { trainer: [], package: [], gym: [] };
};

export const getMyReviews = async () => {
  const res = await axios.get("/api/member/reviews/me");
  return res.data?.data || [];
};

export const createReview = async (payload) => {
  const res = await axios.post("/api/member/reviews", payload);
  return res.data?.data;
};
