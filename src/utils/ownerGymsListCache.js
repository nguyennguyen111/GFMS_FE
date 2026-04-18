import { ownerGetMyGyms } from "../services/ownerGymService";

let cache = { data: null, at: 0 };
let inflight = null;

/** TTL ngắn — đủ để đi qua lại giữa các trang owner mà không gọi API trùng liên tục */
const TTL_MS = 45_000;

export function invalidateOwnerGymsListCache() {
  cache = { data: null, at: 0 };
}

/**
 * Gộp request đồng thời + cache — các trang Phòng tập / Gói / Hội viên hay gọi cùng một API.
 */
export async function getOwnerGymsListCached() {
  const now = Date.now();
  if (Array.isArray(cache.data) && now - cache.at < TTL_MS) {
    return cache.data;
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const response = await ownerGetMyGyms();
      const data = Array.isArray(response.data?.data) ? response.data.data : [];
      cache = { data, at: Date.now() };
      return data;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
