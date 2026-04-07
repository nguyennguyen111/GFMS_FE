import axios from "../setup/axios";

const API_URL = "/api/owner/bookings";

const ownerBookingService = {
  async getMyBookings(params = {}) {
    const response = await axios.get(API_URL, { params });
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
