// src/utils/image.js

const ABSOLUTE_URL_REGEX = /^(https?:)?\/\//i;
const DATA_URL_REGEX = /^data:/i;

export const BACKEND_ORIGIN =
  process.env.REACT_APP_API_ORIGIN ||
  process.env.REACT_APP_BACKEND_URL ||
  "http://localhost:8080";

export function isAbsoluteImageUrl(value) {
  const s = String(value || "").trim();
  return ABSOLUTE_URL_REGEX.test(s) || DATA_URL_REGEX.test(s);
}

function stripWrappingQuotes(value) {
  let s = String(value || "").trim();

  while (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith("`") && s.endsWith("`"))
  ) {
    s = s.slice(1, -1).trim();
  }

  return s;
}

function stripBrokenArraySyntax(value) {
  let s = String(value || "").trim();

  // bóc kiểu ["..."] hoặc "..."] hoặc ["..."
  s = s.replace(/^\[\s*/, "").replace(/\s*\]$/, "").trim();
  s = stripWrappingQuotes(s);

  return s;
}

function extractCandidateFromObject(obj) {
  if (!obj || typeof obj !== "object") return "";
  return (
    obj.url ||
    obj.image ||
    obj.imageUrl ||
    obj.src ||
    obj.path ||
    obj.avatar ||
    obj.thumbnail ||
    obj.cover ||
    ""
  );
}

export function normalizeSingleImageSrc(src, options = {}) {
  const { backendOrigin = BACKEND_ORIGIN } = options;

  if (!src) return "";

  if (typeof src === "object") {
    return normalizeSingleImageSrc(extractCandidateFromObject(src), options);
  }

  let raw = String(src).trim();
  if (!raw) return "";

  raw = stripWrappingQuotes(raw);

  // nếu là JSON string của array/object/string
  if (
    (raw.startsWith("[") && raw.endsWith("]")) ||
    (raw.startsWith("{") && raw.endsWith("}"))
  ) {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return normalizeSingleImageSrc(parsed[0], options);
      }

      if (typeof parsed === "object" && parsed) {
        return normalizeSingleImageSrc(extractCandidateFromObject(parsed), options);
      }

      if (typeof parsed === "string") {
        return normalizeSingleImageSrc(parsed, options);
      }
    } catch {
      // rơi xuống xử lý string bể format
    }
  }

  // xử lý string array bị lỗi format kiểu: "\"https://...jpg\"]"
  raw = stripBrokenArraySyntax(raw);

  // sau khi bóc, nếu là URL tuyệt đối thì trả luôn
  if (isAbsoluteImageUrl(raw)) return raw;

  // asset public frontend
  if (
    raw.startsWith("/") &&
    !raw.startsWith("/uploads") &&
    !raw.startsWith("/images") &&
    !raw.startsWith("/storage")
  ) {
    return raw;
  }

  // path backend
  const cleanBase = String(backendOrigin || "").replace(/\/+$/, "");
  const cleanPath = raw.replace(/^\/+/, "");

  return cleanPath ? `${cleanBase}/${cleanPath}` : "";
}

export function normalizeImageList(images, options = {}) {
  if (!images) return [];

  if (Array.isArray(images)) {
    return images
      .flatMap((item) => (Array.isArray(item) ? item : [item]))
      .map((item) => normalizeSingleImageSrc(item, options))
      .filter(Boolean);
  }

  if (typeof images === "object") {
    const candidate = extractCandidateFromObject(images);
    const one = normalizeSingleImageSrc(candidate, options);
    return one ? [one] : [];
  }

  if (typeof images === "string") {
    let raw = images.trim();
    if (!raw) return [];

    // parse JSON chuẩn trước
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => normalizeSingleImageSrc(item, options))
          .filter(Boolean);
      }

      if (typeof parsed === "object" && parsed) {
        const one = normalizeSingleImageSrc(extractCandidateFromObject(parsed), options);
        return one ? [one] : [];
      }

      if (typeof parsed === "string") {
        const one = normalizeSingleImageSrc(parsed, options);
        return one ? [one] : [];
      }
    } catch {
      // không parse được thì xử lý string lỗi format
    }

    raw = stripBrokenArraySyntax(raw);
    const one = normalizeSingleImageSrc(raw, options);
    return one ? [one] : [];
  }

  return [];
}

export function getFirstImage(images, fallback = "", options = {}) {
  return normalizeImageList(images, options)[0] || fallback;
}