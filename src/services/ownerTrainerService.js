import axios from "../setup/axios";

const API_URL = "/api/owner/trainers";

const ownerTrainerService = {
  async getMyTrainers(params = {}) {
    const response = await axios.get(API_URL, { params });
    return response.data;
  },

  async getUsersWithoutPTRole(params = {}) {
    const response = await axios.get(`${API_URL}/users-without-pt`, { params });
    return response.data;
  },

  async createTrainer(data) {
    const response = await axios.post(API_URL, data);
    return response.data;
  },

  async updateTrainer(id, data) {
    const response = await axios.put(`${API_URL}/${id}`, data);
    return response.data;
  },

  async deleteTrainer(id) {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  },

  async getTrainerSchedule(id, params = {}) {
    const response = await axios.get(`${API_URL}/${id}/schedule`, { params });
    return response.data;
  },
};

export default ownerTrainerService;
