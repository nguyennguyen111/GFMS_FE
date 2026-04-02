import axios from "../setup/axios";

const API_URL = "/api/owner/dashboard";

const ownerDashboardService = {
  async getSummary(gymId = null) {
    const params = gymId ? { gymId } : {};
    const response = await axios.get(`${API_URL}/summary`, { params });
    return response.data;
  },

  async getRevenueTrend(period = "day", gymId = null) {
    const params = gymId ? { period, gymId } : { period };
    const response = await axios.get(`${API_URL}/revenue-trend`, { params });
    return response.data;
  },
};

export default ownerDashboardService;
