import axios from "../setup/axios";

// Lấy danh sách trainer shares của owner
export const ownerGetMyTrainerShares = (params = {}) => 
  axios.get("/api/owner/trainer-shares", { params });

// Lấy chi tiết một trainer share
export const ownerGetTrainerShareDetail = (id) => 
  axios.get(`/api/owner/trainer-shares/${id}`);

// Tạo trainer share request mới
export const ownerCreateTrainerShare = (data) => 
  axios.post("/api/owner/trainer-shares", data);

// Cập nhật trainer share (chỉ khi pending)
export const ownerUpdateTrainerShare = (id, data) => 
  axios.put(`/api/owner/trainer-shares/${id}`, data);

// Xóa trainer share (chỉ khi pending)
export const ownerDeleteTrainerShare = (id) => 
  axios.delete(`/api/owner/trainer-shares/${id}`);
