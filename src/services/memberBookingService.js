// src/services/memberBookingService.js
import axios from "../setup/axios";

const API_PREFIX = "/api/member/bookings";

export const memberGetTrainers = (params) =>
  axios.get(`${API_PREFIX}/trainers`, { params });

export const memberGetSlots = ({ trainerId, date, activationId }) =>
  axios.get(`${API_PREFIX}/slots`, { params: { trainerId, date, activationId } });

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

export const memberAssignTrainer = ({ activationId, trainerId }) =>
  axios.post(`/api/member/my-packages/${activationId}/assign-trainer`, { trainerId });

/**
 * ✅ auto-book 4/8/12
 * Bắt buộc gửi trainerId để backend không "guess" trainer => tránh trộn lịch
 */
export const memberAutoBookWeeks = ({ activationId, startDate, pattern, repeatWeeks, trainerId }) =>
  axios.post(`/api/member/my-packages/${activationId}/week-pattern`, {
    startDate,
    trainerId,
    pattern,
    repeatWeeks: Number(repeatWeeks),
    startFromNextWeek: false,
  });

export const memberGetMyPackageDetail = (activationId) =>
  axios.get(`/api/member/my-packages/${activationId}`);