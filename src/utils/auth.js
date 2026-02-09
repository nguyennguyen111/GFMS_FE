const USER_KEY = "user";
const TOKEN_KEY = "accessToken";

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);

    if (!raw || !token) return null;

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);

  // 🔥 đảm bảo axios không giữ header cũ
  if (window.axios) {
    delete window.axios.defaults.headers.common["Authorization"];
  }

  window.dispatchEvent(new Event("authChanged"));
}

export function setCurrentUser(user) {
  if (!user) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearCurrentUser() {
  localStorage.removeItem(USER_KEY);
}
