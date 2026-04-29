import axios from "../setup/axios";

const API_URL = "/api/owner/commissions";

export const ownerGetCommissions = (params = {}) =>
  axios.get(API_URL, { params });

export const ownerGetPendingAttendanceWindow = (params = {}) =>
  axios.get(`${API_URL}/pending-attendance-window`, { params });

export const ownerRemindPendingAttendance = (bookingId) =>
  axios.post(`${API_URL}/${bookingId}/remind-attendance`);

export const ownerExportCommissions = (params = {}) =>
  axios.get(`${API_URL}/export`, { params, responseType: "blob" });

export const ownerPreviewClosePayrollPeriod = (params = {}) =>
  axios.get(`${API_URL}/preview-close-period`, { params });

export const ownerPreviewPayByTrainer = (params = {}) =>
  axios.get(`${API_URL}/preview-pay-by-trainer`, { params });

export const ownerClosePayrollPeriod = (payload) =>
  axios.post(`${API_URL}/close-period`, payload);

export const ownerGetPayrollPeriods = (params = {}) =>
  axios.get(`${API_URL}/payroll-periods`, { params });

export const ownerPayPayrollPeriod = (id) =>
  axios.post(`${API_URL}/payroll-periods/${id}/pay`);

export const ownerPayByTrainer = (payload) =>
  axios.post(`${API_URL}/pay-by-trainer`, payload);

export const ownerGetGymCommissionRate = (gymId) =>
  axios.get(`${API_URL}/gym/${gymId}/rate`);

export const ownerSetGymCommissionRate = (payload) =>
  axios.post(`${API_URL}/gym/rate`, payload);
