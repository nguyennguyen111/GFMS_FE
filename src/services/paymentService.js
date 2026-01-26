import api from "../setup/axios";

/**
 * Tạo thanh toán PayOS cho gói tập
 * @param {number} packageId
 */
export const createPayosPayment = (packageId) => {
  return api.post("/api/payment/payos/create", { packageId });
};

export const confirmPayosPayment = (orderCode) => {
  return api.get(`/api/payment/payos/confirm?orderCode=${encodeURIComponent(orderCode)}`);
};

export default {
  createPayosPayment,
  confirmPayosPayment,
};
