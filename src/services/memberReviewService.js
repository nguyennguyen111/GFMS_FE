import axios from "../setup/axios";

const API_PREFIX = "/api/member/reviews";

// API mới
export const getEligibleReviewTargets = async () => {
  const res = await axios.get(`${API_PREFIX}/eligible`);
  return res.data?.data || { trainer: [], package: [], gym: [], courses: [] };
};

export const getMyReviews = async () => {
  const res = await axios.get(`${API_PREFIX}/me`);
  return res.data?.data || [];
};

export const createReview = async (payload) => {
  const res = await axios.post(API_PREFIX, payload);
  return res.data?.data;
};

// Alias tương thích FE/dev cũ
export const memberGetEligibleReviewCourses = () =>
  axios.get(`${API_PREFIX}/eligible-courses`);

export const memberGetMyReviews = () =>
  axios.get(API_PREFIX);

export const memberCreateReview = ({ activationId, rating, comment }) =>
  axios.post(API_PREFIX, { activationId, rating, comment });