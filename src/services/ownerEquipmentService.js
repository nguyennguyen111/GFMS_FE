import axios from "../setup/axios";

const API = "/api/owner/equipment";

export const ownerGetEquipments = (params = {}) =>
  axios.get(API, { params });

export const ownerGetEquipmentDetail = (id) =>
  axios.get(`${API}/${id}`);

export const ownerGetCategories = () =>
  axios.get(`${API}/categories`);
