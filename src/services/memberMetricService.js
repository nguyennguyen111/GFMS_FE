// src/services/memberMetricService.js
import axios from "../setup/axios";

export const memberGetMetrics = async () => {
  const res = await axios.get("/api/member/metrics");
  return res.data?.data || [];
};

export const memberGetLatestMetric = async () => {
  const res = await axios.get("/api/member/metrics/latest");
  return res.data?.data || null;
};

export const memberCreateMetric = async (payload) => {
  const res = await axios.post("/api/member/metrics", payload);
  return res.data?.data;
};