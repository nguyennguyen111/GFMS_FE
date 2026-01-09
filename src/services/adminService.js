import axios from "../setup/axios";

const API_PREFIX = "/api";

const getUsers = ({
  page = 1,
  limit = 10,
  search = "",
  sortBy = "createdAt",
  sortOrder = "desc",
  status = "active" // ✅ default active
}) => {
  return axios.get(`${API_PREFIX}/users`, {
    params: { page, limit, search, sortBy, sortOrder, status }
  });
};

const createUser = (payload) => axios.post(`${API_PREFIX}/users`, payload);

const updateUser = (id, payload) => axios.put(`${API_PREFIX}/users/${id}`, payload);

// FE vẫn gọi deleteUser nhưng BE là soft delete
const deleteUser = (id) => axios.delete(`${API_PREFIX}/users/${id}`);

const getGroups = () => axios.get(`${API_PREFIX}/groups`);

// ===== GYM =====
const getGyms = () => axios.get(`${API_PREFIX}/gym`);
// fallback: nếu BE chưa có /detail thì dùng GET /:id
const getGymDetail = async (id) => {
  try {
    return await axios.get(`${API_PREFIX}/gym/${id}/detail`);
  } catch (e) {
    if (e?.response?.status === 404) {
      return await axios.get(`${API_PREFIX}/gym/${id}`);
    }
    throw e;
  }
};
const createGym = (payload) => axios.post(`${API_PREFIX}/gym`, payload);
const updateGym = (id, payload) => axios.put(`${API_PREFIX}/gym/${id}`, payload);
const suspendGym = (id) => axios.put(`${API_PREFIX}/gym/${id}/suspend`);
const restoreGym = (id) => axios.put(`${API_PREFIX}/gym/${id}/restore`);
const deleteGymApi = (id) => axios.delete(`${API_PREFIX}/gym/${id}`);

// Upload ảnh gym (multipart)
const uploadGymImage = (formData) => {
  return axios.post(`${API_PREFIX}/upload/gym-image`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
};

export {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getGroups,
  getGyms,
  getGymDetail,
  createGym,
  updateGym,
  suspendGym,
  restoreGym,
  deleteGymApi,
  uploadGymImage
};
