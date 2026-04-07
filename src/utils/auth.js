const USER_KEY = "user";
const TOKEN_KEY = "accessToken";
const EXTRA_AUTH_KEYS = ["role", "username", "roles"];

function emitAuthChanged() {
  window.dispatchEvent(new Event("authChanged"));
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);

    if (!raw || !token) return null;

    const user = JSON.parse(raw);
    if (!user || typeof user !== "object") return null;

    return user;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function isLoggedIn() {
  return !!getCurrentUser() && !!getAccessToken();
}

export function setCurrentUser(user) {
  if (!user || typeof user !== "object") return;

  localStorage.setItem(USER_KEY, JSON.stringify(user));

  if (user.username) {
    localStorage.setItem("username", user.username);
  } else {
    localStorage.removeItem("username");
  }

  if (user.role) {
    localStorage.setItem("role", user.role);
  } else if (user.groupId === 4) {
    localStorage.setItem("role", "member");
  } else {
    localStorage.removeItem("role");
  }

  emitAuthChanged();
}

export function setAccessToken(token) {
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  emitAuthChanged();
}

export function clearCurrentUser() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  EXTRA_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));

  if (window.axios?.defaults?.headers?.common) {
    delete window.axios.defaults.headers.common.Authorization;
  }

  emitAuthChanged();
}

export function logout() {
  clearCurrentUser();
}