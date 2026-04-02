import axios from "../setup/axios";

const API_PREFIX = "/api/member/reviews";

export const memberGetEligibleReviewCourses = () =>
  axios.get(`${API_PREFIX}/eligible-courses`);

export const memberGetMyReviews = () =>
  axios.get(API_PREFIX);

export const memberCreateReview = ({ activationId, rating, comment }) =>
  axios.post(API_PREFIX, { activationId, rating, comment });
