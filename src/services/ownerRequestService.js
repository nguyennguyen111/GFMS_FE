// services/ownerRequestService.js
import axios from "../setup/axios";  // Đảm bảo đã setup axios

const BASE = "/api/owner/requests";

// Lấy danh sách yêu cầu PT
export const getRequests = async (params = {}) => {
  try {
    const res = await axios.get(`${BASE}`, { params });
    const data = Array.isArray(res.data?.data) ? res.data.data : [];
    const pagination = res.data?.pagination || {
      page: Number(params.page) || 1,
      limit: Number(params.limit) || 10,
      total: data.length,
      totalPages: 1,
    };
    return { data, pagination };
  } catch (error) {
    console.error("Error fetching requests:", error);
    throw error;
  }
};

// Duyệt yêu cầu
export const approveRequest = async (requestId, approveNote, options = {}) => {
  try {
    const response = await axios.patch(
      `${BASE}/${requestId}/approve`, 
      {
        approveNote,
        assignmentMode: options?.assignmentMode,
        selectedTrainerId: options?.selectedTrainerId,
      }
    );
    return response.data;  // Trả về yêu cầu đã duyệt
  } catch (error) {
    throw error;  // Đảm bảo lỗi được ném ra để xử lý ở nơi gọi
  }
};

// Từ chối yêu cầu
export const rejectRequest = async (requestId, rejectNote) => {
  try {
    const response = await axios.patch(
      `${BASE}/${requestId}/reject`,
      { rejectNote }
    );
    return response.data;  // Trả về yêu cầu đã từ chối
  } catch (error) {
    throw error;  // Đảm bảo lỗi được ném ra để xử lý ở nơi gọi
  }
};