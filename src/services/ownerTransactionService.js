import axios from "../setup/axios";

const API_URL = "/api/owner/transactions";

const ownerTransactionService = {
  async getMyTransactions(params = {}) {
    const response = await axios.get(API_URL, { params });
    return response.data;
  },
};

export default ownerTransactionService;
