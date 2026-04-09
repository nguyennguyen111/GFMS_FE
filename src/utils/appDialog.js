export function showAppConfirm({
  title = "Xác nhận thao tác",
  message = "",
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  requireInput = false,
  inputLabel = "",
  inputPlaceholder = "",
  inputDefaultValue = "",
} = {}) {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ confirmed: false, value: "" });
      return;
    }
    window.dispatchEvent(
      new CustomEvent("app:dialog:confirm", {
        detail: {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          title,
          message,
          confirmText,
          cancelText,
          requireInput,
          inputLabel,
          inputPlaceholder,
          inputDefaultValue,
          resolve,
        },
      })
    );
  });
}

