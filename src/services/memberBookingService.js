import axios from "../setup/axios";

const API_PREFIX = "/api/member/bookings";

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

export const memberAssignTrainer = ({ activationId, trainerId }) =>
  axios.post(`/api/member/my-packages/${activationId}/assign-trainer`, {
    trainerId,
  });

export const memberAutoBookWeeks = ({
  activationId,
  startDate,
  pattern,
  repeatWeeks,
  trainerId,
  startTime,
}) =>
  axios.post(`/api/member/bookings/week-pattern`, {
    activationId,
    startDate,
    trainerId,
    startTime,
    pattern,
    repeatWeeks: Number(repeatWeeks),
  });

export const memberGetMyPackageDetail = (activationId) =>
  axios.get(`/api/member/my-packages/${activationId}`);

/* ===== NEW FLOW ===== */

export const memberGetFixedPlanOptions = ({
  packageId,
  trainerId,
  pattern,
  startDate,
}) =>
  axios.post(`${API_PREFIX}/fixed-plan/options`, {
    packageId,
    trainerId,
    pattern,
    startDate,
  });

export const memberConfirmFixedPlan = ({
  packageId,
  trainerId,
  pattern,
  startDate,
  startTime,
  paymentMethod,
  confirmDuplicate,
  membershipCardPlanId,
}) =>
  axios.post(`${API_PREFIX}/fixed-plan/confirm`, {
    packageId,
    trainerId,
    pattern,
    startDate,
    startTime,
    paymentMethod,
    confirmDuplicate: !!confirmDuplicate,
    membershipCardPlanId: Number(membershipCardPlanId || 0),
  });

export const memberGetRescheduleOptions = (id, params) =>
  axios.get(`${API_PREFIX}/${id}/reschedule-options`, { params: params || {} });

export const memberCreateRescheduleRequest = (id, payload) =>
  axios.post(`${API_PREFIX}/${id}/reschedule-request`, payload || {});

export const memberGetMyRescheduleRequests = () =>
  axios.get(`${API_PREFIX}/reschedule-requests`);
