import axios from "../setup/axios";

const API_PREFIX = "/api/member/bookings";

export const memberGetTrainers = (date) =>
  axios.get(`${API_PREFIX}/trainers`, { params: date ? { date } : {} });

export const memberGetSlots = ({ trainerId, date }) =>
  axios.get(`${API_PREFIX}/slots`, { params: { trainerId, date } });

export const memberCreateBooking = (payload) => axios.post(API_PREFIX, payload);

export const memberGetMyBookings = () => axios.get(API_PREFIX);

export const memberCancelBooking = (id, payload) =>
  axios.patch(`${API_PREFIX}/${id}/cancel`, payload);

export const memberCheckinBooking = (id, payload) =>
  axios.post(`${API_PREFIX}/${id}/checkin`, payload);

export const memberCheckoutBooking = (id) =>
  axios.post(`${API_PREFIX}/${id}/checkout`);
