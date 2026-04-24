import axios from "../setup/axios";

const equipmentAssetService = {
  // Admin
  adminList: (params) => axios.get("/api/admin/inventory/equipment-assets", { params }),
  adminSummary: (params) => axios.get("/api/admin/inventory/equipment-assets/summary", { params }),
  adminDetail: (id) => axios.get(`/api/admin/inventory/equipment-assets/${id}`),
  adminGetQr: (id) => axios.get(`/api/admin/inventory/equipment-assets/${id}/qr`),
  adminRegenerateQr: (id) => axios.post(`/api/admin/inventory/equipment-assets/${id}/regenerate-qr`),

  // Owner
  ownerList: (params) => axios.get("/api/owner/equipment-assets", { params }),
  ownerResolveByToken: (qrToken) => axios.get(`/api/owner/equipment-assets/resolve/${encodeURIComponent(qrToken)}`),
  ownerDetail: (id) => axios.get(`/api/owner/equipment-assets/${id}`),
  ownerGetQr: (id) => axios.get(`/api/owner/equipment-assets/${id}/qr`),
  ownerCreateMaintenance: (id, body) => axios.post(`/api/owner/equipment-assets/${id}/maintenance-requests`, body),

  // Public
  publicScan: (qrToken) => axios.get(`/api/public/equipment-assets/scan/${encodeURIComponent(qrToken)}`),
};

export default equipmentAssetService;

