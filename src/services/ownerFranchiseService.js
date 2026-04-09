import axios from "../setup/axios";

// Lấy danh sách franchise requests của owner
export const ownerGetMyFranchiseRequests = (params = {}) => 
  axios.get("/api/owner/franchise-requests", { params });

// Lấy chi tiết một franchise request
export const ownerGetFranchiseRequestDetail = (id) => 
  axios.get(`/api/owner/franchise-requests/${id}`);

// Tạo franchise request mới
export const ownerCreateFranchiseRequest = (data) => 
  axios.post("/api/owner/franchise-requests", data);

// Cập nhật franchise request (chỉ khi pending)
export const ownerUpdateFranchiseRequest = (id, data) => 
  axios.put(`/api/owner/franchise-requests/${id}`, data);

// Xóa franchise request (chỉ khi pending)
export const ownerDeleteFranchiseRequest = (id) =>
  axios.delete(`/api/owner/franchise-requests/${id}`);

/** Tải PDF hợp đồng nhượng quyền (JWT owner) — cùng loại file với menu admin */
export const ownerDownloadFranchiseContractPdf = (id, type = "final") =>
  axios.get(`/api/owner/franchise-requests/${id}/contract/document`, {
    params: { type },
    responseType: "blob",
  });
