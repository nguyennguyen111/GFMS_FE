import axios from "../setup/axios";

export async function uploadChatAsset(file, kind = "file") {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  try {
    const res = await axios.post("/api/upload/chat-asset", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data || {};
  } catch (error) {
    const message = error?.response?.data?.error || error?.response?.data?.message || error?.message || "Upload thất bại";
    throw new Error(message);
  }
}
