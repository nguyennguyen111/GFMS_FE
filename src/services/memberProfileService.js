import axios from "../setup/axios";

export const memberGetMyProfile = async () => {
  return axios.get("/api/member/profile/me");
};

export const memberUpdateMyProfile = async (payload) => {
  return axios.patch("/api/member/profile/me", payload);
};

export const memberChangeMyPassword = async (payload) => {
  return axios.patch("/api/member/profile/change-password", payload);
};

export const memberCreateBecomeTrainerRequest = async (payload) => {
  return axios.post("/api/member/profile/become-trainer-request", payload);
};

export const memberGetBecomeTrainerRequests = async () => {
  return axios.get("/api/member/profile/become-trainer-requests");
};