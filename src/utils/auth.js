import { clearAuthSession, getAccessToken as getSessionAccessToken, getSessionUser, setAuthSession } from "../services/authSession";

const USER_KEY = "user";
const TOKEN_KEY = "accessToken"; // legacy fallback (some flows stored token here)
const EXTRA_AUTH_KEYS = ["role", "username", "roles"];
const CHATBOT_SESSION_PREFIX = "gfms_ai_chat_session_";

function emitAuthChanged() {
  window.dispatchEvent(new Event("authChanged"));
}

const safeParse = (raw) => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function getAccessToken() {
  return getSessionAccessToken() || localStorage.getItem(TOKEN_KEY) || null;
}

export function getCurrentUser() {
  const token = getAccessToken();
  const sessionUser = getSessionUser();
  if (token && sessionUser) return sessionUser;

  const raw = localStorage.getItem(USER_KEY);
  const parsed = safeParse(raw);
  if (!token || !parsed) return null;
  return parsed?.user ?? parsed;
}

export function isLoggedIn() {
  return !!getCurrentUser() && !!getAccessToken();
}

export function setCurrentUser(user) {
  if (!user || typeof user !== "object") return;
  setAuthSession({ token: getAccessToken(), user });
  emitAuthChanged();
}

export function setAccessToken(token) {
  if (!token) return;
  setAuthSession({ token, user: getCurrentUser() });
  emitAuthChanged();
}

export function clearCurrentUser() {
  clearAuthSession();
  localStorage.removeItem(TOKEN_KEY);
  EXTRA_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));

  try {
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (String(key).startsWith(CHATBOT_SESSION_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {}

  if (window.axios?.defaults?.headers?.common) {
    delete window.axios.defaults.headers.common.Authorization;
  }

  emitAuthChanged();
}

export function logout() {
  clearCurrentUser();
}