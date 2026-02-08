import axios from "../setup/axios";

export const ownerGetMyGyms = () => axios.get("/api/owner/gyms");

export const ownerUpdateGym = (gymId, data) => axios.put(`/api/owner/gyms/${gymId}`, data);

export const ownerGetGymDetail = (gymId) => axios.get(`/api/owner/gyms/${gymId}`);

// Upload ảnh gym (multipart)
export const ownerUploadGymImage = (formData) => {
	return axios.post(`/api/upload/gym-image`, formData, {
		headers: { "Content-Type": "multipart/form-data" },
	});
};
