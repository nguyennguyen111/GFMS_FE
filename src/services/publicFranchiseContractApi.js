import axios from "../setup/axios";

export const publicFranchiseContractApi = {
  getByToken: (token) => axios.get("/api/public/franchise-contract/by-token", { params: { token } }),

  // { signerName, signatureDataUrl }
  sign: (token, payload) => axios.post("/api/public/franchise-contract/sign", { token, ...(payload || {}) }),

  // document viewer (PDF) for iframe / open new tab
  // opts: { mode?: 'redirect' | 'proxy' }
  documentUrl: (token, type = "original", opts = {}) => {
    const base = `${axios.defaults.baseURL || "http://localhost:8080"}/api/public/franchise-contract/document`;
    const qs = new URLSearchParams({
      token: String(token || ""),
      type: String(type || "original"),
    });
    if (opts?.mode) qs.set("mode", String(opts.mode));
    return `${base}?${qs.toString()}`;
  },
};
