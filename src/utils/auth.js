import { clearAuthSession, getAccessToken, getSessionUser, setAuthSession } from "../services/authSession";

export function getCurrentUser() {
  const user = getSessionUser();
  const token = getAccessToken();
  if (!user || !token) return null;
  return user;
}

export function logout() {
  clearAuthSession();
}

export function setCurrentUser(user) {
  if (!user) return;
  setAuthSession({ token: getAccessToken(), user });
}

export function clearCurrentUser() {
  clearAuthSession();
}
