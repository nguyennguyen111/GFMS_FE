import axios from "../setup/axios";

const API_URL = "/api/owner/bookings";
const OWNER_BOOKING_TIMEOUT_MS = 15000;

const ownerBookingService = {
  async getMyBookings(params = {}) {
    const response = await axios.get(API_URL, {
      params,
      timeout: OWNER_BOOKING_TIMEOUT_MS,
    });
    return response.data;
  },

  async getTrainerSchedule(trainerId, date, params = {}) {
    const response = await axios.get(`${API_URL}/trainer/${trainerId}/schedule`, {
      params: { date, ...params },
      timeout: OWNER_BOOKING_TIMEOUT_MS,
    });
    return response.data;
  },

  async getBookingDetail(bookingId) {
    const response = await axios.get(`${API_URL}/${bookingId}`, {
      timeout: OWNER_BOOKING_TIMEOUT_MS,
    });
    return response.data;
  },
};

export default ownerBookingService;
