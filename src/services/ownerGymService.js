import axios from "../setup/axios";

export const ownerGetMyGyms = () => axios.get("/api/owner/gyms");
