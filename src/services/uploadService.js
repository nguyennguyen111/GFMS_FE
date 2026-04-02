import axios from "../setup/axios";

export const uploadGymImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await axios.post("/api/upload/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res?.data || res;
};