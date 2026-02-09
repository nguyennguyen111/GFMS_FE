import axios from "../setup/axios";

const API_PREFIX = "/api/member/bookings";

// ✅ truyền gymId/date nếu cần

export const memberGetTrainers = (params) =>
  axios.get(`${API_PREFIX}/trainers`, { params });

export const memberGetSlots = ({ trainerId, date, activationId }) =>
  axios.get(`${API_PREFIX}/slots`, {
    params: { trainerId, date, activationId },
  });

export const memberCreateBooking = (payload) =>
  axios.post(API_PREFIX, payload);

export const memberGetMyBookings = (params) =>
  axios.get(API_PREFIX, { params: params || {} });

export const memberCancelBooking = (id, payload) =>
  axios.patch(`${API_PREFIX}/${id}/cancel`, payload);

export const memberCheckinBooking = (id, payload) =>
  axios.post(`${API_PREFIX}/${id}/checkin`, payload);

export const memberCheckoutBooking = (id) =>
  axios.post(`${API_PREFIX}/${id}/checkout`);
