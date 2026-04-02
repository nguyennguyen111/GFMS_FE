import axios from "../setup/axios";

const API_URL = "/api/owner/bookings";

const ownerBookingService = {
  async getMyBookings(params = {}) {
    const response = await axios.get(API_URL, { params });
    return response.data;
  },

  async getBookingDetail(id) {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  async createBooking(data) {
    const response = await axios.post(API_URL, data);
    return response.data;
  },

  async updateBooking(id, data) {
    const response = await axios.put(`${API_URL}/${id}`, data);
    return response.data;
  },

  async cancelBooking(id) {
    const response = await axios.patch(`${API_URL}/${id}/cancel`);
    return response.data;
  },

  async updateBookingStatus(id, status) {
    const response = await axios.patch(`${API_URL}/${id}/status`, { status });
    return response.data;
  },

  async getTrainerSchedule(trainerId, date, params = {}) {
    const response = await axios.get(`${API_URL}/trainer/${trainerId}/schedule`, {
      params: { date, ...params },
    });
    return response.data;
  },
};

export default ownerBookingService;
