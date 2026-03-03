import axios from "../setup/axios";

const API_URL = "/api/owner/dashboard";

const ownerDashboardService = {
  async getSummary(gymId = null) {
    const params = gymId ? { gymId } : {};
    const response = await axios.get(`${API_URL}/summary`, { params });
    return response.data;
  },
};

export default ownerDashboardService;
