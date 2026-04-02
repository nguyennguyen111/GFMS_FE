import axios from "../setup/axios";

// Lấy danh sách trainer shares của owner
export const ownerGetMyTrainerShares = (params = {}) => 
  axios.get("/api/owner/trainer-shares", { params });

// Lấy danh sách yêu cầu chia sẻ nhận được (Owner B)
export const ownerGetReceivedTrainerShares = (params = {}) => 
  axios.get("/api/owner/trainer-shares/received", { params });

// Chấp nhận yêu cầu chia sẻ (Owner B)
export const ownerAcceptTrainerShare = (id) => 
  axios.post(`/api/owner/trainer-shares/${id}/accept`);

// Từ chối yêu cầu chia sẻ (Owner B)
export const ownerRejectTrainerShare = (id, reason) => 
  axios.post(`/api/owner/trainer-shares/${id}/reject`, { reason });

// Lấy chi tiết một trainer share
export const ownerGetTrainerShareDetail = (id) => 
  axios.get(`/api/owner/trainer-shares/${id}`);

// Tạo trainer share request mới
export const ownerCreateTrainerShare = (data) => 
  axios.post("/api/owner/trainer-shares", data);

// Cập nhật trainer share (chỉ khi waiting_acceptance)
export const ownerUpdateTrainerShare = (id, data) => 
  axios.put(`/api/owner/trainer-shares/${id}`, data);

// Xóa trainer share (chỉ khi waiting_acceptance)
export const ownerDeleteTrainerShare = (id) => 
  axios.delete(`/api/owner/trainer-shares/${id}`);
