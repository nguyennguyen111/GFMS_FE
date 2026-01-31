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
};

export default ownerBookingService;
