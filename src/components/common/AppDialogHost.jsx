import React, { useEffect, useState } from "react";
import "./AppDialogHost.css";

const INITIAL = {
  open: false,
  title: "",
  message: "",
  confirmText: "Xác nhận",
  cancelText: "Hủy",
  requireInput: false,
  inputLabel: "",
  inputPlaceholder: "",
  inputDefaultValue: "",
  resolve: null,
};

export default function AppDialogHost() {
  const [dialog, setDialog] = useState(INITIAL);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const onConfirmDialog = (e) => {
      const payload = e?.detail || {};
      setDialog({
        open: true,
        title: String(payload.title || "Xác nhận thao tác"),
        message: String(payload.message || ""),
        confirmText: String(payload.confirmText || "Xác nhận"),
        cancelText: String(payload.cancelText || "Hủy"),
        requireInput: Boolean(payload.requireInput),
        inputLabel: String(payload.inputLabel || ""),
        inputPlaceholder: String(payload.inputPlaceholder || ""),
        inputDefaultValue: String(payload.inputDefaultValue || ""),
        resolve: typeof payload.resolve === "function" ? payload.resolve : null,
      });
      setInputValue(String(payload.inputDefaultValue || ""));
    };
    window.addEventListener("app:dialog:confirm", onConfirmDialog);
    return () => window.removeEventListener("app:dialog:confirm", onConfirmDialog);
  }, []);

  const closeWith = (confirmed) => {
    const resolver = dialog.resolve;
    const value = inputValue;
    setDialog(INITIAL);
    setInputValue("");
    if (typeof resolver === "function") {
      resolver({ confirmed, value });
    }
  };

  if (!dialog.open) return null;

  return (
    <div className="app-dialog-overlay" onClick={() => closeWith(false)}>
      <div className="app-dialog-card" onClick={(e) => e.stopPropagation()}>
        <div className="app-dialog-header">
          <h2 className="app-dialog-title">{dialog.title}</h2>
          <button type="button" className="app-dialog-close" onClick={() => closeWith(false)}>
            ×
          </button>
        </div>
        <div className="app-dialog-body">
          <div className="app-dialog-message">{dialog.message}</div>
        </div>
        {dialog.requireInput ? (
          <div className="app-dialog-input-wrap">
            {dialog.inputLabel ? <label className="app-dialog-input-label">{dialog.inputLabel}</label> : null}
            <input
              className="app-dialog-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={dialog.inputPlaceholder}
            />
          </div>
        ) : null}
        <div className="app-dialog-actions">
          <button type="button" className="app-dialog-btn ghost" onClick={() => closeWith(false)}>
            {dialog.cancelText}
          </button>
          <button type="button" className="app-dialog-btn primary" onClick={() => closeWith(true)}>
            {dialog.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

