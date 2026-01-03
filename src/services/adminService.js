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

export { getUsers, createUser, updateUser, deleteUser, getGroups };
