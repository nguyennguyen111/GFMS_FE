import axios from "../setup/axios";

const API_URL = "/api/owner/members";

const ownerMemberService = {
  async getAvailableUsers() {
    const response = await axios.get(`${API_URL}/available-users`);
    return response.data;
  },

  async createMember(data) {
    const response = await axios.post(API_URL, data);
    return response.data;
  },

  async getMyMembers(params = {}) {
    const response = await axios.get(API_URL, { params });
    return response.data;
  },

  async getMemberDetail(id) {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  async updateMember(id, data) {
    const response = await axios.put(`${API_URL}/${id}`, data);
    return response.data;
  },

  async deleteMember(id) {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  },

  async renewMemberPackage(memberId, packageId, trainerId) {
    const payload = { packageId };
    if (trainerId) payload.trainerId = trainerId;
    const response = await axios.post(`${API_URL}/${memberId}/renew-package`, payload);
    return response.data;
  },

  async toggleMemberStatus(id) {
    const response = await axios.patch(`${API_URL}/${id}/toggle-status`);
    return response.data;
  },
};

export default ownerMemberService;
