import axios from "../setup/axios";

const API = "/api/owner/inventory";

export const ownerGetInventory = (params = {}) =>
  axios.get(API, { params });

export const ownerGetInventoryDetail = (id) =>
  axios.get(`${API}/${id}`);
