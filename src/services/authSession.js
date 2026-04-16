const SAFE_KEYS = {
  user: "user",
  roles: "roles",
  role: "role",
  username: "username",
  rememberedEmail: "rememberedEmail",
  authProvider: "authProvider",
};

const SESSION_KEYS = {
  accessToken: "accessToken",
};

let accessToken = null;
let currentUser = null;

const safeParse = (raw) => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const notifyAuthChanged = () => {
  window.dispatchEvent(new Event("authChanged"));
};

const persistSafeUserData = ({ user, roles, role }) => {
  if (user) {
    localStorage.setItem(SAFE_KEYS.user, JSON.stringify(user));
    localStorage.setItem(SAFE_KEYS.username, user?.displayName || user?.username || user?.email || "Tài khoản");
  }
  if (roles) {
    localStorage.setItem(SAFE_KEYS.roles, JSON.stringify(roles));
  }
  if (role) {
    localStorage.setItem(SAFE_KEYS.role, role);
  }
};

const clearPersistedAuthData = () => {
  localStorage.removeItem(SAFE_KEYS.user);
  localStorage.removeItem(SAFE_KEYS.roles);
  localStorage.removeItem(SAFE_KEYS.role);
  localStorage.removeItem(SAFE_KEYS.username);
  localStorage.removeItem(SAFE_KEYS.authProvider);
};

export const hydrateAuthSessionFromStorage = () => {
  currentUser = safeParse(localStorage.getItem(SAFE_KEYS.user));
  accessToken = sessionStorage.getItem(SESSION_KEYS.accessToken) || localStorage.getItem(SESSION_KEYS.accessToken) || null;
  if (accessToken) {
    sessionStorage.setItem(SESSION_KEYS.accessToken, accessToken);
    localStorage.removeItem(SESSION_KEYS.accessToken);
  }
};

export const getAccessToken = () => accessToken;
export const getSessionUser = () => currentUser;

export const setAuthSession = ({ token, user, roles, role }) => {
  accessToken = token || null;
  currentUser = user || null;
  if (accessToken) {
    sessionStorage.setItem(SESSION_KEYS.accessToken, accessToken);
  } else {
    sessionStorage.removeItem(SESSION_KEYS.accessToken);
  }
  persistSafeUserData({ user, roles, role });
  notifyAuthChanged();
};

export const clearAuthSession = () => {
  accessToken = null;
  currentUser = null;
  sessionStorage.removeItem(SESSION_KEYS.accessToken);
  clearPersistedAuthData();
  notifyAuthChanged();
};

export const setRememberedEmail = (email) => {
  const trimmed = String(email || "").trim();
  if (!trimmed) {
    localStorage.removeItem(SAFE_KEYS.rememberedEmail);
    return;
  }
  localStorage.setItem(SAFE_KEYS.rememberedEmail, trimmed);
};

export const getRememberedEmail = () => localStorage.getItem(SAFE_KEYS.rememberedEmail) || "";

export const setAuthProvider = (provider) => {
  const value = String(provider || '').trim();
  if (!value) {
    localStorage.removeItem(SAFE_KEYS.authProvider);
    return;
  }
  localStorage.setItem(SAFE_KEYS.authProvider, value);
};

export const getAuthProvider = () => localStorage.getItem(SAFE_KEYS.authProvider) || "local";
