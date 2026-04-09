import axios from "../setup/axios";

/**
 * Gốc API cho URL PDF (iframe / mở tab).
 * CRA prepareProxy KHÔNG proxy GET có Accept chứa text/html (điều iframe luôn gửi) → /api/... trả index.html.
 * Axios vẫn qua proxy vì Accept là application/json. Vì vậy PDF phải trỏ thẳng BE (cùng hostname với tab).
 */
function resolveDocumentApiOrigin() {
  const fromAxios = String(axios.defaults?.baseURL ?? "").replace(/\/+$/, "");
  if (fromAxios) return fromAxios;

  if (process.env.NODE_ENV === "development" && typeof window !== "undefined" && window.location?.hostname) {
    const h = window.location.hostname;
    return `http://${h}:8080`;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return String(window.location.origin).replace(/\/+$/, "");
  }

  return "http://localhost:8080";
}

export const publicFranchiseContractApi = {
  getByToken: (token) => axios.get("/api/public/franchise-contract/by-token", { params: { token } }),

  // { signerName, signatureDataUrl }
  sign: (token, payload) => axios.post("/api/public/franchise-contract/sign", { token, ...(payload || {}) }),

  // document viewer (PDF) for iframe / open new tab
  // opts: { mode?: 'redirect' | 'proxy' }
  documentUrl: (token, type = "original", opts = {}) => {
    const qs = new URLSearchParams({
      token: String(token || ""),
      type: String(type || "original"),
    });
    if (opts?.mode) qs.set("mode", String(opts.mode));
    const path = `/api/public/franchise-contract/document?${qs.toString()}`;
    return `${resolveDocumentApiOrigin()}${path}`;
  },
};
