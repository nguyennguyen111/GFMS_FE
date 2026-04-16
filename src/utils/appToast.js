export function showAppToast({ type = "info", message = "", title = "" }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("app:toast", { detail: { id: `${Date.now()}_${Math.random().toString(36).slice(2,8)}`, type, title, message } }));
}
