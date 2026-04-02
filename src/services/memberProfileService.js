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